import { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Canvas, Group, Path } from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSharedValue } from 'react-native-reanimated';

import type { ViewportTransform } from '@/components/PhotoPicker';
import type { useInpaintingMask } from '@/hooks/inpainting/useInpaintingMask';
import { maskStrokePath } from '@/lib/inpainting/inpainting-mask';
import { tokens, useTheme } from '@/theme';

/** Touch-enabled paint layer whose preview and exported mask share image-space coordinates. */
export function InpaintingCanvas({
  width,
  height,
  transform,
  mask,
  enabled,
}: {
  width: number;
  height: number;
  transform: ViewportTransform;
  mask: ReturnType<typeof useInpaintingMask>;
  enabled: boolean;
}) {
  const { colors } = useTheme();
  const { scale, offsetX, offsetY } = transform;
  const { start, extend, strokes } = mask;
  const drawing = useSharedValue(false);
  const begin = useCallback(
    ({ x, y }: { x: number; y: number }) => {
      const point = { x: (x - offsetX) / scale, y: (y - offsetY) / scale };
      const inside = point.x >= 0 && point.x <= width && point.y >= 0 && point.y <= height;
      drawing.set(inside);
      if (inside) start(point, tokens.layout.inpaintingBrushSize / scale);
    },
    [offsetX, offsetY, scale, width, height, start, drawing]
  );
  const update = useCallback(
    ({ x, y }: { x: number; y: number }) => {
      if (!drawing.get()) return;
      extend({
        x: Math.max(0, Math.min(width, (x - offsetX) / scale)),
        y: Math.max(0, Math.min(height, (y - offsetY) / scale)),
      });
    },
    [extend, offsetX, offsetY, scale, width, height, drawing]
  );
  const finish = useCallback(() => {
    drawing.set(false);
  }, [drawing]);
  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(enabled)
        .minDistance(0)
        .runOnJS(true)
        .onBegin(begin)
        .onUpdate(update)
        .onFinalize(finish),
    [enabled, begin, update, finish]
  );
  const paths = useMemo(
    () => strokes.map((stroke) => ({ stroke, path: maskStrokePath(stroke) })),
    [strokes]
  );
  return (
    <GestureDetector gesture={gesture}>
      <View style={StyleSheet.absoluteFill} accessibilityLabel="Paint over the area to remove">
        <Canvas style={StyleSheet.absoluteFill}>
          <Group
            transform={[{ translateX: offsetX }, { translateY: offsetY }, { scale }]}
            clip={{ x: 0, y: 0, width, height }}
            opacity={tokens.opacity.pressed}
          >
            {paths.map(({ stroke, path }, index) => (
              <Path
                key={index}
                path={path}
                style={stroke.points.length === 1 ? 'fill' : 'stroke'}
                strokeWidth={stroke.width}
                strokeCap="round"
                strokeJoin="round"
                color={colors.accent}
              />
            ))}
          </Group>
        </Canvas>
      </View>
    </GestureDetector>
  );
}
