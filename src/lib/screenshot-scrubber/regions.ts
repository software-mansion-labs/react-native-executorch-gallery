import type { OcrDetection } from 'react-native-executorch';

export type TextSpan = { charStart: number; charEnd: number; label: string };
export type ScrubberRegion = OcrDetection & {
  id: number;
  start: number;
  end: number;
  labels: string[];
  hidden: boolean;
};

/** Keeps exact UTF-16 offsets for every OCR region, including repeated text and line separators. */
export function indexRegions(detections: readonly OcrDetection[]) {
  let text = '';
  const regions = detections.map((detection, id): ScrubberRegion => {
    if (id) text += '\n';
    const start = text.length;
    text += detection.text;
    return { ...detection, id, start, end: text.length, labels: [], hidden: false };
  });
  return { text, regions };
}

/** Maps overlapping entity spans to whole image regions; never searches for the first matching string. */
export function markPrivateRegions(
  regions: readonly ScrubberRegion[],
  entities: readonly TextSpan[]
) {
  return regions.map((region) => {
    const labels = [
      ...new Set(
        entities
          .filter((entity) => entity.charStart < region.end && entity.charEnd > region.start)
          .map((entity) => entity.label)
      ),
    ];
    return { ...region, labels, hidden: labels.length > 0 };
  });
}

/** Conservative padded rectangles cover the full oriented OCR quad, clamped to source-image bounds. */
export function regionRect(region: Pick<OcrDetection, 'quad'>, width: number, height: number) {
  const padding = 3;
  const x = Math.max(0, Math.floor(Math.min(...region.quad.map((p) => p.x))) - padding);
  const y = Math.max(0, Math.floor(Math.min(...region.quad.map((p) => p.y))) - padding);
  const right = Math.min(width, Math.ceil(Math.max(...region.quad.map((p) => p.x))) + padding);
  const bottom = Math.min(height, Math.ceil(Math.max(...region.quad.map((p) => p.y))) + padding);
  return { x, y, width: Math.max(0, right - x), height: Math.max(0, bottom - y) };
}
