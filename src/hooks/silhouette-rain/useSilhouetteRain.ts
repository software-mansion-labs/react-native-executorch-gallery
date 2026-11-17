import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useModel, useResourceDownload } from 'react-native-executorch';
import { useCameraDevice, useCameraPermission, useFrameOutput } from 'react-native-vision-camera';
import { useResizer, type GPUFrame } from 'react-native-vision-camera-resizer';
import { useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { buildDistanceField, projectCameraMask } from '@/lib/silhouette-rain/physics';
import {
  createRainSegmenter,
  RAIN_INPUT_SIZE,
  RAIN_MODEL,
  type PersonMask,
} from '@/lib/silhouette-rain/segmenter';

export type RainMask = PersonMask & { sampledAt: number; distance: Float32Array };
export type RainRenderMetrics = {
  fps: number;
  animationMs: number;
  maskAgeMs: number;
  fresh: boolean;
  contacts: number;
};

/**
 * Loads Selfie Segmentation on request and processes live Vision Camera frames.
 * GPU-resizes the portrait frame to a 256px long edge before synchronous inference on the camera worklet; busy
 * frames are dropped. Backgrounding, stopping and effect changes reject stale masks.
 * @param loaded Whether shared model controls explicitly requested loading.
 * @param prepared Whether the shared model setup transition has completed.
 * @returns Camera output, permission/rain controls, shared collision mask and timings.
 */
export function useSilhouetteRain(loaded: boolean, prepared: boolean) {
  const download = useResourceDownload(RAIN_MODEL, { preventLoad: !loaded });
  const { model, error: modelError } = useModel(createRainSegmenter, download.resource);
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('front');
  const [isActive, setIsActive] = useState(false);
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  const [error, setError] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState(3 / 4);
  const [latency, setLatency] = useState(0);
  const [renderStats, setRenderStats] = useState<RainRenderMetrics>({
    fps: 0,
    animationMs: 0,
    maskAgeMs: 0,
    fresh: false,
    contacts: 0,
  });
  const mask = useSharedValue<RainMask | null>(null);
  const control = useSharedValue({ active: false, revision: 0 });
  const reportAt = useSharedValue(0);
  const mounted = useRef(true);
  const { resizer, error: resizerError } = useResizer({
    ...RAIN_INPUT_SIZE,
    channelOrder: 'rgb',
    dataType: 'uint8',
    scaleMode: 'cover',
    pixelLayout: 'interleaved',
  });
  const segmentWorklet = model?.segmentWorklet;
  const ready = loaded && prepared && !!model && !!resizer;

  useEffect(() => {
    control.set((old) => ({
      active: ready && isActive && foreground,
      revision: old.revision + 1,
    }));
    mask.set(null);
  }, [ready, isActive, foreground, control, mask]);
  useEffect(() => {
    mounted.current = true;
    const stop = () => {
      control.set((old) => ({ active: false, revision: old.revision + 1 }));
      mask.set(null);
      setIsActive(false);
    };
    const subscription = AppState.addEventListener('change', (state) => {
      setForeground(state === 'active');
      if (state !== 'active') stop();
    });
    return () => {
      mounted.current = false;
      control.set((old) => ({ active: false, revision: old.revision + 1 }));
      mask.set(null);
      subscription.remove();
    };
  }, [control, mask]);

  const onTiming = (ms: number, aspect: number) => {
    if (!mounted.current || !control.get().active) return;
    setLatency(ms);
    setAspectRatio(aspect);
  };
  const onError = (message: string) => {
    if (!mounted.current) return;
    control.set((old) => ({ active: false, revision: old.revision + 1 }));
    mask.set(null);
    setError(message);
    setIsActive(false);
  };
  const frameOutput = useFrameOutput({
    pixelFormat: 'yuv',
    // Resolve sensor rotation/mirroring natively before the GPU resizer reads pixels.
    enablePhysicalBufferRotation: true,
    dropFramesWhileBusy: true,
    onFrame(frame) {
      'worklet';
      const session = control.get();
      if (!session.active || !resizer || !segmentWorklet) {
        frame.dispose();
        return;
      }
      let resized: GPUFrame | undefined;
      try {
        const sampledAt = Date.now();
        const sideways = frame.orientation === 'left' || frame.orientation === 'right';
        const aspect = sideways ? frame.height / frame.width : frame.width / frame.height;
        resized = resizer.resize(frame);
        const result = segmentWorklet({
          data: new Uint8Array(resized.getPixelBuffer()),
          ...RAIN_INPUT_SIZE,
          format: 'rgb',
          layout: 'hwc',
        });
        const projected = projectCameraMask(
          result,
          aspect,
          RAIN_INPUT_SIZE.width / RAIN_INPUT_SIZE.height
        );
        const distance = buildDistanceField(projected, aspect);
        const current = control.get();
        if (!current.active || current.revision !== session.revision) return;
        mask.set({ ...projected, distance, sampledAt });
        const now = Date.now();
        if (now - reportAt.get() >= 500) {
          reportAt.set(now);
          scheduleOnRN(onTiming, now - sampledAt, aspect);
        }
      } catch (cause) {
        scheduleOnRN(onError, String(cause));
      } finally {
        resized?.dispose();
        frame.dispose();
      }
    },
  });

  const toggleRain = async () => {
    control.set((old) => ({ active: false, revision: old.revision + 1 }));
    mask.set(null);
    setError(null);
    if (isActive) {
      setIsActive(false);
      return;
    }
    if (!ready || !device) return;
    if (!hasPermission && !(await requestPermission())) {
      setError('Allow camera access in Settings to start the rain.');
      return;
    }
    if (mounted.current) setIsActive(true);
  };
  return {
    status: {
      isReady: !!model,
      resource: download.resource,
      downloadProgress: download.downloadProgress,
      error: download.downloadError || modelError,
    },
    error: error || (resizerError ? String(resizerError) : null),
    device,
    frameOutput,
    hasPermission,
    ready,
    isActive,
    showCamera: ready && !!device && hasPermission && foreground,
    mask,
    aspectRatio,
    latency,
    renderStats,
    setRenderStats,
    toggleRain,
    onError,
  };
}
