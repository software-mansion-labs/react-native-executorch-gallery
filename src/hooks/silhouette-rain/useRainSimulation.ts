import { useMemo } from 'react';
import { Skia } from '@shopify/react-native-skia';
import { useFrameCallback, useSharedValue, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { DROP_TEXTURE, RAIN_COUNT } from '@/lib/silhouette-rain/texture';
import type { RainMask, RainRenderMetrics } from './useSilhouetteRain';
import {
  advanceParticle,
  isFreshMask,
  spawnParticle,
  type Particle,
} from '@/lib/silhouette-rain/physics';

const COUNT = RAIN_COUNT;
const SPLASH_COUNT = 192;

/**
 * Simulates 600 rain drops and pooled splashes on the UI thread.
 * @param props Playback, collision mask, viewport geometry and optional timing callback.
 * @returns Persistent atlas transforms and a batched splash path.
 */
export function useRainSimulation({
  mask,
  playing,
  width,
  height,
  aspectRatio,
  onMetrics,
}: {
  mask: SharedValue<RainMask | null>;
  playing: boolean;
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
  const initialSplashPath = useMemo(() => Skia.Path.Make(), []);
  const splashPath = useSharedValue(initialSplashPath);
  const particles = useSharedValue(initial),
    splashes = useSharedValue(splashInitial);
  const initialTransforms = useMemo(
    () => Array.from({ length: COUNT }, () => Skia.RSXform(0, 0, 0, 0)),
    []
  );
  const transforms = useSharedValue(initialTransforms);
  const initialized = useSharedValue(false),
    elapsed = useSharedValue(0),
    splashIndex = useSharedValue(0);
  const counters = useSharedValue({ since: 0, frames: 0, hits: 0, cpu: 0 });
  useFrameCallback((info) => {
    'worklet';
    const started = performance.now();
    const dt = Math.min((info.timeSincePreviousFrame ?? 16) / 1000, 0.04);
    const now = Date.now(),
      field = mask.value,
      fresh = isFreshMask(field, now, playing),
      collider = fresh ? field : null;
    if (!initialized.value) {
      for (let i = 0; i < COUNT; i++) spawnParticle(particles.value[i]!, i, true);
      initialized.value = true;
    }
    let hits = 0;
    if (playing) {
      elapsed.value += dt;
      const pSplash = splashPath.value;
      pSplash.rewind();
      for (let i = 0; i < COUNT; i++) {
        const p = particles.value[i]!;
        const transform = transforms.value[i]!;
        transform.set(0, 0, 0, 0);
        if (advanceParticle(p, dt, collider, aspectRatio, elapsed.value)) {
          hits++;
          // A normal-directed fan creates small, dissipative secondary droplets.
          const energy = Math.min(0.12, 0.025 + p.impactSpeed * 0.055),
            tx = -p.normalY,
            ty = p.normalX;
          for (let j = 0; j < 3; j++) {
            const s = splashes.value[splashIndex.value % SPLASH_COUNT]!;
            const variation = ((p.seed >>> (j * 7)) & 127) / 127;
            // A narrow spray band hides mask quantization without lighting the person.
            const feather = 0.6 / (collider?.height ?? 96);
            s.x = p.x + (p.normalX * feather + tx * (variation - 0.5) * feather) / aspectRatio;
            s.y = p.y + p.normalY * feather + ty * (variation - 0.5) * feather;
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
        const speed = Math.hypot(p.vx, p.vy);
        const scale = (height * speed * (0.008 + (i % 3) * 0.004)) / DROP_TEXTURE.anchorY;
        const scos = (scale * p.vy) / Math.max(speed, 0.001),
          ssin = (-scale * p.vx) / Math.max(speed, 0.001);
        transform.set(
          scos,
          ssin,
          p.x * width - scos * DROP_TEXTURE.anchorX + ssin * DROP_TEXTURE.anchorY,
          p.y * height - ssin * DROP_TEXTURE.anchorX - scos * DROP_TEXTURE.anchorY
        );
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
      // Notify the atlas mapper and splash renderer after updating the fixed pools.
      transforms.modify(undefined, true);
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
  return { transforms, splashPath };
}
