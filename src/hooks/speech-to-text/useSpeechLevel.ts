import { useCallback, useEffect } from 'react';
import { useSharedValue, withTiming } from 'react-native-reanimated';

import { tokens } from '@/theme';

/** Smooths the microphone's PCM energy for the UI-thread listening indicator; resets when capture stops. */
export function useSpeechLevel(active: boolean) {
  const level = useSharedValue(0);
  useEffect(() => {
    if (!active) level.set(withTiming(0, { duration: tokens.motion.speechLevelDuration }));
  }, [active, level]);
  const updateLevel = useCallback(
    (samples: Float32Array) => {
      let energy = 0;
      for (const sample of samples) energy += sample * sample;
      const rms = Math.sqrt(energy / Math.max(1, samples.length));
      level.set(
        withTiming(Math.min(1, rms * tokens.layout.speechLevelGain), {
          duration: tokens.motion.speechLevelDuration,
        })
      );
    },
    [level]
  );
  return { level, updateLevel };
}
