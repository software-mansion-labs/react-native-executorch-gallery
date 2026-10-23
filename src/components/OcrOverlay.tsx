import { Pressable, StyleSheet } from 'react-native';
import { Canvas, Path } from '@shopify/react-native-skia';
import type { OcrDetection } from 'react-native-executorch';
import Animated, { Easing, FadeIn, ReduceMotion } from 'react-native-reanimated';

import type { ViewportTransform } from '@/components/PhotoPicker';
import { useOcrOverlay } from '@/hooks/useOcrOverlay';
import { tokens, useTheme } from '@/theme';

type OcrOverlayProps = {
  detections: OcrDetection[];
  transform: ViewportTransform;
  onSelect: (index: number) => void;
};

/** Thin text-region outlines; tapping a region opens its text in the shared result sheet. */
export function OcrOverlay({ detections, transform, onSelect }: OcrOverlayProps) {
  const { colors } = useTheme();
  const { paths, onPress } = useOcrOverlay(detections, transform, onSelect);
  if (!detections.length) return null;
  return (
    <Animated.View style={StyleSheet.absoluteFill} entering={entrance}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onPress} accessible={false}>
        <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
          {paths.map((path, index) => (
            <Path
              key={index}
              path={path}
              color={colors.accent}
              style="stroke"
              strokeWidth={1.25}
              strokeCap="round"
              strokeJoin="round"
            />
          ))}
        </Canvas>
      </Pressable>
    </Animated.View>
  );
}

const entrance = FadeIn.duration(tokens.motion.detectionFadeDuration)
  .easing(Easing.out(Easing.cubic))
  .reduceMotion(ReduceMotion.System);
