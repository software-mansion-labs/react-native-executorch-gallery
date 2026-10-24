import { useEffect } from 'react';
import {
  cancelAnimation,
  Easing,
  ReduceMotion,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { tokens } from '@/theme';

/** Returns a repeating UI-thread phase for staggered activity dots and the Reduce Motion preference. */
export function useGeneratingPulse() {
  const phase = useSharedValue(0);
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    if (reducedMotion) return;
    phase.set(
      withRepeat(
        withTiming(1, {
          duration: tokens.motion.generatingPulseDuration,
          easing: Easing.linear,
          reduceMotion: ReduceMotion.System,
        }),
        -1,
        false,
        undefined,
        ReduceMotion.System
      )
    );
    return () => cancelAnimation(phase);
  }, [reducedMotion, phase]);
  return { phase, reducedMotion };
}
