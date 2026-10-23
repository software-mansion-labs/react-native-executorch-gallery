import { useCallback, useEffect, useRef, useState } from 'react';
import { AudioManager, AudioRecorder } from 'react-native-audio-api';

/**
 * Controller methods and state for recording microphone audio in real time.
 */
export interface AudioRecorderState {
  /** Whether the microphone is currently actively recording and streaming. */
  isRecording: boolean;
  /**
   * Starts capturing microphone audio and streams Float32 PCM samples to the provided callback.
   * Requests recording permissions and sets optimal audio session options automatically.
   *
   * @param sampleRate Target audio sampling rate in Hz (e.g. 16000 for Whisper/VAD).
   * @param onAudioChunk Callback invoked with Float32Array PCM samples as they arrive from the mic.
   * @param bufferLength Optional chunk buffer length in sample frames (default: 4096).
   */
  startRecording: (
    sampleRate: number,
    onAudioChunk: (samples: Float32Array) => void,
    bufferLength?: number
  ) => Promise<void>;
  /** Stops the microphone recording session and releases audio input resources. */
  stopRecording: () => Promise<void>;
}

/**
 * React hook managing microphone recording and live PCM audio streaming via `react-native-audio-api`.
 *
 * Configures the native audio session for speech capture, requests mic permissions,
 * feeds audio buffers to consumers in real-time, and guarantees resource cleanup on unmount.
 *
 * @returns Microphone recording state and controller methods.
 */
export function useAudioRecorder(): AudioRecorderState {
  const [isRecording, setIsRecording] = useState(false);
  const recorderRef = useRef<AudioRecorder | null>(null);

  useEffect(() => {
    AudioManager.setAudioSessionOptions({
      iosCategory: 'playAndRecord',
      iosMode: 'spokenAudio',
      iosOptions: ['allowBluetoothHFP', 'defaultToSpeaker'],
    });
    AudioManager.requestRecordingPermissions().catch(() => {});

    return () => {
      if (recorderRef.current) {
        recorderRef.current.stop().catch(() => {});
        recorderRef.current = null;
      }
    };
  }, []);

  const stopRecording = useCallback(async () => {
    if (recorderRef.current) {
      const rec = recorderRef.current;
      recorderRef.current = null;
      await rec.stop().catch(() => {});
    }
    setIsRecording(false);
  }, []);

  const startRecording = useCallback(
    async (
      sampleRate: number,
      onAudioChunk: (samples: Float32Array) => void,
      bufferLength: number = 4096
    ) => {
      await stopRecording();

      const perm = await AudioManager.requestRecordingPermissions();
      if (perm !== 'Granted') {
        throw new Error('Microphone permission was not granted.');
      }

      const recorder = new AudioRecorder();
      recorderRef.current = recorder;

      recorder.onAudioReady({ sampleRate, bufferLength, channelCount: 1 }, (event: any) => {
        const channelData = event.buffer.getChannelData(0);
        onAudioChunk(new Float32Array(channelData));
      });

      const result = await recorder.start();
      if (result.status === 'error') {
        recorderRef.current = null;
        throw new Error(result.message || 'Failed to start microphone recorder');
      }

      setIsRecording(true);
    },
    [stopRecording]
  );

  return {
    isRecording,
    startRecording,
    stopRecording,
  };
}
