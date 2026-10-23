import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, AppState, Easing } from 'react-native';

import { tokens } from '@/theme';

type HomeHeroAnimationOptions = {
  headlineCount: number;
  paused?: boolean;
};

/**
 * Drives the logo shine and headline wipe from one native animation value.
 * The copy changes as the shine crosses the center of the mark. Pauses when home
 * loses focus, settings are open, the app backgrounds, or reduced motion is enabled.
 * Resumes interrupted sweeps without rewinding and stops after each headline has
 * appeared once. Returns the shared progress, logo position, and headline index.
 */
export function useHomeHeroAnimation({ headlineCount, paused = false }: HomeHeroAnimationOptions) {
  const [progress] = useState(() => new Animated.Value(0));
  const [headlineIndex, setHeadlineIndex] = useState(0);
  const lastProgress = useRef(0);
  const completedSweeps = useRef(0);

  // Observe progress without making the next sweep wait for a native getValue callback.
  useEffect(() => {
    const listener = progress.addListener(({ value }) => {
      lastProgress.current = value;
    });

    return () => progress.removeListener(listener);
  }, [progress]);

  // Reset after the next headline is committed, so the two text layers never flash.
  useLayoutEffect(() => {
    lastProgress.current = 0;
    progress.setValue(0);
  }, [headlineIndex, progress]);

  useFocusEffect(
    useCallback(() => {
      let disposed = false;
      let reducedMotion = true;
      let animation: Animated.CompositeAnimation | undefined;
      let timer: ReturnType<typeof setTimeout> | undefined;

      const canAnimate = () =>
        !disposed &&
        !paused &&
        !reducedMotion &&
        completedSweeps.current < headlineCount - 1 &&
        AppState.currentState === 'active';

      const stop = () => {
        clearTimeout(timer);
        animation?.stop();
      };

      const scheduleShine = (delay: number) => {
        timer = setTimeout(() => {
          if (!canAnimate()) return;

          animation = Animated.timing(progress, {
            toValue: 1,
            duration: tokens.motion.logoShineDuration * (1 - lastProgress.current),
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          });
          animation.start(({ finished }) => {
            if (!finished || disposed) return;

            completedSweeps.current += 1;
            setHeadlineIndex(completedSweeps.current);

            if (canAnimate()) {
              scheduleShine(
                tokens.motion.logoShineInterval -
                  tokens.motion.logoShineDuration +
                  Math.random() * tokens.motion.logoShineJitter
              );
            }
          });
        }, delay);
      };

      const update = () => {
        stop();

        if (!canAnimate()) return;

        scheduleShine(lastProgress.current > 0 ? 0 : tokens.motion.logoShineFirstDelay);
      };

      AccessibilityInfo.isReduceMotionEnabled()
        .then((enabled) => {
          reducedMotion = enabled;
          update();
        })
        .catch(() => update());

      const motionSubscription = AccessibilityInfo.addEventListener(
        'reduceMotionChanged',
        (enabled) => {
          reducedMotion = enabled;
          update();
        }
      );
      const appSubscription = AppState.addEventListener('change', update);

      return () => {
        disposed = true;
        stop();
        motionSubscription.remove();
        appSubscription.remove();
      };
    }, [headlineCount, paused, progress])
  );

  const shinePosition = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [tokens.logoShine.travelStart, tokens.logoShine.travelEnd],
  });
  return { shinePosition, headlineIndex, progress };
}
