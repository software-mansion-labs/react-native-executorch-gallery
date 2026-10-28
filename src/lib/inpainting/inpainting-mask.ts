import { PaintStyle, Skia, StrokeCap, StrokeJoin } from '@shopify/react-native-skia';
import type { MaskBuffer } from 'react-native-executorch';

import { skImageToBuffer } from '@/lib/image';

export type MaskPoint = { x: number; y: number };
export type MaskStroke = { points: readonly MaskPoint[]; width: number };

/** Builds a round brush path in image coordinates; a tap is rendered as a dot. */
export function maskStrokePath(stroke: MaskStroke) {
  const path = Skia.PathBuilder.Make();
  const first = stroke.points[0];
  if (!first) return path.build();
  if (stroke.points.length === 1) {
    path.addCircle(first.x, first.y, stroke.width / 2);
  } else {
    path.moveTo(first.x, first.y);
    for (const point of stroke.points.slice(1)) path.lineTo(point.x, point.y);
  }
  return path.build();
}

/** Rasterizes image-space strokes to the library's grayscale mask: 255 removes, 0 preserves. */
export function rasterizeInpaintingMask(
  strokes: readonly MaskStroke[],
  width: number,
  height: number
): MaskBuffer {
  const surface = Skia.Surface.MakeOffscreen(width, height);
  if (!surface) throw new Error('Could not create the brush mask.');
  const paint = Skia.Paint();
  let snapshot;
  try {
    const canvas = surface.getCanvas();
    canvas.clear(Skia.Color('black'));
    paint.setColor(Skia.Color('white'));
    paint.setStrokeCap(StrokeCap.Round);
    paint.setStrokeJoin(StrokeJoin.Round);
    paint.setAntiAlias(false);
    for (const stroke of strokes) {
      const path = maskStrokePath(stroke);
      paint.setStrokeWidth(stroke.width);
      paint.setStyle(stroke.points.length === 1 ? PaintStyle.Fill : PaintStyle.Stroke);
      canvas.drawPath(path, paint);
      path.dispose();
    }
    surface.flush();
    snapshot = surface.makeImageSnapshot();
    const rgba = skImageToBuffer(snapshot);
    const data = new Uint8Array(width * height);
    for (let index = 0; index < data.length; index++) data[index] = rgba.data[index * 4];
    return { data, width, height, format: 'gray', layout: 'hwc' };
  } finally {
    snapshot?.dispose();
    paint.dispose();
    surface.dispose();
  }
}
