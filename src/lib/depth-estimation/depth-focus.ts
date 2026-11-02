import type { DepthMap } from 'react-native-executorch';

import { bufferToSkImage } from '@/lib/image';

/** Converts Depth Anything V3's positive relative depth into an inverse-depth texture; near surfaces are brighter. */
export function createDepthTexture(depth: DepthMap) {
  const { width, height, data } = depth;
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width <= 0 ||
    height <= 0 ||
    data.length !== width * height
  ) {
    throw new Error('The model returned an invalid depth map.');
  }
  const values = data.map((value) => (Number.isFinite(value) && value > 0 ? 1 / value : NaN));
  let min = Infinity;
  let max = -Infinity;
  for (const value of values) {
    if (!Number.isFinite(value)) continue;
    min = Math.min(min, value);
    max = Math.max(max, value);
  }
  if (!Number.isFinite(min)) throw new Error('The model returned no valid depth values.');
  const range = max - min;
  const pixels = new Uint8Array(width * height * 4);
  for (let i = 0; i < data.length; i++) {
    const value = values[i];
    const gray =
      range > 0 && Number.isFinite(value) ? Math.round(((value - min) / range) * 255) : 0;
    pixels[i * 4] = gray;
    pixels[i * 4 + 1] = gray;
    pixels[i * 4 + 2] = gray;
    pixels[i * 4 + 3] = 255;
  }
  const image = bufferToSkImage({ data: pixels, width, height, format: 'rgba', layout: 'hwc' });
  if (!image) throw new Error('Could not create the depth preview.');
  return image;
}
