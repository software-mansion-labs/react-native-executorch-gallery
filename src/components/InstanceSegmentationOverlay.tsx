import { StyleSheet, View } from 'react-native';
import { BlendColor, Canvas, Image as SkiaImage } from '@shopify/react-native-skia';
import type { InstanceSegmentationResult } from 'react-native-executorch';
import Animated, { Easing, FadeIn, ReduceMotion } from 'react-native-reanimated';

import { AppText } from '@/components/AppText';
import type { ViewportTransform } from '@/components/PhotoPicker';
import { useInstanceMasks } from '@/hooks/useInstanceMasks';
import { tokens } from '@/theme';

type InstanceSegmentationOverlayProps = {
  instances: InstanceSegmentationResult<'xyxy', string>[];
  imageWidth: number;
  imageHeight: number;
  transform: ViewportTransform;
};

/** Renders the legacy full-photo Alpha_8 masks with per-instance tint, boxes, and labels. */
export function InstanceSegmentationOverlay({
  instances,
  imageWidth,
  imageHeight,
  transform,
}: InstanceSegmentationOverlayProps) {
  const maskImages = useInstanceMasks(instances);
  const { scale, offsetX, offsetY } = transform;
  if (!instances.length || !imageWidth || !imageHeight) return null;

  return (
    <Animated.View
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      accessible={false}
      entering={overlayEntrance}
    >
      <Canvas style={StyleSheet.absoluteFill}>
        {maskImages.map((mask, index) =>
          mask ? (
            <SkiaImage
              key={index}
              image={mask}
              fit="fill"
              x={offsetX}
              y={offsetY}
              width={imageWidth * scale}
              height={imageHeight * scale}
            >
              <BlendColor
                color={annotation.colors[index % annotation.colors.length].fill}
                mode="srcIn"
              />
            </SkiaImage>
          ) : null
        )}
      </Canvas>
      {instances.map((instance, index) => {
        const color = annotation.colors[index % annotation.colors.length].stroke;
        return (
          <View
            key={index}
            style={[
              styles.box,
              {
                left: offsetX + instance.box.xmin * scale,
                top: offsetY + instance.box.ymin * scale,
                width: (instance.box.xmax - instance.box.xmin) * scale,
                height: (instance.box.ymax - instance.box.ymin) * scale,
                borderColor: color,
              },
            ]}
          >
            <View style={[styles.tag, { backgroundColor: color }]}>
              <AppText variant="caption" style={{ color: annotation.text }} numberOfLines={1}>
                {instance.label} {Math.round(instance.confidence * 100)}%
              </AppText>
            </View>
          </View>
        );
      })}
    </Animated.View>
  );
}

const { spacing, radius, annotation } = tokens;
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
