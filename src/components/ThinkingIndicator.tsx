import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { useGeneratingPulse } from '@/hooks/useGeneratingPulse';
import { tokens, useTheme } from '@/theme';

function Dot({
  phase,
  index,
  color,
  reducedMotion,
}: {
  phase: SharedValue<number>;
  index: number;
  color: string;
  reducedMotion: boolean;
}) {
  const animation = useAnimatedStyle(() => {
    const wave = (1 + Math.cos((phase.get() - index / 3) * Math.PI * 2)) / 2;
    return {
      opacity: reducedMotion
        ? 1
        : tokens.motion.generatingPulseOpacity + wave * (1 - tokens.motion.generatingPulseOpacity),
      transform: [{ translateY: reducedMotion ? 0 : -wave * tokens.layout.thinkingDotTravel }],
    };
  });
  return <Animated.View style={[styles.dot, { backgroundColor: color }, animation]} />;
}

/** Three monochrome dots gently rise and fade beneath the bubble throughout generation. */
export const ThinkingIndicator = memo(function ThinkingIndicator({
  accessibilityLabel = 'Generating response',
}: {
  accessibilityLabel?: string;
}) {
  const { colors } = useTheme();
  const { phase, reducedMotion } = useGeneratingPulse();
  return (
    <View
      style={styles.row}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ busy: true }}
    >
      {[0, 1, 2].map((index) => (
        <Dot
          key={index}
          index={index}
          phase={phase}
          reducedMotion={reducedMotion}
          color={colors.thinkingIndicator}
        />
      ))}
    </View>
  );
});

const { layout, spacing, radius } = tokens;
const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    height: layout.thinkingIndicatorSize,
  },
  dot: { width: layout.thinkingDotSize, height: layout.thinkingDotSize, borderRadius: radius.pill },
});
