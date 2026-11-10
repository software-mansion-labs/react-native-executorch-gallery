import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { useModel, useResourceDownload } from 'react-native-executorch';
import * as Device from 'expo-device';

import { useModelControls } from '@/hooks/useModelControls';
import { useAudioRecorder } from '@/hooks/audio/useAudioRecorder';
import type { OmniInput, OmniResult } from '@/lib/omni/inference';
import { createOmniRunner } from '@/lib/omni/runner';
import { useTaskState } from '@/hooks/useTaskState';
import { useOmniPlayback } from '@/hooks/omniPlayback';
import { useSpeechLevel } from '@/hooks/speech-to-text/useSpeechLevel';

const LOCAL_BASE = process.env.EXPO_PUBLIC_LFM3_OMNI_BASE_URL;
const BASE = (
  LOCAL_BASE ?? 'https://huggingface.co/software-mansion/LFM3-ExecuTorch/resolve/v1.0.0/omni_2b'
).replace(/\/$/, '');
export type OmniBackend = 'xnnpack' | 'mlx-int4';
const DEFAULT_BACKEND: OmniBackend =
  Platform.OS === 'ios' && Device.isDevice ? 'mlx-int4' : 'xnnpack';
const FILES = {
  'xnnpack': 'xnnpack/lfm_3_omni_2b_xnnpack_8da4w.pte',
  'mlx-int4': 'mlx/lfm_3_omni_2b_mlx_int4.pte',
};
export type OmniChatTurn = {
  id: number;
  question: string;
  imageUri?: string;
  result?: OmniResult;
  preview?: string;
  pending?: boolean;
  error?: string;
};

/**
 * Owns explicit Omni setup, a persistent conversation runner, cancellation, 16 kHz capture,
 * and 24 kHz playback. Returns committed turns, actual cache usage and new-chat controls.
 * Defaults to MLX int4 on physical iOS and XNNPACK elsewhere. Opening never downloads assets.
 */
