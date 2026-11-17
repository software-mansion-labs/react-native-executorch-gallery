import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import type { VideoPlayer } from 'expo-video';
import * as ImagePicker from 'expo-image-picker';
import { useSharedValue } from 'react-native-reanimated';
import { useModel, useResourceDownload } from 'react-native-executorch';

import { createClipSampler } from '@/lib/silhouette-rain/video';
import { createRainSegmenter, RAIN_MODEL, type PersonMask } from '@/lib/silhouette-rain/segmenter';

export type RainMask = PersonMask & { sampledAt: number };

/**
 * Owns clip decoding and one-at-a-time RNE inference. Samples the latest frame,
 * drops work while busy, and rejects results after pause, background or unmount.
 * Returns native playback controls, shared collision mask and timings.
 */
export function useSilhouetteRain(loaded: boolean) {
  const download = useResourceDownload(RAIN_MODEL, { preventLoad: !loaded });
  const { model: segmenter, error: modelError } = useModel(createRainSegmenter, download.resource);
  const [player, setPlayer] = useState<VideoPlayer | null>(null);
  const [clip, setClip] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [aspectRatio, setAspectRatio] = useState(16 / 9);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({ inferenceMs: 0, updateHz: 0, people: 0, updates: 0 });
  const [collisions, setCollisions] = useState(true);
  const [showMask, setShowMask] = useState(false);
  const mask = useSharedValue<RainMask | null>(null);
  const inFlight = useRef(false);
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
      const sampler = await createClipSampler(clip);
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
      let lastSample = 0;
      let previousSample = 0;
      timer = setInterval(() => {
        const sampledAt = Date.now();
        if (
          !active ||
          !playingRef.current ||
          !segmenter ||
          inFlight.current ||
          sampledAt - lastSample < 120
        )
          return;
        lastSample = sampledAt;
        inFlight.current = true;
        const revision = generation.current;
        void (async () => {
          const current = await sampler.sample();
          if (!active || generation.current !== revision) {
            current.image.dispose();
            return;
          }
          current.image.dispose();
          const started = performance.now();
          const result = await segmenter.run(current.input);
          if (!active || generation.current !== revision) return;
          mask.set({ ...result, sampledAt });
          const elapsed = sampledAt - previousSample;
          previousSample = sampledAt;
          setStats((old) => ({
            inferenceMs: performance.now() - started,
            updateHz: elapsed > 0 && old.updates > 0 ? 1000 / elapsed : 0,
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
      }, 50);
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
  }, [clip, loaded, mask, segmenter]);

  const openClip = useCallback((uri: string, autoplay = false) => {
    setPlaying(autoplay);
    setError(null);
    setClip(uri);
    setStats({ inferenceMs: 0, updateHz: 0, people: 0, updates: 0 });
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
