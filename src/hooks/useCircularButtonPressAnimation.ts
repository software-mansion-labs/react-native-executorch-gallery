import {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { tokens } from '@/theme';

/** Returns press handlers and a firm compression with soft dimming for circular controls, preserving disabled opacity and respecting Reduce Motion. */
export function useCircularButtonPressAnimation(disabled = false) {
  const progress = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: disabled ? 1 : 1 - (1 - tokens.motion.circularButtonPressedScale) * progress.get() },
    ],
    opacity: disabled
      ? tokens.opacity.disabled
      : 1 - (1 - tokens.motion.circularButtonPressedOpacity) * progress.get(),
  }));

  const onPressIn = () => {
    progress.set(
      withTiming(1, {
        duration: tokens.motion.circularButtonPressDuration,
        easing: Easing.out(Easing.cubic),
        reduceMotion: ReduceMotion.System,
      })
    );
  };
  const onPressOut = () => {
    progress.set(
      withTiming(0, {
        duration: tokens.motion.circularButtonReleaseDuration,
        easing: Easing.out(Easing.cubic),
        reduceMotion: ReduceMotion.System,
      })
    );
  };

  return { animatedStyle, onPressIn, onPressOut };
}
