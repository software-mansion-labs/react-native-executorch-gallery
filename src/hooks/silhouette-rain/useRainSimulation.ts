import { useMemo } from 'react';
import { Skia } from '@shopify/react-native-skia';
import { useFrameCallback, useSharedValue, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import type { RainMask, RainRenderMetrics } from './useSilhouetteRain';
import {
  advanceParticle,
  isFreshMask,
  spawnParticle,
  type Particle,
} from '@/lib/silhouette-rain/physics';

const COUNT = 600;
const SPLASH_COUNT = 192;

/**
 * Simulates 600 rain drops and pooled splashes on the UI thread.
 * @param props Playback, collision mask, viewport geometry and optional timing callback.
 * @returns Persistent batched Skia paths for three rain layers, splashes and mask inspection.
 */
export function useRainSimulation({
  mask,
  playing,
  collisions,
  showMask,
  width,
  height,
  aspectRatio,
  onMetrics,
}: {
  mask: SharedValue<RainMask | null>;
  playing: boolean;
  collisions: boolean;
  showMask: boolean;
  width: number;
  height: number;
  aspectRatio: number;
  onMetrics?: (metrics: RainRenderMetrics) => void;
}) {
  const initial = useMemo(
    () =>
      Array.from({ length: COUNT }, (_, i): Particle => ({
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        age: 0,
        seed: (i + 1) * 7919,
        cooldown: 0,
        normalX: 0,
        normalY: -1,
        impactSpeed: 0,
      })),
    []
  );
  const splashInitial = useMemo(
    () => Array.from({ length: SPLASH_COUNT }, () => ({ x: 0, y: 0, vx: 0, vy: 0, life: 0 })),
    []
  );
  const initialPaths = useMemo(
    () => [
      Skia.Path.Make(),
      Skia.Path.Make(),
      Skia.Path.Make(),
      Skia.Path.Make(),
      Skia.Path.Make(),
    ],
    []
  );
  const far = useSharedValue(initialPaths[0]!),
    middle = useSharedValue(initialPaths[1]!),
    near = useSharedValue(initialPaths[2]!),
    splashPath = useSharedValue(initialPaths[3]!),
    maskPath = useSharedValue(initialPaths[4]!);
  const particles = useSharedValue(initial),
    splashes = useSharedValue(splashInitial);
  const initialized = useSharedValue(false),
    elapsed = useSharedValue(0),
    splashIndex = useSharedValue(0),
    lastMask = useSharedValue(-1);
  const counters = useSharedValue({ since: 0, frames: 0, hits: 0, cpu: 0 });
  useFrameCallback((info) => {
    'worklet';
    const started = performance.now();
    const dt = Math.min((info.timeSincePreviousFrame ?? 16) / 1000, 0.04);
    const now = Date.now(),
      field = mask.value,
      fresh = isFreshMask(field, now, playing),
      collider = collisions && fresh ? field : null;
    if (!initialized.value) {
      for (let i = 0; i < COUNT; i++) spawnParticle(particles.value[i]!, i, true);
      initialized.value = true;
    }
    if (showMask) {
      const stamp = fresh && field ? field.sampledAt : 0;
      if (lastMask.value !== stamp) {
        const path = maskPath.value;
        path.rewind();
        if (fresh && field)
          for (let y = 0; y < field.height; y++) {
            let start = -1;
            for (let x = 0; x <= field.width; x++) {
              const occupied = x < field.width && field.data[y * field.width + x] === 1;
              if (occupied && start < 0) start = x;
              if (!occupied && start >= 0) {
                path.addRect(
                  Skia.XYWHRect(
                    (start * width) / field.width,
                    (y * height) / field.height,
                    ((x - start) * width) / field.width,
                    height / field.height
                  )
                );
                start = -1;
              }
            }
          }
        maskPath.modify(undefined, true);
        lastMask.value = stamp;
      }
    }
    let hits = 0;
    if (playing) {
      elapsed.value += dt;
      const pFar = far.value,
        pMiddle = middle.value,
        pNear = near.value,
        pSplash = splashPath.value;
      pFar.rewind();
      pMiddle.rewind();
      pNear.rewind();
      pSplash.rewind();
      for (let i = 0; i < COUNT; i++) {
        const p = particles.value[i]!;
        if (advanceParticle(p, dt, collider, aspectRatio, elapsed.value)) {
          hits++;
          // A normal-directed fan creates small, dissipative secondary droplets.
          const energy = Math.min(0.12, 0.025 + p.impactSpeed * 0.055),
            tx = -p.normalY,
            ty = p.normalX;
          for (let j = 0; j < 3; j++) {
            const s = splashes.value[splashIndex.value % SPLASH_COUNT]!;
            s.x = p.x;
            s.y = p.y;
            const variation = ((p.seed >>> (j * 7)) & 127) / 127;
            const spread = (variation - 0.5) * energy * 1.8;
            s.vx = p.normalX * energy * (0.4 + variation * 0.6) + tx * spread;
            s.vy = p.normalY * energy * (0.4 + variation * 0.6) + ty * spread;
            s.life = 0.07 + variation * 0.08;
            splashIndex.value++;
          }
          // A raindrop breaks into short-lived spray rather than bouncing as a full streak.
          spawnParticle(p, i);
          continue;
        }
        if (p.y > 1.06 || p.x < -0.08 || p.x > 1.08 || p.age > 12) spawnParticle(p, i);
        if (p.y < -0.04 || p.y > 1.04) continue;
        const layer = i % 3,
          path = layer === 0 ? pFar : layer === 1 ? pMiddle : pNear;
        const tail = 0.009 + layer * 0.004;
        path.moveTo(p.x * width, p.y * height);
        path.lineTo(p.x * width - p.vx * height * tail, p.y * height - p.vy * height * tail);
      }
      for (let i = 0; i < SPLASH_COUNT; i++) {
        const p = splashes.value[i]!;
        if (p.life <= 0) continue;
        p.life -= dt;
        p.vy += 0.85 * dt;
        p.x += (p.vx * dt) / aspectRatio;
        p.y += p.vy * dt;
        const tail = Math.min(0.008, p.life * 0.05);
        pSplash.moveTo(p.x * width, p.y * height);
        pSplash.lineTo(p.x * width - p.vx * height * tail, p.y * height - p.vy * height * tail);
      }
      // Force a change notification after mutating each persistent native path.
      far.modify(undefined, true);
      middle.modify(undefined, true);
      near.modify(undefined, true);
      splashPath.modify(undefined, true);
    }
    const c = counters.value;
    if (!c.since) c.since = info.timestamp;
    else c.frames++;
    c.hits += hits;
    c.cpu += performance.now() - started;
    if (info.timestamp - c.since >= 1000) {
      if (onMetrics)
        scheduleOnRN(onMetrics, {
          fps: Math.round((c.frames * 1000) / (info.timestamp - c.since)),
          maskAgeMs: field ? Math.max(0, Math.round(now - field.sampledAt)) : 0,
          fresh,
          contacts: c.hits,
          animationMs: c.cpu / Math.max(1, c.frames),
        });
      counters.value = { since: info.timestamp, frames: 0, hits: 0, cpu: 0 };
    }
  });
  return { far, middle, near, splashPath, maskPath };
}
