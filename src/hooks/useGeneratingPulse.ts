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

/** Returns a repeating UI-thread phase for activity indicators and the Reduce Motion preference. */
export function useGeneratingPulse(enabled = true) {
  const phase = useSharedValue(0);
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    if (reducedMotion || !enabled) return;
    phase.set(0);
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
  }, [enabled, reducedMotion, phase]);
  return { phase, reducedMotion };
}
