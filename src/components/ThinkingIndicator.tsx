import { memo, useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { tokens, useTheme } from '@/theme';

function Dot({
  phase,
  index,
  color,
}: {
  phase: SharedValue<number>;
  index: number;
  color: string;
}) {
  const angle = -Math.PI / 2 + (index * Math.PI * 2) / 3;
  const animation = useAnimatedStyle(() => {
    const oscillation = Math.sin(phase.get() * Math.PI * 2);
    const orbit = tokens.layout.thinkingOrbitRadius + oscillation * tokens.layout.thinkingDotTravel;
    return {
      transform: [{ translateX: Math.cos(angle) * orbit }, { translateY: Math.sin(angle) * orbit }],
    };
  });
  return <Animated.View style={[styles.dot, { backgroundColor: color }, animation]} />;
}

/** Three theme-aware dots rotate as an equilateral triangle and gently breathe in and out. */
export const ThinkingIndicator = memo(function ThinkingIndicator() {
  const { colors } = useTheme();
  const phase = useSharedValue(0);
  const rotation = useSharedValue(0);
  useEffect(() => {
    phase.set(
      withRepeat(
        withTiming(1, { duration: tokens.motion.thinkingPulseDuration, easing: Easing.linear }),
        -1,
        false,
        undefined,
        ReduceMotion.System
      )
    );
    rotation.set(
      withRepeat(
        withTiming(360, { duration: tokens.motion.thinkingSpinDuration, easing: Easing.linear }),
        -1,
        false,
        undefined,
        ReduceMotion.System
      )
    );
    return () => {
      cancelAnimation(phase);
      cancelAnimation(rotation);
    };
  }, [phase, rotation]);
  const spin = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.get()}deg` }] }));
  return (
    <Animated.View style={[styles.triangle, spin]} accessible={false}>
      {[0, 1, 2].map((index) => (
        <Dot key={index} phase={phase} index={index} color={colors.thinkingIndicator} />
      ))}
    </Animated.View>
  );
});

const { layout, radius } = tokens;
const styles = StyleSheet.create({
  triangle: { width: layout.thinkingIndicatorSize, height: layout.thinkingIndicatorSize },
  dot: {
    position: 'absolute',
    top: (layout.thinkingIndicatorSize - layout.thinkingDotSize) / 2,
    left: (layout.thinkingIndicatorSize - layout.thinkingDotSize) / 2,
    width: layout.thinkingDotSize,
    height: layout.thinkingDotSize,
    borderRadius: radius.pill,
  },
});
