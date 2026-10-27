import { useCallback } from 'react';

import { useTaskState } from '@/hooks/useTaskState';
import { type MaskPoint, type MaskStroke, rasterizeInpaintingMask } from '@/lib/inpainting-mask';

/**
 * Keeps editable brush strokes in image pixels, resets them with the model revision,
 * and exposes stroke editing and grayscale mask creation for an inpainting screen.
 */
export function useInpaintingMask(revision: number) {
  const [strokes, setStrokes] = useTaskState<readonly MaskStroke[]>([], revision);
  const start = useCallback(
    (point: MaskPoint, width: number) =>
      setStrokes((previous) => [...previous, { points: [point], width }]),
    [setStrokes]
  );
  const extend = useCallback(
    (point: MaskPoint) =>
      setStrokes((previous) => {
        const last = previous.at(-1);
        return last
          ? [...previous.slice(0, -1), { ...last, points: [...last.points, point] }]
          : previous;
      }),
    [setStrokes]
  );
  return {
    strokes,
    start,
    extend,
    clear: () => setStrokes([]),
    undo: () => setStrokes((previous) => previous.slice(0, -1)),
    create: (width: number, height: number) => rasterizeInpaintingMask(strokes, width, height),
  };
}
