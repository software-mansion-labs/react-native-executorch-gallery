import { useMemo } from 'react';
import { Skia } from '@shopify/react-native-skia';
import type { CocoLandmark, KeypointDetection } from 'react-native-executorch';

import type { ViewportTransform } from '@/components/PhotoPicker';

/** Standard COCO body connections, matching the legacy pose overlay. */
const SKELETON_PAIRS: readonly (readonly [CocoLandmark, CocoLandmark])[] = [
  ['leftShoulder', 'rightShoulder'],
  ['leftShoulder', 'leftHip'],
  ['rightShoulder', 'rightHip'],
  ['leftHip', 'rightHip'],
  ['leftShoulder', 'leftElbow'],
  ['leftElbow', 'leftWrist'],
  ['rightShoulder', 'rightElbow'],
  ['rightElbow', 'rightWrist'],
  ['leftHip', 'leftKnee'],
  ['leftKnee', 'leftAnkle'],
  ['rightHip', 'rightKnee'],
  ['rightKnee', 'rightAnkle'],
  ['nose', 'leftEye'],
  ['nose', 'rightEye'],
  ['leftEye', 'leftEar'],
  ['rightEye', 'rightEar'],
];

/**
 * Maps pose detections through the photo's aspect-fit transform into batched Skia paths.
 * Returns skeleton lines and outlined joint circles, excluding landmarks below the
 * legacy confidence threshold of 0.2. Paths update only when results or layout change.
 */
export function usePosePaths(
  detections: KeypointDetection<'xyxy', CocoLandmark>[],
  { scale, offsetX, offsetY }: ViewportTransform
) {
  return useMemo(() => {
    const bones = Skia.PathBuilder.Make();
    const outer = Skia.PathBuilder.Make();
    const inner = Skia.PathBuilder.Make();

    for (const detection of detections) {
      for (const [fromName, toName] of SKELETON_PAIRS) {
        const from = detection.landmarks[fromName];
        const to = detection.landmarks[toName];
        if (!from || !to || (from.confidence ?? 1) < 0.2 || (to.confidence ?? 1) < 0.2) continue;
        bones.moveTo(offsetX + from.x * scale, offsetY + from.y * scale);
        bones.lineTo(offsetX + to.x * scale, offsetY + to.y * scale);
      }
      for (const point of Object.values(detection.landmarks)) {
        if ((point.confidence ?? 1) < 0.2) continue;
        const x = offsetX + point.x * scale;
        const y = offsetY + point.y * scale;
        outer.addCircle(x, y, 4.5);
        inner.addCircle(x, y, 3);
      }
    }

    return {
      bonePath: bones.build(),
      jointOuterPath: outer.build(),
      jointInnerPath: inner.build(),
    };
  }, [detections, scale, offsetX, offsetY]);
}
