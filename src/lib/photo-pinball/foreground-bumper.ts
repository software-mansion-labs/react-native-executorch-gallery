import type { SkImage } from '@shopify/react-native-skia';

export type ForegroundBumper = { x: number; y: number; radius: number };

const grid = 64;
const threshold = 0.12;

/** Finds the base of the largest foreground object standing on the playfield. */
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

  const bottom = Math.max(...biggest.map((cell) => Math.floor(cell / grid)));
  const base = biggest.filter((cell) => Math.floor(cell / grid) >= bottom - 4);
  const xCoordinates = base.map((cell) => cell % grid);
  const minX = Math.min(...xCoordinates);
  const maxX = Math.max(...xCoordinates);
  const radius = (maxX - minX + 1) / (2 * grid);
  const radiusY = (radius * Math.min(width, height)) / height;
  const front = (bottom + 1) / grid;
  if (radius < 0.035 || front > 0.79) return null;
  return { x: (minX + maxX + 1) / (2 * grid), y: front - radiusY, radius };
}
