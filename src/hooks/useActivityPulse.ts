import { useAnimatedStyle } from 'react-native-reanimated';

import { useGeneratingPulse } from '@/hooks/useGeneratingPulse';
import { tokens } from '@/theme';

/** Pulses an active status on the UI thread; inactive and Reduce Motion states remain fully visible. */
export function useActivityPulse(active = true) {
  const { phase, reducedMotion } = useGeneratingPulse(active);
  return useAnimatedStyle(() => {
    const wave = (1 + Math.cos(phase.get() * Math.PI * 2)) / 2;
    return {
      opacity:
        !active || reducedMotion
          ? 1
          : tokens.motion.activityPulseOpacity + wave * (1 - tokens.motion.activityPulseOpacity),
    };
  });
}
