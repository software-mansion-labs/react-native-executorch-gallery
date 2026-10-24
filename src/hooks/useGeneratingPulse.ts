import { useEffect } from 'react';
import {
  cancelAnimation,
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { tokens } from '@/theme';

/** Gently breathes an active generation icon, resets on completion, and respects Reduce Motion. */
export function useGeneratingPulse(active: boolean) {
  const phase = useSharedValue(0);
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    phase.set(0);
    if (active && !reducedMotion) {
      phase.set(
        withRepeat(
          withTiming(1, {
            duration: tokens.motion.generatingPulseDuration,
            easing: Easing.inOut(Easing.sin),
            reduceMotion: ReduceMotion.System,
          }),
          -1,
          true,
          undefined,
          ReduceMotion.System
        )
      );
    }
    return () => cancelAnimation(phase);
  }, [active, reducedMotion, phase]);
  return useAnimatedStyle(() => ({
    opacity: 1 - phase.get() * (1 - tokens.motion.generatingPulseOpacity),
    transform: [{ scale: 1 - phase.get() * (1 - tokens.motion.generatingPulseScale) }],
  }));
}
