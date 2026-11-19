import type { DepthMap } from 'react-native-executorch';

export type TableDepthGradient = { x: number; y: number };
export const FLAT_TABLE_GRADIENT = { x: 0, y: 0 };

/** Estimate the affine inverse-depth gradient from two strips assumed to show bare tabletop. */
export function estimateTableGradient({ data, width, height }: DepthMap): TableDepthGradient {
  const slopesX: number[] = [];
  const slopesY: number[] = [];
  const centers: number[] = [];
  const sample = (x: number, y: number) => {
    const value = data[Math.floor(y * height) * width + Math.floor(x * width)];
    return Number.isFinite(value) && value > 0 ? 1 / value : NaN;
  };
  for (const x of [0.1, 0.14, 0.18, 0.82, 0.86, 0.9]) {
    for (const y of [0.32, 0.42, 0.52, 0.62]) {
      const near = sample(x, y + 0.18);
      const far = sample(x, y - 0.18);
      if (Number.isFinite(near + far)) slopesY.push((near - far) / 0.36);
    }
  }
  for (const y of [0.32, 0.4, 0.48, 0.52, 0.6, 0.68]) {
    const left = sample(0.14, y);
    const right = sample(0.86, y);
    if (!Number.isFinite(left + right)) continue;
    slopesX.push((right - left) / 0.72);
    centers.push((left + right) / 2);
  }
  if (!centers.length || !slopesY.length) return FLAT_TABLE_GRADIENT;
  const median = (values: number[]) => values.sort((a, b) => a - b)[Math.floor(values.length / 2)];
  const center = median(centers);
  const x = median(slopesX) / center;
  const y = median(slopesY) / center;
  // Keep the inferred horizon outside the photo so every point remains projectable.
  const scale = Math.min(1, 1.45 / (Math.abs(x) + Math.abs(y)));
  return { x: x * scale, y: y * scale };
}

export function createTableProjection(width: number, height: number, gradient: TableDepthGradient) {
  const dx = gradient.x / width;
  const dy = gradient.y / height;
  // A 60° horizontal field of view supplies approximate intrinsics for an imported photo.
  const focal = (Math.sqrt(3) * width) / 2;
  const nx = focal * dx;
  const ny = focal * dy;
  const stretchX = Math.hypot(1, nx);
  const shear = (nx * ny) / stretchX;
  const stretchY = Math.hypot(1, ny / stretchX);
  return { dx, dy, stretchX, stretchY, shear, cx: width / 2, cy: height / 2 };
}

type TableProjection = ReturnType<typeof createTableProjection>;

export function photoToTable(x: number, y: number, p: TableProjection) {
  'worklet';
  const u = x - p.cx;
  const v = y - p.cy;
  const relativeDepth = 1 + p.dx * u + p.dy * v;
  return { x: (p.stretchX * u + p.shear * v) / relativeDepth, y: (p.stretchY * v) / relativeDepth };
}

export function tableToPhoto(x: number, y: number, p: TableProjection) {
  'worklet';
  const v = y / p.stretchY;
  const u = (x - p.shear * v) / p.stretchX;
  const scale = 1 - p.dx * u - p.dy * v;
  return { x: p.cx + u / scale, y: p.cy + v / scale, scale };
}

type TablePoint = { x: number; y: number };
type TableWall = { nx: number; ny: number; limit: number };

/** Project the photo edges onto the tabletop and inset them by the ball radius. */
export function createTableWalls(p: TableProjection, radius: number): TableWall[] {
  const corners = [
    photoToTable(0, 0, p),
    photoToTable(p.cx * 2, 0, p),
    photoToTable(p.cx * 2, p.cy * 2, p),
    photoToTable(0, p.cy * 2, p),
  ];
  return polygonEdges(corners, radius);
}

function polygonEdges(corners: TablePoint[], radius: number): TableWall[] {
  return corners.map((point, index) => {
    const next = corners[(index + 1) % corners.length];
    const dx = next.x - point.x;
    const dy = next.y - point.y;
    const length = Math.hypot(dx, dy);
    const nx = -dy / length;
    const ny = dx / length;
    return { nx, ny, limit: point.x * nx + point.y * ny + radius };
  });
}

/** Expand the projected object outline so the ball contacts it at its edge. */
export function createTableObstacle(
  p: TableProjection,
  outline: TablePoint[],
  radius: number
): TableWall[] {
  const corners = outline.map(({ x, y }) => photoToTable(x * p.cx * 2, y * p.cy * 2, p));
  return polygonEdges(corners, -radius);
}

/** Find the first moment the ray enters all of the obstacle's half-planes. */
function obstacleHit(
  x: number,
  y: number,
  vx: number,
  vy: number,
  obstacle: TableWall[],
  maxTime: number
) {
  'worklet';
  let enter = -Infinity;
  let exit = maxTime;
  let edge: TableWall | null = null;
  for (const wall of obstacle) {
    const distance = x * wall.nx + y * wall.ny - wall.limit;
    const approach = vx * wall.nx + vy * wall.ny;
    if (Math.abs(approach) < 1e-7) {
      if (distance < 0) return null;
      continue;
    }
    const time = -distance / approach;
    if (approach > 0 && time > enter) {
      enter = time;
      edge = wall;
    } else if (approach < 0) {
      exit = Math.min(exit, time);
    }
    if (enter > exit) return null;
  }
  return edge && enter >= -1e-7 ? { time: Math.max(0, enter), edge } : null;
}

/** Resolve the first edge hit, then spend the remaining frame time on the reflected path. */
export function advanceWithinTable(
  x: number,
  y: number,
  vx: number,
  vy: number,
  dt: number,
  walls: TableWall[],
  obstacle: TableWall[] = []
) {
  'worklet';
  let remaining = dt;
  for (let hit = 0; hit < 4 && remaining > 0; hit++) {
    let travel = remaining;
    let wallHit: TableWall | null = null;
    for (const wall of walls) {
      const normalSpeed = vx * wall.nx + vy * wall.ny;
      if (normalSpeed >= -1e-7) continue;
      const distance = x * wall.nx + y * wall.ny - wall.limit;
      const untilHit = Math.max(0, distance) / -normalSpeed;
      if (untilHit <= travel) {
        travel = untilHit;
        wallHit = wall;
      }
    }
    const contact = obstacleHit(x, y, vx, vy, obstacle, travel);
    if (contact) {
      travel = contact.time;
      wallHit = contact.edge;
    }
    x += vx * travel;
    y += vy * travel;
    remaining -= travel;
    if (wallHit) {
      const normalSpeed = vx * wallHit.nx + vy * wallHit.ny;
      vx -= 2 * normalSpeed * wallHit.nx;
      vy -= 2 * normalSpeed * wallHit.ny;
    }
  }
  return { x, y, vx, vy };
}
