import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeIn, ReduceMotion } from 'react-native-reanimated';

import { AppText } from '@/components/AppText';
import { OcrTextSheet } from '@/components/OcrTextSheet';
import { useCardPressAnimation } from '@/hooks/useCardPressAnimation';
import type { OcrPresentation } from '@/hooks/useOcrPresentation';
import { tokens, useTheme } from '@/theme';

/** Keeps a centered View text pill and timing below the photo, with a shared text sheet. */
export function OcrResult({
  presentation,
  latency,
}: {
  presentation: OcrPresentation;
  latency: number | null;
}) {
  const { colors } = useTheme();
  const { animatedStyle, onPressIn, onPressOut } = useCardPressAnimation();
  return (
    <>
      <View style={styles.area}>
        {presentation.results !== null && (
          <Animated.View style={styles.row} entering={entrance}>
            {presentation.results.length ? (
              <AnimatedPressable
                onPress={() => presentation.open()}
                onPressIn={onPressIn}
                onPressOut={onPressOut}
                accessibilityRole="button"
                accessibilityLabel="View recognized text"
                style={[styles.button, { backgroundColor: colors.surface }, animatedStyle]}
              >
                <AppText variant="secondary" numberOfLines={1}>
                  View text
                </AppText>
              </AnimatedPressable>
            ) : (
              <AppText variant="secondary" tone="muted">
                No text found
              </AppText>
            )}
            <AppText variant="caption" tone="muted" style={styles.latency} numberOfLines={1}>
              {latency != null ? `${latency} ms` : ' '}
            </AppText>
          </Animated.View>
        )}
      </View>
      <OcrTextSheet presentation={presentation} />
    </>
  );
}

const { spacing, layout, radius } = tokens;
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const entrance = FadeIn.duration(tokens.motion.photoRevealDuration)
  .easing(Easing.out(Easing.cubic))
  .reduceMotion(ReduceMotion.System);
const styles = StyleSheet.create({
  area: { minHeight: layout.touchTarget, justifyContent: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxxl,
  },
  button: {
    minHeight: layout.touchTarget,
    flexShrink: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  latency: { position: 'absolute', right: 0, textAlign: 'right' },
});
