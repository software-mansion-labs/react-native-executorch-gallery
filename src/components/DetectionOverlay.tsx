import { StyleSheet, View } from 'react-native';
import type { ObjectDetection } from 'react-native-executorch';

import { AppText } from '@/components/AppText';
import type { ViewportTransform } from '@/components/PhotoPicker';
import { tokens, useTheme } from '@/theme';

type DetectionOverlayProps = {
  detections: ObjectDetection<'xyxy', string>[];
  transform: ViewportTransform;
};

/** Maps source-pixel bounding boxes into the aspect-fit photo viewport. */
export function DetectionOverlay({ detections, transform }: DetectionOverlayProps) {
  const { colors } = useTheme();
  const { scale, offsetX, offsetY } = transform;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" accessible={false}>
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
              {detection.label} {Math.round(detection.confidence * 100)}%
            </AppText>
          </View>
        </View>
      ))}
    </View>
  );
}

const { spacing, radius } = tokens;
const styles = StyleSheet.create({
  box: { position: 'absolute', borderWidth: 2, borderRadius: radius.annotation },
  tag: {
    alignSelf: 'flex-start',
    borderBottomRightRadius: radius.annotation,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
  },
});
