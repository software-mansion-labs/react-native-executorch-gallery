import type { DimensionValue } from 'react-native';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { useGeneratingPulse } from '@/hooks/useGeneratingPulse';
import { tokens, useTheme, type Theme } from '@/theme';

/** A gently pulsing placeholder bar, with theme transitions and Reduce Motion support. */
export function WidgetSkeleton({
  width = '100%',
  variant = 'text',
  appearance,
}: {
  width?: DimensionValue;
  variant?: 'text' | 'control';
  appearance?: Theme['scheme'];
}) {
  const { colors } = useTheme(appearance);
  const { phase, reducedMotion } = useGeneratingPulse();
  const animation = useAnimatedStyle(() => ({
    opacity: reducedMotion
      ? tokens.opacity.subtle
      : tokens.opacity.disabled +
        ((1 - tokens.opacity.disabled) * (1 + Math.sin(phase.get() * Math.PI * 2))) / 2,
  }));
  return (
    <Animated.View
      accessible={false}
      style={[
        styles.line,
        styles[variant],
        {
          width,
          backgroundColor: colors.border,
          transitionProperty: 'backgroundColor',
          transitionDuration: reducedMotion ? 0 : tokens.motion.themeTransitionDuration,
        },
        animation,
      ]}
    />
  );
}
const styles = StyleSheet.create({
  line: { borderRadius: tokens.radius.pill },
  text: { height: tokens.typography.secondary.lineHeight },
  control: { height: tokens.layout.touchTarget, borderRadius: tokens.radius.annotation },
});
