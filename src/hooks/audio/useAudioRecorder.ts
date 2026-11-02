import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { AudioManager, AudioRecorder } from 'react-native-audio-api';

/** Captures mono PCM using the archive's audio pipeline, stopping the microphone and consumer on blur or unmount. */
export function useAudioRecorder(onStop: () => void, onError: (error: string) => void) {
  const [isRecording, setIsRecording] = useState(false);
  const [starting, setStarting] = useState(false);
  const recorder = useRef<AudioRecorder | null>(null);
  const generation = useRef(0);
  const mounted = useRef(true);
  const callbacks = useRef({ onStop, onError });
  useEffect(() => {
    callbacks.current = { onStop, onError };
  });

  const stopRecording = useCallback(async () => {
    generation.current += 1;
    const current = recorder.current;
    recorder.current = null;
    callbacks.current.onStop();
    if (mounted.current) {
      setIsRecording(false);
      setStarting(false);
    }
    await current?.stop().catch(() => {});
    current?.clearOnAudioReady();
    current?.clearOnError();
  }, []);

  useEffect(() => {
    mounted.current = true;
    AudioManager.setAudioSessionOptions({
      iosCategory: 'playAndRecord',
      iosMode: 'spokenAudio',
      iosOptions: ['allowBluetoothHFP', 'defaultToSpeaker'],
    });
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background') void stopRecording();
    });
    return () => {
      mounted.current = false;
      subscription.remove();
      void stopRecording();
    };
  }, [stopRecording]);

  const startRecording = async (
    sampleRate: number,
    onAudioChunk: (samples: Float32Array) => void,
    bufferLength = 4096
  ) => {
    if (recorder.current) await stopRecording();
    const request = ++generation.current;
    setStarting(true);
    try {
      const permission = await AudioManager.requestRecordingPermissions();
      if (request !== generation.current || !mounted.current) return;
      if (permission !== 'Granted')
        throw new Error('Allow microphone access in Settings to record.');
      const current = new AudioRecorder();
      recorder.current = current;
      current.onAudioReady({ sampleRate, bufferLength, channelCount: 1 }, (event) => {
        if (request !== generation.current) return;
        try {
          onAudioChunk(new Float32Array(event.buffer.getChannelData(0)));
        } catch (cause) {
          callbacks.current.onError(cause instanceof Error ? cause.message : String(cause));
          void stopRecording();
        }
      });
      current.onError((event) => {
        if (request !== generation.current) return;
        callbacks.current.onError(event.message);
        void stopRecording();
      });
      const result = await current.start();
      if (request !== generation.current || !mounted.current) {
        await current.stop();
        return;
      }
      if (result.status === 'error')
        throw new Error(result.message || 'Could not start the microphone.');
      setIsRecording(true);
    } catch (cause) {
      await stopRecording();
      throw cause;
    } finally {
      if (mounted.current && request === generation.current) setStarting(false);
    }
  };
  return { isRecording, starting, startRecording, stopRecording };
}
