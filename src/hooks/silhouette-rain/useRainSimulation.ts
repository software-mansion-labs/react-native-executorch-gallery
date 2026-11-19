import { useMemo } from 'react';
import { Skia } from '@shopify/react-native-skia';
import { useFrameCallback, useSharedValue, type SharedValue } from 'react-native-reanimated';
import { tokens } from '@/theme';
import { DROP_TEXTURE, RAIN_COUNT } from '@/lib/silhouette-rain/texture';
import type { RainMask } from './useSilhouetteRain';
import {
  advanceParticle,
  isFreshMask,
  spawnParticle,
  type Particle,
} from '@/lib/silhouette-rain/physics';

const COUNT = RAIN_COUNT;
const SPLASH_COUNT = 384;

/**
 * Simulates 600 rain drops and pooled splashes on the UI thread.
 * @param props Playback, collision mask, viewport geometry.
 * @returns Persistent atlas transforms and a batched splash path.
 */
export function useRainSimulation({
  mask,
  playing,
  width,
  height,
  aspectRatio,
}: {
  mask: SharedValue<RainMask | null>;
  playing: boolean;
  width: number;
  height: number;
  aspectRatio: number;
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
  const splashPathBuilder = useMemo(() => Skia.PathBuilder.Make(), []);
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
  useFrameCallback((info) => {
    'worklet';
    const dt = Math.min((info.timeSincePreviousFrame ?? 16) / 1000, 0.04);
    const now = Date.now(),
      field = mask.value,
      fresh = isFreshMask(field, now, playing),
      collider = fresh ? field : null;
    if (!initialized.value) {
      for (let i = 0; i < COUNT; i++) spawnParticle(particles.value[i]!, i, true);
      initialized.value = true;
    }
    if (playing && field) {
      elapsed.value += dt;
      for (let i = 0; i < COUNT; i++) {
        const p = particles.value[i]!;
        const transform = transforms.value[i]!;
        transform.set(0, 0, 0, 0);
        if (advanceParticle(p, dt, collider, aspectRatio, elapsed.value)) {
          // A normal-directed fan creates small, dissipative secondary droplets.
          const energy = Math.min(0.12, 0.025 + p.impactSpeed * 0.055),
            tx = -p.normalY,
            ty = p.normalX;
          for (let j = 0; j < 3; j++) {
            const s = splashes.value[splashIndex.value % SPLASH_COUNT]!;
            const variation = ((p.seed >>> (j * 7)) & 127) / 127;
            // A narrow spray band hides mask quantization without lighting the person.
            const feather = 1.1 / (collider?.height ?? 96);
            s.x = p.x + (p.normalX * feather + tx * (variation - 0.5) * feather) / aspectRatio;
            s.y = p.y + p.normalY * feather + ty * (variation - 0.5) * feather;
            const spread = (variation - 0.5) * energy * 1.8;
            s.vx = p.normalX * energy * (0.4 + variation * 0.6) + tx * spread;
            s.vy = p.normalY * energy * (0.4 + variation * 0.6) + ty * spread;
            s.life = 0.12 + variation * 0.1;
            splashIndex.value++;
          }
          // A raindrop breaks into short-lived spray rather than bouncing as a full streak.
          spawnParticle(p, i);
          continue;
        }
        if (p.y > 1.06 || p.x < -0.08 || p.x > 1.08 || p.age > 12) spawnParticle(p, i);
        if (p.y < -0.04 || p.y > 1.04) continue;
        const speed = Math.hypot(p.vx, p.vy);
        const scale =
          (height * speed * (0.008 + (i % 3) * 0.004) * tokens.rain.dropScale) /
          DROP_TEXTURE.anchorY;
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
        splashPathBuilder.moveTo(p.x * width, p.y * height);
        splashPathBuilder.lineTo(
          p.x * width - p.vx * height * tail,
          p.y * height - p.vy * height * tail
        );
      }
      // Notify the atlas mapper and splash renderer after updating the fixed pools.
      transforms.modify(undefined, true);
      splashPath.value = splashPathBuilder.detach();
    }
  });
  return { transforms, splashPath };
}
