import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import type { VideoPlayer } from 'expo-video';
import * as ImagePicker from 'expo-image-picker';
import { useSharedValue } from 'react-native-reanimated';
import { useModel, useResourceDownload } from 'react-native-executorch';

import { buildDistanceField } from '@/lib/silhouette-rain/physics';
import { createClipSampler } from '@/lib/silhouette-rain/video';
import {
  createRainSegmenter,
  SEGMENTERS,
  type PersonMask,
  type SegmenterId,
} from '@/lib/silhouette-rain/segmenter';

export type RainRenderMetrics = {
  fps: number;
  animationMs: number;
  maskAgeMs: number;
  fresh: boolean;
  contacts: number;
};
const EMPTY_STATS = {
  inferenceMs: 0,
  frameMs: 0,
  colliderMs: 0,
  totalMs: 0,
  updateHz: 0,
  people: 0,
  updates: 0,
};

export type RainMask = PersonMask & { sampledAt: number; distance: Float32Array };

/**
 * Owns clip decoding and one-at-a-time RNE inference. Samples the latest frame,
 * drops work while busy, and rejects results after pause, background or unmount.
 * Returns native playback controls, shared collision mask and timings.
 */
export function useSilhouetteRain(loaded: boolean, modelId: SegmenterId = 'selfie') {
  const descriptor = SEGMENTERS[modelId];
  const download = useResourceDownload(descriptor.config, { preventLoad: !loaded });
  const { model: segmenter, error: modelError } = useModel(createRainSegmenter, download.resource);
  const [player, setPlayer] = useState<VideoPlayer | null>(null);
  const [clip, setClip] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [aspectRatio, setAspectRatio] = useState(16 / 9);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState(EMPTY_STATS);
  const [renderStats, setRenderStats] = useState<RainRenderMetrics>({
    fps: 0,
    animationMs: 0,
    maskAgeMs: 0,
    fresh: false,
    contacts: 0,
  });
  const [effectEnabled, setEffectEnabled] = useState(true);
  const effectEnabledRef = useRef(true);
  const [collisions, setCollisions] = useState(true);
  const [showMask, setShowMask] = useState(false);
  const mask = useSharedValue<RainMask | null>(null);
  const inFlight = useRef(false);
  const pending = useRef<Promise<void> | null>(null);
  const generation = useRef(0);
  const videoRef = useRef<Awaited<ReturnType<typeof createClipSampler>> | null>(null);
  const playingRef = useRef(false);

  useEffect(() => {
    generation.current++;
    playingRef.current = playing;
    mask.set(null);
    if (playing) videoRef.current?.play();
    else videoRef.current?.pause();
  }, [playing, mask]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') {
        setPlaying(false);
        mask.set(null);
      }
    });
    return () => subscription.remove();
  }, [mask]);

  useEffect(() => {
    mask.set(null);
    if (!clip || !loaded) return;
    let active = true;
    generation.current++;
    let dispose = () => {};
    void (async () => {
      const sampler = await createClipSampler(clip, descriptor.inputSize);
      if (!active) {
        sampler.dispose();
        return;
      }
      videoRef.current = sampler;
      setPlayer(sampler.player);
      let timer: ReturnType<typeof setInterval> | undefined;
      dispose = () => {
        if (timer) clearInterval(timer);
        setPlayer(null);
        sampler.dispose();
        if (videoRef.current === sampler) videoRef.current = null;
      };
      const preview = await sampler.sample(0);
      if (!active) {
        preview.image.dispose();
        return;
      }
      preview.image.dispose();
      setAspectRatio(preview.input.width / preview.input.height);
      if (playingRef.current) sampler.play();
      let deliveries: number[] = [];
      timer = setInterval(() => {
        const sampledAt = Date.now();
        if (
          !active ||
          !playingRef.current ||
          !effectEnabledRef.current ||
          !segmenter ||
          inFlight.current
        )
          return;
        inFlight.current = true;
        const revision = generation.current;
        pending.current = (async () => {
          const frameStarted = performance.now();
          const current = await sampler.sample();
          const frameMs = performance.now() - frameStarted;
          if (!active || generation.current !== revision) {
            current.image.dispose();
            return;
          }
          current.image.dispose();
          const started = performance.now();
          const result = await segmenter.run(current.input);
          if (!active || generation.current !== revision) return;
          const inferenceMs = performance.now() - started;
          const colliderStarted = performance.now();
          const distance = buildDistanceField(result, current.input.width / current.input.height);
          const colliderMs = performance.now() - colliderStarted;
          const totalMs = performance.now() - frameStarted;
          const deliveredAt = Date.now();
          const sourceOffsetMs = (current.requestedSeconds - current.sourceSeconds) * 1000;
          if (!effectEnabledRef.current) return;
          mask.set({ ...result, distance, sampledAt: sampledAt - sourceOffsetMs });
          deliveries = deliveries.filter((time) => deliveredAt - time < 1000);
          deliveries.push(deliveredAt);
          const span = deliveredAt - deliveries[0]!;
          setStats((old) => ({
            inferenceMs,
            frameMs,
            colliderMs,
            totalMs,
            updateHz: span > 0 ? ((deliveries.length - 1) * 1000) / span : 0,
            people: result.people,
            updates: old.updates + 1,
          }));
        })()
          .catch((cause: unknown) => {
            if (active) {
              setError(String(cause));
              setPlaying(false);
              mask.set(null);
            }
          })
          .finally(() => {
            inFlight.current = false;
          });
      }, 16);
    })().catch((cause: unknown) => {
      if (active) {
        dispose();
        setError(String(cause));
      }
    });
    return () => {
      active = false;
      mask.set(null);
      dispose();
    };
  }, [clip, loaded, mask, segmenter, descriptor.inputSize]);

  const openClip = useCallback((uri: string, autoplay = false) => {
    setPlaying(autoplay);
    setError(null);
    setClip(uri);
    setStats(EMPTY_STATS);
  }, []);

  const pickClip = async () => {
    setPlaying(false);
    setError(null);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'] });
      if (result.canceled || !result.assets[0]) return;
      openClip(result.assets[0].uri);
    } catch (cause) {
      setError(String(cause));
    }
  };

  return {
    player,
    effectEnabled,
    toggleEffect: () => {
      generation.current++;
      effectEnabledRef.current = !effectEnabledRef.current;
      setEffectEnabled(effectEnabledRef.current);
      mask.set(null);
    },
    modelId,
    waitForIdle: () => pending.current ?? Promise.resolve(),
    status: {
      isReady: !!segmenter,
      resource: download.resource,
      downloadProgress: download.downloadProgress,
      error: download.downloadError || modelError,
    },
    error,
    aspectRatio,
    mask,
    playing,
    stats,
    renderStats,
    setRenderStats,
    collisions,
    showMask,
    hasClip: !!clip,
    pickClip,
    openClip,
    togglePlayback: () => {
      mask.set(null);
      setPlaying((value) => !value);
    },
    toggleCollisions: () => setCollisions((value) => !value),
    toggleMask: () => setShowMask((value) => !value),
  };
}
