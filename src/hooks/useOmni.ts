import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { AudioContext } from 'react-native-audio-api';
import { useSharedValue } from 'react-native-reanimated';
import { loadModel, useResourceDownload, wrapAsync } from 'react-native-executorch';
import * as Device from 'expo-device';

import { useModelControls } from '@/hooks/useModelControls';
import { useAudioRecorder } from '@/hooks/audio/useAudioRecorder';
import { runOmni, type OmniInput, type OmniResult } from '@/lib/omni/inference';

const BASE = (process.env.EXPO_PUBLIC_LFM3_OMNI_BASE_URL ?? 'http://127.0.0.1:8765').replace(
  /\/$/,
  ''
);
export type OmniBackend = 'xnnpack' | 'mlx-int4' | 'mlx-int8';
const FILES = {
  'xnnpack': 'xnnpack/lfm_3_omni_2b_xnnpack_8da4w.pte',
  'mlx-int4': 'mlx/lfm_3_omni_2b_mlx_int4.pte',
  'mlx-int8': 'mlx-int8/lfm_3_omni_2b_mlx_int8.pte',
};
const prepare = wrapAsync((path: string) => {
  'worklet';
  const model = loadModel(path, { eagerLoadMethods: false });
  try {
    for (const name of [
      'vision_encoder',
      'audio_encoder',
      'text_decoder',
      'depth_decoder',
      'audio_embedding',
      'audio_decoder',
    ]) {
      if (!model.schema[name]) throw new Error(`The selected model is missing ${name}.`);
    }
  } finally {
    model.dispose();
  }
});
const infer = wrapAsync(runOmni);

/**
 * Owns explicit Omni asset setup, isolated inference, cancellation, 16 kHz capture,
 * and 24 kHz playback. Returns controls/status and the last independently generated turn.
 * The backend identifies the locally served export; opening the screen never downloads it.
 */
export function useOmni(backend: OmniBackend) {
  const modelPath = `${BASE}/${FILES[backend]}`;
  const tokenizerPath = `${BASE}/xnnpack/tokenizer.json`;
  const sources = useMemo(() => [modelPath, tokenizerPath], [modelPath, tokenizerPath]);
  const model = useModelControls(sources, { name: `LFM3 Omni 2B · ${backend}` });
  const download = useResourceDownload(
    { modelPath, tokenizerPath },
    { preventLoad: !model.loaded }
  );
  const [ready, setReady] = useState(false);
  const [preparationError, setPreparationError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<OmniResult | null>(null);
  const [audio, setAudio] = useState<Float32Array | undefined>();
  const chunks = useRef<Float32Array[]>([]);
  const sampleCount = useRef(0);
  const active = useRef(false);
  const generation = useRef(0);
  const cancelled = useSharedValue(false);
  const player = useRef<AudioContext | null>(null);
  const stop = useCallback(() => {
    cancelled.set(true);
  }, [cancelled]);
  const stopPlayback = useCallback(() => {
    const context = player.current;
    player.current = null;
    if (context) void context.close();
  }, []);
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
    setAudio(samples);
  }, setError);
  const invalidate = useCallback(() => {
    generation.current++;
    stop();
  }, [stop]);
  useEffect(() => {
    const request = ++generation.current;
    void Promise.resolve().then(async () => {
      if (request !== generation.current) return;
      setReady(false);
      setPreparationError(null);
      setAudio(undefined);
      setResult(null);
      setError(null);
      if (!model.loaded || !download.resource || model.deleting) return;
      if (backend !== 'xnnpack' && (Platform.OS !== 'ios' || !Device.isDevice)) {
        setPreparationError(
          'MLX requires a physical Apple device. Select XNNPACK for the simulator.'
        );
        return;
      }
      prepare(download.resource.modelPath)
        .then(() => {
          if (request === generation.current) setReady(true);
        })
        .catch((cause) => {
          if (request === generation.current) setPreparationError(String(cause));
        });
    });
    return invalidate;
  }, [download.resource, model.loaded, model.deleting, backend, invalidate]);
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
  const run = async (input: Omit<OmniInput, 'audio'>) => {
    if (
      !ready ||
      !model.loaded ||
      model.deleting ||
      active.current ||
      !download.resource ||
      recorder.isRecording
    )
      return;
    const request = generation.current;
    active.current = true;
    cancelled.set(false);
    setBusy(true);
    setError(null);
    setResult(null);
    stopPlayback();
    try {
      const value = await infer(
        download.resource.modelPath,
        download.resource.tokenizerPath,
        { ...input, audio },
        cancelled
      );
      if (request === generation.current && !cancelled.get()) setResult(value);
    } catch (cause) {
      if (request === generation.current && !cancelled.get())
        setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      active.current = false;
      if (request === generation.current) setBusy(false);
    }
  };
  const record = async () => {
    if (busy || model.deleting || !ready) return;
    if (recorder.isRecording) {
      await recorder.stopRecording();
      return;
    }
    chunks.current = [];
    sampleCount.current = 0;
    setAudio(undefined);
    stopPlayback();
    try {
      await recorder.startRecording(16000, (chunk) => {
        const remaining = 29 * 16000 - sampleCount.current;
        const samples = chunk.slice(0, remaining);
        chunks.current.push(samples);
        sampleCount.current += samples.length;
        if (sampleCount.current >= 29 * 16000) void recorder.stopRecording();
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  };
  const play = async () => {
    if (!result?.audio.length || busy) return;
    stopPlayback();
    try {
      const context = new AudioContext({ sampleRate: 24000 });
      player.current = context;
      await context.resume();
      if (player.current !== context) return;
      const buffer = context.createBuffer(1, result.audio.length, 24000);
      buffer.copyToChannel(new Float32Array(result.audio), 0);
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(context.destination);
      source.onEnded = stopPlayback;
      source.start();
    } catch (cause) {
      stopPlayback();
      setError(String(cause));
    }
  };
  return {
    model,
    status: {
      isReady: ready,
      downloadProgress: download.downloadProgress,
      resource: download.resource,
      error: download.downloadError || preparationError,
    },
    busy,
    error,
    result,
    run,
    stop,
    record,
    play,
    isRecording: recorder.isRecording,
    recordingStarting: recorder.starting,
    audioSeconds: audio ? audio.length / 16000 : 0,
    clearAudio: () => setAudio(undefined),
  };
}
