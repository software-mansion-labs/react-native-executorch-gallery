export type CollisionField = {
  data: number[];
  width: number;
  height: number;
  sampledAt: number;
  distance?: number[];
};
export type EffectId = 'rain' | 'snow' | 'embers' | 'lava';
export type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  seed: number;
  cooldown: number;
};
export const MASK_MAX_AGE_MS = 350;

/** Rejects stale, future and paused silhouettes before they influence an effect. */
export function isFreshMask(field: CollisionField | null, now: number, playing: boolean) {
  'worklet';
  return (
    !!field && playing && now - field.sampledAt >= 0 && now - field.sampledAt < MASK_MAX_AGE_MS
  );
}

export function isOccupied(field: CollisionField, x: number, y: number) {
  'worklet';
  if (x < 0 || x >= 1 || y < 0 || y >= 1) return false;
  return field.data[Math.floor(y * field.height) * field.width + Math.floor(x * field.width)] === 1;
}

/** Two-pass chamfer distance field, positive outside and negative inside the silhouette. */
export function buildDistanceField(
  field: Pick<CollisionField, 'data' | 'width' | 'height'>,
  aspect = 1
): number[] {
  const { data, width: w, height: h } = field;
  const sx = (aspect * h) / w,
    diagonal = Math.hypot(sx, 1);
  const transform = (target: number) => {
    const d = data.map((value, i) =>
      value === target
        ? 0
        : target === 0
          ? Math.min(
              ((i % w) + 1) * sx,
              (w - (i % w)) * sx,
              Math.floor(i / w) + 1,
              h - Math.floor(i / w)
            )
          : w + h
    );
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (x > 0) d[i] = Math.min(d[i]!, d[i - 1]! + sx);
        if (y > 0) {
          d[i] = Math.min(d[i]!, d[i - w]! + 1);
          if (x > 0) d[i] = Math.min(d[i]!, d[i - w - 1]! + diagonal);
          if (x < w - 1) d[i] = Math.min(d[i]!, d[i - w + 1]! + diagonal);
        }
      }
    for (let y = h - 1; y >= 0; y--)
      for (let x = w - 1; x >= 0; x--) {
        const i = y * w + x;
        if (x < w - 1) d[i] = Math.min(d[i]!, d[i + 1]! + sx);
        if (y < h - 1) {
          d[i] = Math.min(d[i]!, d[i + w]! + 1);
          if (x > 0) d[i] = Math.min(d[i]!, d[i + w - 1]! + diagonal);
          if (x < w - 1) d[i] = Math.min(d[i]!, d[i + w + 1]! + diagonal);
        }
      }
    return d;
  };
  const outside = transform(1),
    inside = transform(0);
  return data.map((value, i) => (value ? -inside[i]! : outside[i]!));
}

/** Bilinear field lookup, in mask-pixel units. */
export function signedDistance(field: CollisionField, x: number, y: number) {
  'worklet';
  if (x < 0 || x > 1 || y < 0 || y > 1) return 10;
  if (!field.distance) return isOccupied(field, x, y) ? -1 : 1;
  const fx = Math.max(0, Math.min(field.width - 1, x * field.width - 0.5));
  const fy = Math.max(0, Math.min(field.height - 1, y * field.height - 0.5));
  const ix = Math.floor(fx),
    iy = Math.floor(fy),
    jx = Math.min(ix + 1, field.width - 1),
    jy = Math.min(iy + 1, field.height - 1);
  const a = fx - ix,
    b = fy - iy,
    d = field.distance,
    w = field.width;
  return (
    (d[iy * w + ix]! * (1 - a) + d[iy * w + jx]! * a) * (1 - b) +
    (d[jy * w + ix]! * (1 - a) + d[jy * w + jx]! * a) * b
  );
}

