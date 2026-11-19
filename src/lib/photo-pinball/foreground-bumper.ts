import type { SkImage } from '@shopify/react-native-skia';

type Point = { x: number; y: number };
export type ForegroundBumper = Point & { outline: Point[] };

const grid = 64;
const threshold = 0.12;

/** Convex envelope of the depth samples, including the space between the rim and base. */
function outlineOf(cells: number[]): Point[] {
  const points = new Set<number>();
  const stride = grid + 1;
  for (const cell of cells) {
    const corner = Math.floor(cell / grid) * stride + (cell % grid);
    for (const index of [corner, corner + 1, corner + stride, corner + stride + 1]) {
      points.add(index);
    }
  }
  const sorted = [...points]
    .map((index) => ({ x: (index % stride) / grid, y: Math.floor(index / stride) / grid }))
    .sort((a, b) => a.x - b.x || a.y - b.y);
  const chain = (ordered: Point[]) => {
    const edge: Point[] = [];
    for (const point of ordered) {
      while (edge.length >= 2) {
        const a = edge[edge.length - 2];
        const b = edge[edge.length - 1];
        if ((b.x - a.x) * (point.y - a.y) > (b.y - a.y) * (point.x - a.x)) break;
        edge.pop();
      }
      edge.push(point);
    }
    return edge.slice(0, -1);
  };
  return [...chain(sorted), ...chain(sorted.reverse())];
}

/** Finds the largest foreground region and derives its collision outline. */
export function findForegroundBumper(depth: SkImage): ForegroundBumper | null {
  const pixels = depth.readPixels();
  if (!(pixels instanceof Uint8Array)) return null;
  const width = depth.width();
  const height = depth.height();
  const sample = (x: number, y: number) => {
    const px = Math.floor(((x + 0.5) / grid) * width);
    const py = Math.floor(((y + 0.5) / grid) * height);
    return pixels[(py * width + px) * 4] / 255;
  };

  const left = Math.round(grid * 0.14);
  const right = grid - 1 - left;
  const foreground = new Set<number>();
  for (let y = 0; y < grid; y++) {
    const nearLeft = sample(left, y);
    const nearRight = sample(right, y);
    for (let x = left + 1; x < right; x++) {
      const table = nearLeft + (nearRight - nearLeft) * ((x - left) / (right - left));
      if (sample(x, y) - table > threshold) foreground.add(y * grid + x);
    }
  }

  let biggest: number[] = [];
  for (const seed of foreground) {
    foreground.delete(seed);
    const region = [seed];
    for (let i = 0; i < region.length; i++) {
      const cell = region[i];
      for (const neighbor of [cell - grid, cell + grid, cell - 1, cell + 1]) {
        if (foreground.delete(neighbor)) region.push(neighbor);
      }
    }
    if (region.length > biggest.length) biggest = region;
  }
  if (biggest.length < grid) return null;

  const outline = outlineOf(biggest);
  if (outline.length < 3 || outline.some(({ y }) => y > 0.79)) return null;
  const center = outline.reduce(
    (sum, point) => ({
      x: sum.x + point.x / outline.length,
      y: sum.y + point.y / outline.length,
    }),
    { x: 0, y: 0 }
  );
  return { ...center, outline };
}
