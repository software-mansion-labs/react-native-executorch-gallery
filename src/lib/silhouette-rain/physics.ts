export type CollisionField = {
  data: number[] | Uint8Array;
  width: number;
  height: number;
  sampledAt: number;
  distance?: Float32Array;
};
export type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  seed: number;
  cooldown: number;
  normalX: number;
  normalY: number;
  impactSpeed: number;
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
): Float32Array {
  const { data, width: w, height: h } = field;
  const sx = (aspect * h) / w,
    diagonal = Math.hypot(sx, 1);
  const toForeground = new Float32Array(w * h);
  const toBackground = new Float32Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x,
        solid = data[i] === 1;
      toForeground[i] = solid ? 0 : w + h;
      toBackground[i] = solid ? Math.min((x + 1) * sx, (w - x) * sx, y + 1, h - y) : 0;
    }
  const transform = (d: Float32Array) => {
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
  const outside = transform(toForeground),
    inside = transform(toBackground);
  const result = new Float32Array(w * h);
  for (let i = 0; i < result.length; i++) result[i] = data[i] ? -inside[i]! : outside[i]!;
  return result;
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

/** Respawns above the view with decorrelated position, speed and depth layer. */
export function spawnParticle(p: Particle, index: number, spread = false) {
  'worklet';
  p.seed = (p.seed * 1664525 + 1013904223) >>> 0;
  const r = p.seed / 4294967296;
  p.x = r;
  p.y = spread ? (index * 0.61803398875) % 1 : -0.04 - r * 0.1;
  p.vx = (r - 0.5) * 0.035;
  p.vy = 0.55 + (index % 3) * 0.12 + r * 0.2;
  p.normalX = 0;
  p.normalY = -1;
  p.impactSpeed = 0;
  p.age = 0;
  p.cooldown = 0;
}

/** Substeps, gravity/drag, normal impulses, tangent friction and bounded penetration correction. */
export function advanceParticle(
  p: Particle,
  dt: number,
  field: CollisionField | null,
  aspect: number,
  time: number
): boolean {
  'worklet';
  p.age += dt;
  p.cooldown = Math.max(0, p.cooldown - dt);
  p.vx += (Math.sin(time * 0.55 + p.seed * 0.000001) * 0.008 - 0.85 * p.vx) * dt;
  p.vy += (1.4 - 0.85 * p.vy) * dt;
  const steps = field
    ? Math.min(16, Math.max(1, Math.ceil(Math.hypot(p.vx, p.vy) * dt * field.height * 1.5)))
    : 1;
  const radius = 0.0015;
  let impact = false;
  for (let step = 0; step < steps; step++) {
    const oldX = p.x,
      oldY = p.y;
    p.x += (p.vx * dt) / steps / aspect;
    p.y += (p.vy * dt) / steps;
    if (!field) continue;
    const distance = signedDistance(field, p.x, p.y);
    if (distance >= radius * field.height) continue;
    const dx = 1 / field.width,
      dy = 1 / field.height;
    const gx =
      (signedDistance(field, p.x + dx, p.y) - signedDistance(field, p.x - dx, p.y)) / (dx * aspect);
    const gy = (signedDistance(field, p.x, p.y + dy) - signedDistance(field, p.x, p.y - dy)) / dy;
    const length = Math.hypot(gx, gy);
    const nx = length > 0.001 ? gx / length : 0,
      ny = length > 0.001 ? gy / length : -1;
    p.normalX = nx;
    p.normalY = ny;
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
    p.x += (nx * correction) / aspect;
    p.y += ny * correction;
    const vn = p.vx * nx + p.vy * ny;
    if (vn < 0) {
      const restitution = 0.18;
      p.vx -= (1 + restitution) * vn * nx;
      p.vy -= (1 + restitution) * vn * ny;
      const normalV = p.vx * nx + p.vy * ny;
      const tangentFriction = 0.045;
      p.vx -= tangentFriction * (p.vx - normalV * nx);
      p.vy -= tangentFriction * (p.vy - normalV * ny);
      if (p.cooldown === 0 && -vn > 0.08) {
        impact = true;
        p.impactSpeed = -vn;
        p.cooldown = 0.12;
      }
    }
  }
  return impact;
}