/** Outward surface normal in world coordinates (one unit is the image height). */
export function surfaceNormal(field: CollisionField, x: number, y: number, aspect: number) {
  'worklet';
  const dx = 1 / field.width,
    dy = 1 / field.height;
  const nx = (signedDistance(field, x + dx, y) - signedDistance(field, x - dx, y)) / (dx * aspect);
  const ny = (signedDistance(field, x, y + dy) - signedDistance(field, x, y - dy)) / dy;
  const length = Math.hypot(nx, ny);
  return length > 0.001 ? { x: nx / length, y: ny / length } : { x: 0, y: -1 };
}

/** Deterministic spawn; embers and lava rise, rain and snow descend. */
export function spawnParticle(p: Particle, index: number, effect: EffectId, spread = false) {
  'worklet';
  p.seed = (p.seed * 1664525 + 1013904223) >>> 0;
  const r = p.seed / 4294967296;
  p.x = r;
  const rising = effect === 'embers' || effect === 'lava';
  p.y = spread ? (index * 0.61803398875) % 1 : rising ? 1.05 + r * 0.12 : -0.05 - r * 0.12;
  p.vx = (r - 0.5) * 0.06;
  p.vy =
    effect === 'rain'
      ? 0.5 + r * 0.35
      : effect === 'snow'
        ? 0.045 + r * 0.05
        : effect === 'embers'
          ? -0.18 - r * 0.25
          : -0.04 - r * 0.05;
  p.age = 0;
  p.cooldown = 0;
}

/** Substeps, gravity/drag, normal impulses, tangent friction and bounded penetration correction. */
export function advanceParticle(
  p: Particle,
  dt: number,
  field: CollisionField | null,
  effect: EffectId,
  aspect: number,
  time: number
): boolean {
  'worklet';
  p.age += dt;
  p.cooldown = Math.max(0, p.cooldown - dt);
  const gravity =
    effect === 'rain' ? 1.5 : effect === 'snow' ? 0.09 : effect === 'embers' ? -0.13 : -0.09;
  const drag = effect === 'rain' ? 0.7 : effect === 'snow' ? 2.8 : effect === 'embers' ? 0.9 : 1.0;
  p.vx +=
    (Math.sin(time * 0.7 + p.seed * 0.000001) * (effect === 'rain' ? 0.01 : 0.045) - drag * p.vx) *
    dt;
  p.vy += (gravity - drag * p.vy) * dt;
  const steps = Math.min(
    16,
    Math.max(1, Math.ceil(Math.hypot(p.vx, p.vy) * dt * (field?.height ?? 96) * 2))
  );
  const radius = effect === 'lava' ? 0.025 : effect === 'snow' ? 0.0035 : 0.002;
  let impact = false;
  for (let step = 0; step < steps; step++) {
    const oldX = p.x,
      oldY = p.y;
    p.x += (p.vx * dt) / steps / aspect;
    p.y += (p.vy * dt) / steps;
    if (!field) continue;
    const distance = signedDistance(field, p.x, p.y);
    if (distance >= radius * field.height) continue;
    const normal = surfaceNormal(field, p.x, p.y, aspect);
    // A newly moved mask can engulf a particle. Expire it instead of teleporting it to the head.
    if (distance < -3) {
      p.age = 100;
      p.x = oldX;
      p.y = oldY;
      return false;
    }
    const correction = Math.min(
      0.025,
      Math.max(0, (radius * field.height - distance) / field.height)
    );
    p.x += (normal.x * correction) / aspect;
    p.y += normal.y * correction;
    const vn = p.vx * normal.x + p.vy * normal.y;
    if (vn < 0) {
      const restitution = effect === 'rain' ? 0.28 : effect === 'embers' ? 0.6 : 0.06;
      p.vx -= (1 + restitution) * vn * normal.x;
      p.vy -= (1 + restitution) * vn * normal.y;
      const normalV = p.vx * normal.x + p.vy * normal.y;
      const tangentFriction = effect === 'snow' ? 0.12 : effect === 'lava' ? 0.07 : 0.025;
      p.vx -= tangentFriction * (p.vx - normalV * normal.x);
      p.vy -= tangentFriction * (p.vy - normalV * normal.y);
      if (p.cooldown === 0 && -vn > 0.08) {
        impact = true;
        p.cooldown = 0.12;
      }
    }
  }
  return impact;
}
