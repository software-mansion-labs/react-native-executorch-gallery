import { useEffect, useMemo } from 'react';
import { Skia } from '@shopify/react-native-skia';
import {
  useDerivedValue,
  useFrameCallback,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { omniOrbRadius, omniOrbShape } from '@/lib/omni/orbShader';
import { tokens, useTheme } from '@/theme';

/** Drives smooth UI-thread orb motion and matching touch geometry; pauses while hidden and respects Reduce Motion. */
export function useOmniOrbAnimation({
  recording,
  generating,
  playing,
  mounted,
}: {
  recording: boolean;
  generating: boolean;
  playing: boolean;
  mounted: boolean;
}) {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const time = useSharedValue(0);
  const activity = useSharedValue(0);
  const swirl = useSharedValue(0);
  useEffect(() => {
    const duration = reducedMotion ? 0 : tokens.motion.orbStateDuration;
    activity.set(withTiming(recording || playing || generating ? 1 : 0, { duration }));
    swirl.set(withTiming(generating && !playing ? 1 : recording ? 0.35 : 0, { duration }));
  }, [recording, playing, generating, reducedMotion, activity, swirl]);
  useFrameCallback((frame) => {
    if (!reducedMotion && mounted) {
      // Advance on every display frame, without discarding fractional intervals.
      const seconds = (frame.timeSincePreviousFrame ?? 0) / 1000;
      time.set(time.get() + seconds * (1.25 + activity.get()));
    }
  });
  const palette = useMemo(
    () => ({
      deep: Array.from(Skia.Color(colors.orbDeep)),
      mist: Array.from(Skia.Color(colors.orbMist)),
      cloud: Array.from(Skia.Color(colors.orbCloud)),
    }),
    [colors.orbDeep, colors.orbMist, colors.orbCloud]
  );
  const uniforms = useDerivedValue(() => ({
    size: tokens.layout.voiceOrbSize,
    time: time.get(),
    swirl: swirl.get(),
    ...omniOrbShape(time.get(), activity.get()),
    ...palette,
  }));
  const contains = (x: number, y: number) => {
    const radius = omniOrbRadius(Math.atan2(y, x), time.get(), activity.get());
    return x * x + y * y <= radius * radius;
  };
  return { uniforms, contains };
}
