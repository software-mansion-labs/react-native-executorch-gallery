import { StyleSheet, View } from 'react-native';
import { Canvas, Path } from '@shopify/react-native-skia';
import type { CocoLandmark, KeypointDetection } from 'react-native-executorch';
import Animated, { Easing, FadeIn, ReduceMotion } from 'react-native-reanimated';

import { AppText } from '@/components/AppText';
import type { ViewportTransform } from '@/components/PhotoPicker';
import { usePosePaths } from '@/hooks/keypoint-detection/usePosePaths';
import { tokens, useTheme } from '@/theme';

type KeypointOverlayProps = {
  detections: KeypointDetection<'xyxy', CocoLandmark>[];
  transform: ViewportTransform;
};

/** Draws the legacy COCO skeleton and outlined joints with person boxes and confidence tags. */
export function KeypointOverlay({ detections, transform }: KeypointOverlayProps) {
  const { colors } = useTheme();
  const { bonePath, jointOuterPath, jointInnerPath } = usePosePaths(detections, transform);
  const { scale, offsetX, offsetY } = transform;
  if (!detections.length) return null;

  return (
    <Animated.View
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      accessible={false}
      entering={overlayEntrance}
    >
      <Canvas style={StyleSheet.absoluteFill}>
        <Path
          path={bonePath}
          color={colors.accent}
          style="stroke"
          strokeWidth={2}
          strokeCap="round"
          strokeJoin="round"
        />
        <Path path={jointOuterPath} color={tokens.annotation.text} style="fill" />
        <Path path={jointInnerPath} color={colors.accent} style="fill" />
      </Canvas>
      {detections.map((detection, index) => (
        <View
          key={index}
          style={[
            styles.box,
            {
              left: offsetX + detection.box.xmin * scale,
              top: offsetY + detection.box.ymin * scale,
              width: (detection.box.xmax - detection.box.xmin) * scale,
              height: (detection.box.ymax - detection.box.ymin) * scale,
              borderColor: colors.accent,
            },
          ]}
        >
          <View style={[styles.tag, { backgroundColor: colors.accent }]}>
            <AppText variant="caption" style={{ color: colors.onAccent }} numberOfLines={1}>
              Person {Math.round(detection.confidence * 100)}%
            </AppText>
          </View>
        </View>
      ))}
    </Animated.View>
  );
}

const { spacing, radius } = tokens;
const overlayEntrance = FadeIn.duration(tokens.motion.detectionFadeDuration)
  .easing(Easing.out(Easing.cubic))
  .reduceMotion(ReduceMotion.System);
const styles = StyleSheet.create({
  box: { position: 'absolute', borderWidth: 2, borderRadius: radius.annotation },
  tag: {
    alignSelf: 'flex-start',
    borderBottomRightRadius: radius.annotation,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
  },
});
