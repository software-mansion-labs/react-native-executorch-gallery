import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import type { KeypointDetection } from 'react-native-executorch';
import type { ViewportTransform } from '@/components/PhotoPicker';
import { radius, spacing } from '@/theme';

export interface KeypointOverlayProps {
  /** Array of pose keypoint detections returned by the model. */
  detections: KeypointDetection<'xyxy', string>[];
  /** Geometric viewport transformation mapping pixel coordinates to screen bounds. */
  transform: ViewportTransform;
}

/** Standard 17-point COCO human skeletal connectivity pairs. */
const SKELETON_PAIRS: [string, string][] = [
  // Torso
  ['leftShoulder', 'rightShoulder'],
  ['leftShoulder', 'leftHip'],
  ['rightShoulder', 'rightHip'],
  ['leftHip', 'rightHip'],
  // Arms
  ['leftShoulder', 'leftElbow'],
  ['leftElbow', 'leftWrist'],
  ['rightShoulder', 'rightElbow'],
  ['rightElbow', 'rightWrist'],
  // Legs
  ['leftHip', 'leftKnee'],
  ['leftKnee', 'leftAnkle'],
  ['rightHip', 'rightKnee'],
  ['rightKnee', 'rightAnkle'],
  // Head
  ['nose', 'leftEye'],
  ['nose', 'rightEye'],
  ['leftEye', 'leftEar'],
  ['rightEye', 'rightEar'],
];

/**
 * High-performance hardware-accelerated pose skeleton and joint overlay.
 *
 * Batches all 17-joint skeletal bones and joint circles into a single unified
 * Skia GPU path draw call for instant 60fps rendering.
 *
 * @param props Keypoint detections and viewport transformation.
 * @returns Bounding box, connecting skeleton lines, and joint landmark circles.
 */
export function KeypointOverlay({ detections, transform }: KeypointOverlayProps) {
  const { scale, offsetX, offsetY } = transform;

  const { bonePath, jointOuterPath, jointInnerPath } = React.useMemo(() => {
    const bones = Skia.Path.Make();
    const outer = Skia.Path.Make();
    const inner = Skia.Path.Make();

    for (const det of detections) {
      for (const [fromName, toName] of SKELETON_PAIRS) {
        const p1 = det.landmarks[fromName];
        const p2 = det.landmarks[toName];
        if (!p1 || !p2 || (p1.confidence ?? 1) < 0.2 || (p2.confidence ?? 1) < 0.2) continue;
        const x1 = offsetX + p1.x * scale;
        const y1 = offsetY + p1.y * scale;
        const x2 = offsetX + p2.x * scale;
        const y2 = offsetY + p2.y * scale;
        bones.moveTo(x1, y1);
        bones.lineTo(x2, y2);
      }

      for (const pt of Object.values(det.landmarks)) {
        if ((pt.confidence ?? 1) < 0.2) continue;
        const cx = offsetX + pt.x * scale;
        const cy = offsetY + pt.y * scale;
        outer.addCircle(cx, cy, 4.5);
        inner.addCircle(cx, cy, 3);
      }
    }

    return { bonePath: bones, jointOuterPath: outer, jointInnerPath: inner };
  }, [detections, offsetX, offsetY, scale]);

  // Placed after every hook: bailing out earlier changes the hook count between
  // renders and throws once detections arrive.
  if (detections.length === 0) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Batched Skia Skeleton & Joints */}
      <Canvas style={StyleSheet.absoluteFill}>
        <Path
          path={bonePath}
          color="#2A47FF"
          style="stroke"
          strokeWidth={2}
          strokeCap="round"
          strokeJoin="round"
        />
        <Path path={jointOuterPath} color="#FFFFFF" style="fill" />
        <Path path={jointInnerPath} color="#2A47FF" style="fill" />
      </Canvas>

      {/* Person Bounding Boxes */}
      {detections.map((det, idx) => {
        const left = Math.round(offsetX + det.box.xmin * scale);
        const top = Math.round(offsetY + det.box.ymin * scale);
        const width = Math.round((det.box.xmax - det.box.xmin) * scale);
        const height = Math.round((det.box.ymax - det.box.ymin) * scale);
        const isNearTop = top < 24;

        return (
          <View
            key={idx}
            style={[
              styles.personBox,
              {
                left,
                top,
                width,
                height,
                borderColor: '#2A47FF',
                backgroundColor: 'rgba(42, 71, 255, 0.06)',
              },
            ]}
          >
            <View
              style={[
                styles.personTag,
                {
                  top: isNearTop ? 2 : -22,
                  left: isNearTop ? 2 : -1,
                },
              ]}
            >
              <Text style={styles.personTagText}>Person {Math.round(det.confidence * 100)}%</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  personBox: {
    position: 'absolute',
    borderWidth: 1.5,
    borderRadius: radius.xs,
  },
  personTag: {
    position: 'absolute',
    backgroundColor: '#2A47FF',
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: 4,
  },
  personTagText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
});
