import { useMemo } from 'react';
import { Skia } from '@shopify/react-native-skia';
import type { GestureResponderEvent } from 'react-native';
import type { OcrDetection } from 'react-native-executorch';
import type { ViewportTransform } from '@/components/PhotoPicker';

/**
 * Maps original-resolution OCR quadrilaterals into the photo viewport and tests taps
 * against their exact polygons. Returns Skia paths and a handler selecting the nearest
 * containing region when polygons overlap, matching the legacy overlay's hit testing.
 */
export function useOcrOverlay(
  detections: OcrDetection[],
  transform: ViewportTransform,
  onSelect: (index: number) => void
) {
  const polygons = useMemo(
    () =>
      detections.map((detection) =>
        detection.quad.map((point) => ({
          x: transform.offsetX + point.x * transform.scale,
          y: transform.offsetY + point.y * transform.scale,
        }))
      ),
    [detections, transform.scale, transform.offsetX, transform.offsetY]
  );
  const paths = useMemo(
    () =>
      polygons.map((points) => {
        const builder = Skia.PathBuilder.Make();
        points.forEach((point, index) =>
          index === 0 ? builder.moveTo(point.x, point.y) : builder.lineTo(point.x, point.y)
        );
        builder.close();
        return builder.build();
      }),
    [polygons]
  );
  const onPress = (event: GestureResponderEvent) => {
    const { locationX: x, locationY: y } = event.nativeEvent;
    let selected: number | null = null;
    let nearest = Infinity;
    polygons.forEach((points, index) => {
      let inside = false;
      for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        const a = points[i];
        const b = points[j];
        if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x)
          inside = !inside;
      }
      if (!inside) return;
      const centerX = points.reduce((sum, p) => sum + p.x, 0) / points.length;
      const centerY = points.reduce((sum, p) => sum + p.y, 0) / points.length;
      const distance = Math.hypot(x - centerX, y - centerY);
      if (distance < nearest) {
        nearest = distance;
        selected = index;
      }
    });
    if (selected !== null) onSelect(selected);
  };
  return { paths, onPress };
}
