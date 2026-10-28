import { useState } from 'react';
import { Keyboard, Pressable, StyleSheet } from 'react-native';
import { Canvas, Image as SkiaImage, type SkImage } from '@shopify/react-native-skia';
import Animated, { Easing, FadeIn, ReduceMotion } from 'react-native-reanimated';

import { tokens, useTheme } from '@/theme';

/** Displays generated RGBA output in a full-width square Skia canvas; tapping dismisses the keyboard. */
export function GeneratedImageViewport({ image }: { image: SkImage }) {
  const { colors } = useTheme();
  const [size, setSize] = useState({ width: 0, height: 0 });
  return (
    <Animated.View style={styles.root} entering={entrance}>
      <Pressable
        style={[styles.viewport, { backgroundColor: colors.surface }]}
        onPress={Keyboard.dismiss}
        onLayout={({ nativeEvent: { layout } }) =>
          setSize({ width: layout.width, height: layout.height })
        }
        accessible
        accessibilityLabel="Generated image"
        accessibilityHint="Tap to dismiss the keyboard"
      >
        {size.width > 0 && size.height > 0 && (
          <Canvas style={StyleSheet.absoluteFill}>
            <SkiaImage
              image={image}
              fit="contain"
              x={0}
              y={0}
              width={size.width}
              height={size.height}
            />
          </Canvas>
        )}
      </Pressable>
    </Animated.View>
  );
}
const entrance = FadeIn.duration(tokens.motion.photoRevealDuration)
  .easing(Easing.out(Easing.cubic))
  .reduceMotion(ReduceMotion.System);
const styles = StyleSheet.create({
  root: { width: '100%', aspectRatio: 1, flexShrink: 0 },
  viewport: { flex: 1, borderRadius: tokens.radius.card, overflow: 'hidden' },
});
