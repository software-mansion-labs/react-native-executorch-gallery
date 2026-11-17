export type CollisionField = { data: number[]; width: number; height: number; sampledAt: number };
export type Drop = { x: number; y: number; vx: number };
export const MASK_MAX_AGE_MS = 650;

/** Never collide with old inference or a mask from a paused clip. */
export function isFreshMask(field: CollisionField | null, now: number, playing: boolean) {
  'worklet';
  return (
    !!field && playing && now - field.sampledAt >= 0 && now - field.sampledAt < MASK_MAX_AGE_MS
  );
}

/** Samples the normalized union mask without clamping outside the image. */
export function isOccupied(field: CollisionField, x: number, y: number) {
  'worklet';
  if (x < 0 || x >= 1 || y < 0 || y >= 1) return false;
  return field.data[Math.floor(y * field.height) * field.width + Math.floor(x * field.width)] === 1;
}

/** Advances a rain drop, sweeps through thin obstacles, and rolls to the nearest free side. */
export function advanceDrop(drop: Drop, dt: number, field: CollisionField | null): boolean {
  'worklet';
  const oldY = drop.y;
  drop.vx *= Math.exp(-dt * 4);
  const nextX = drop.x + drop.vx * dt;
  const nextY = oldY + dt * (0.35 + 0.1 * (drop.x % 0.2));
  let hitY = -1;
  if (field) {
    const steps = Math.max(1, Math.ceil(Math.abs(nextY - oldY) * field.height * 2));
    for (let step = 1; step <= steps; step++) {
      const y = oldY + ((nextY - oldY) * step) / steps;
      if (isOccupied(field, nextX, y)) {
        hitY = y;
        break;
      }
    }
  }
  if (hitY >= 0 && field) {
    let direction = drop.x < 0.5 ? -1 : 1;
    for (let distance = 1; distance <= 20; distance++) {
      const offset = distance / field.width;
      if (!isOccupied(field, nextX - offset, hitY)) {
        direction = -1;
        break;
      }
      if (!isOccupied(field, nextX + offset, hitY)) {
        direction = 1;
        break;
      }
    }
    drop.vx = direction * 0.24;
    drop.x += drop.vx * dt;
    drop.y = Math.max(0, oldY - dt * 0.04);
    // A moving person may sweep across a drop between inference updates.
    // Project all the way out, even if the new silhouette contains the old drop.
    while (drop.y > 0 && isOccupied(field, drop.x, drop.y)) {
      drop.y = Math.max(0, drop.y - 1 / field.height);
    }
    return true;
  }
  drop.x = nextX;
  drop.y = nextY;
  return false;
}