export function useOmni(backend: OmniBackend = DEFAULT_BACKEND) {
  const modelPath = `${BASE}/${FILES[backend]}`;
  const tokenizerPath = `${BASE}/${LOCAL_BASE ? 'xnnpack/' : ''}tokenizer.json`;
  const sources = useMemo(() => [modelPath, tokenizerPath], [modelPath, tokenizerPath]);
  const model = useModelControls(sources, {
    name: 'LFM3 Omni 2B',
    downloadBytes: { [tokenizerPath]: 17_908_634 },
  });
  const download = useResourceDownload(
    { modelPath, tokenizerPath },
    { preventLoad: !model.loaded }
  );
  const supported = backend === 'xnnpack' || (Platform.OS === 'ios' && Device.isDevice);
  const { model: runner, error: runnerError } = useModel(
    createOmniRunner,
    model.loaded && !model.deleting && supported ? download.resource : undefined
  );
  const ready = !!runner;
  const [conversation, setConversation] = useState(0);
  const revision = model.revision + conversation;
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [turns, setTurns] = useTaskState<OmniChatTurn[]>([], revision);
  const chunks = useRef<Float32Array[]>([]);
  const recordedAudio = useRef<Float32Array | undefined>(undefined);
  const sampleCount = useRef(0);
  const active = useRef(false);
  const generation = useRef(0);
  const sequence = useRef(0);
  const stopped = useRef(false);
  const playbackError = useCallback(
    (message: string) => {
      stopped.current = true;
      runner?.stop();
      setError(message);
    },
    [runner]
  );
  const playback = useOmniPlayback(revision, playbackError);
  const stopPlayback = playback.stop;
  const stop = useCallback(() => {
    stopped.current = true;
    runner?.stop();
    stopPlayback();
  }, [runner, stopPlayback]);
  const recorder = useAudioRecorder(() => {
    if (!sampleCount.current) return;
    const samples = new Float32Array(sampleCount.current);
    let offset = 0;
    chunks.current.forEach((chunk) => {
      samples.set(chunk, offset);
      offset += chunk.length;
    });
    chunks.current = [];
    sampleCount.current = 0;
    recordedAudio.current = samples;
  }, setError);
  const microphone = useSpeechLevel(recorder.isRecording);
  const invalidate = useCallback(() => {
    generation.current++;
    stop();
    stopPlayback();
  }, [stop, stopPlayback]);
  useEffect(() => {
    const listener = AppState.addEventListener('change', (state) => {
      if (state !== 'active') {
        stop();
        stopPlayback();
      }
    });
    return () => {
      invalidate();
      stopPlayback();
      listener.remove();
    };
  }, [stop, stopPlayback, invalidate]);
  const run = async (
    input: Omit<OmniInput, 'mode'> & { imageUri?: string },
    onAccepted?: () => void
  ) => {
    if (
      !runner ||
      !model.loaded ||
      model.deleting ||
      active.current ||
      !download.resource ||
      (recorder.isRecording && !input.audio?.length)
    )
      return;
    const inputAudio = input.audio;
    const request = ++generation.current;
    active.current = true;
    setBusy(true);
    stopped.current = false;
    setError(null);
    const question = {
      id: ++sequence.current,
      question:
        input.prompt.trim() || (inputAudio?.length ? 'Voice message' : 'Tell me about this photo.'),
      imageUri: input.imageUri,
    };
    setTurns((previous) => [...previous, { ...question, pending: true }]);
    stopPlayback();
    try {
      onAccepted?.();
      if (!(await playback.begin(question.id)) || stopped.current) return;
      const generated = await runner.generate(
        { prompt: input.prompt, image: input.image, audio: inputAudio },
        (samples, final) => {
          if (request !== generation.current || stopped.current) return;
          playback.enqueue(question.id, samples, final);
        },
        { audioChunkFrames: 12 },
        (text) => {
          if (request !== generation.current || stopped.current) return;
          setTurns((previous) =>
            previous.map((turn) => (turn.id === question.id ? { ...turn, preview: text } : turn))
          );
        }
      );
      if (request === generation.current) {
        const value: OmniResult = {
          text: generated.text,
          audio: generated.audio,
          limited: generated.limited,
          finishReason: generated.finishReason,
        };
        if (!value.audio.length)
          throw new Error('No speech was generated. Try a shorter question.');
        setTurns((previous) =>
          previous.map((turn) =>
            turn.id === question.id ? { ...turn, result: value, pending: false } : turn
          )
        );
        recordedAudio.current = undefined;
        return value;
      }
    } catch (cause) {
      stopPlayback();
      if (request === generation.current)
        setTurns((previous) =>
          previous.map((turn) =>
            turn.id === question.id
              ? {
                  ...turn,
                  pending: false,
                  error:
                    cause instanceof Error && cause.message === 'Generation stopped.'
                      ? 'Reply interrupted.'
                      : String(cause),
                }
              : turn
          )
        );
      if (
        request === generation.current &&
        !(cause instanceof Error && cause.message === 'Generation stopped.')
      )
        setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      active.current = false;
      if (request === generation.current) {
        setTurns((previous) =>
          previous.map((turn) =>
            turn.id === question.id && turn.pending ? { ...turn, pending: false } : turn
          )
        );
        setBusy(false);
      }
    }
  };
  const sendRecording = async (
    input: Omit<OmniInput, 'mode' | 'audio'> & { imageUri?: string },
    onAccepted?: () => void
  ) => {
    await recorder.stopRecording();
    const samples = recordedAudio.current;
    recordedAudio.current = undefined;
    if (samples?.length) return run({ ...input, audio: samples }, onAccepted);
  };
  const record = async (
    input: Omit<OmniInput, 'mode' | 'audio'> & { imageUri?: string } = { prompt: '' },
    onAccepted?: () => void
  ) => {
    if (busy || model.deleting || !ready) return;
    if (recorder.isRecording) {
      return sendRecording(input, onAccepted);
    }
    chunks.current = [];
    sampleCount.current = 0;
    recordedAudio.current = undefined;
    stopPlayback();
    try {
      await recorder.startRecording(16000, (chunk) => {
        microphone.updateLevel(chunk);
        chunks.current.push(chunk);
        sampleCount.current += chunk.length;
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  };
  const replay = playback.replay;
  const play = useCallback(
    async (samples: Float32Array, id: number) => {
      await replay(id, samples);
    },
    [replay]
  );
  const reset = async () => {
    if (!runner || active.current || recorder.isRecording || recorder.starting) return;
    const request = ++generation.current;
    active.current = true;
    stopPlayback();
    setBusy(true);
    setError(null);
    try {
      await runner.reset();
      if (request === generation.current) setConversation((previous) => previous + 1);
    } catch (cause) {
      if (request === generation.current) setError(String(cause));
    } finally {
      active.current = false;
      if (request === generation.current) setBusy(false);
    }
  };
  return {
    model,
    status: {
      isReady: ready,
      downloadProgress: download.downloadProgress,
      resource: download.resource,
      error:
        download.downloadError ||
        runnerError ||
        (!supported && model.loaded
          ? new Error('MLX requires a physical Apple device.')
          : undefined),
    },
    busy,
    playing: playback.playing,
    speaking: playback.speaking,
    bufferingSpeech: playback.buffering,
    playingTurn: playback.activeId,
    playbackLevel: playback.level,
    microphoneLevel: microphone.level,
    stopPlayback,
    error,
    result: turns.at(-1)?.result ?? null,
    turns,
    revision,
    reset,
    getKVCacheState: runner?.getKVCacheState,
    run,
    stop,
    record,
    play,
    isRecording: recorder.isRecording,
    recordingStarting: recorder.starting,
  };
}
