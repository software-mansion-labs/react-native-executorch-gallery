import { useMemo } from 'react';
import { Skia } from '@shopify/react-native-skia';
import { useFrameCallback, useSharedValue, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import type { RainMask, RainRenderMetrics } from './useSilhouetteRain';
import {
  advanceParticle,
  isFreshMask,
  spawnParticle,
  type EffectId,
  type Particle,
} from '@/lib/silhouette-rain/physics';
import { tokens } from '@/theme';
const COUNT = 180;

/** Owns particle integration, splash lifetimes, cached silhouette paths and lava uniforms on the UI thread. */
export function useSilhouetteEffects({
  mask,
  playing,
  collisions,
  showMask,
  effect,
  width,
  height,
  aspectRatio,
  onMetrics,
}: {
  mask: SharedValue<RainMask | null>;
  playing: boolean;
  collisions: boolean;
  showMask: boolean;
  effect: EffectId;
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
      })),
    []
  );
  const particles = useSharedValue(initial);
  const splashes = useSharedValue(
    Array.from({ length: 64 }, () => ({ x: 0, y: 0, vx: 0, vy: 0, life: 0 }))
  );
  const previousEffect = useSharedValue('');
  const elapsed = useSharedValue(0);
  const paths = useSharedValue([Skia.Path.Make(), Skia.Path.Make(), Skia.Path.Make()]);
  const splashPath = useSharedValue(Skia.Path.Make());
  const maskPath = useSharedValue(Skia.Path.Make());
  const contourPath = useSharedValue(Skia.Path.Make());
  const lastMask = useSharedValue(-1);
  const splashIndex = useSharedValue(0);
  const uniforms = useSharedValue({
    resolution: [width, height],
    time: 0,
    balls: new Array<number>(36).fill(0),
    cold: tokens.effects.lavaCold,
    warm: tokens.effects.lavaWarm,
    hot: tokens.effects.lavaHot,
  });
  const counters = useSharedValue({ since: 0, frames: 0, hits: 0 });

  useFrameCallback((info) => {
    'worklet';
    const dt = Math.min((info.timeSincePreviousFrame ?? 16) / 1000, 0.05);
    const field = mask.value,
      now = Date.now();
    const fresh = isFreshMask(field, now, playing);
    const collider = collisions && fresh ? field : null;
    if (previousEffect.value !== effect) {
      particles.value.forEach((p, i) => spawnParticle(p, i, effect, true));
      splashes.value.forEach((p) => {
        p.life = 0;
      });
      previousEffect.value = effect;
    }
    // Rebuild row spans and boundary edges only when a new mask arrives.
    const stamp = fresh && field ? field.sampledAt : 0;
    if ((playing || showMask) && lastMask.value !== stamp) {
      const fill = Skia.Path.Make(),
        edge = Skia.Path.Make();
      if (fresh && field) {
        const w = field.width,
          h = field.height,
          cw = width / w,
          ch = height / h;
        for (let y = 0; y < h; y++) {
          let start = -1;
          for (let x = 0; x <= w; x++) {
            const occupied = x < w && field.data[y * w + x] === 1;
            if (occupied && start < 0) start = x;
            if (!occupied && start >= 0) {
              fill.addRect(Skia.XYWHRect(start * cw, y * ch, (x - start) * cw, ch));
              start = -1;
            }
            if (!occupied) continue;
            const px = x * cw,
              py = y * ch;
            if (y === 0 || !field.data[(y - 1) * w + x]) {
              edge.moveTo(px, py);
              edge.lineTo(px + cw, py);
            }
            if (y === h - 1 || !field.data[(y + 1) * w + x]) {
              edge.moveTo(px, py + ch);
              edge.lineTo(px + cw, py + ch);
            }
            if (x === 0 || !field.data[y * w + x - 1]) {
              edge.moveTo(px, py);
              edge.lineTo(px, py + ch);
            }
            if (x === w - 1 || !field.data[y * w + x + 1]) {
              edge.moveTo(px + cw, py);
              edge.lineTo(px + cw, py + ch);
            }
          }
        }
      }
      maskPath.value = fill;
      contourPath.value = edge;
      lastMask.value = stamp;
    }
    let hits = 0;
    if (playing) {
      elapsed.value += dt;
      const layers = [Skia.Path.Make(), Skia.Path.Make(), Skia.Path.Make()];
      const count = effect === 'lava' ? 12 : effect === 'snow' ? 110 : COUNT;
      const balls: number[] = [];
      for (let i = 0; i < count; i++) {
        const p = particles.value[i]!;
        if (advanceParticle(p, dt, collider, effect, aspectRatio, elapsed.value)) {
          hits++;
          if (effect === 'rain')
            for (let j = 0; j < 3; j++) {
              const slot = splashes.value[splashIndex.value % 64]!;
              const angle = -Math.PI * (0.15 + 0.35 * j);
              slot.x = p.x;
              slot.y = p.y;
              slot.vx = Math.cos(angle) * 0.12;
              slot.vy = Math.sin(angle) * 0.16;
              slot.life = 0.3;
              splashIndex.value++;
            }
        }
        if (p.y > 1.15 || p.y < -0.18 || p.x < -0.12 || p.x > 1.12 || p.age > 18)
          spawnParticle(p, i, effect);
        const px = p.x * width,
          py = p.y * height;
        const layer = layers[i % 3]!;
        if (effect === 'lava') {
          balls.push(p.x * aspectRatio, p.y, 0.045 + (i % 4) * 0.014);
        } else if (effect === 'snow') layer.addCircle(px, py, 1.2 + (i % 3) * 0.7);
        else {
          const trail = effect === 'rain' ? 0.024 : 0.06;
          layer.moveTo(px, py);
          layer.lineTo(px - p.vx * height * trail, py - p.vy * height * trail);
          if (effect === 'embers') layer.addCircle(px, py, 0.7 + (i % 3) * 0.35);
        }
      }
      paths.value = layers;
      const splash = Skia.Path.Make();
      for (const p of splashes.value)
        if (p.life > 0) {
          p.life -= dt;
          p.vy += 0.65 * dt;
          p.x += (p.vx * dt) / aspectRatio;
          p.y += p.vy * dt;
          splash.moveTo(p.x * width, p.y * height);
          splash.lineTo(
            (p.x - (p.vx * 0.025) / aspectRatio) * width,
            (p.y - p.vy * 0.025) * height
          );
        }
      splashPath.value = splash;
      if (effect === 'lava')
        uniforms.value = {
          resolution: [width, height],
          time: elapsed.value,
          balls,
          cold: tokens.effects.lavaCold,
          warm: tokens.effects.lavaWarm,
          hot: tokens.effects.lavaHot,
        };
    }
    const c = counters.value;
    if (!c.since) c.since = info.timestamp;
    else c.frames++;
    c.hits += hits;
    if (info.timestamp - c.since >= 1000) {
      if (onMetrics)
        scheduleOnRN(onMetrics, {
          fps: Math.round((c.frames * 1000) / (info.timestamp - c.since)),
          maskAgeMs: field ? Math.max(0, Math.round(now - field.sampledAt)) : 0,
          fresh,
          contacts: c.hits,
        });
      counters.value = { since: info.timestamp, frames: 0, hits: 0 };
    }
  });
  return { paths, splashPath, maskPath, contourPath, uniforms };
}
