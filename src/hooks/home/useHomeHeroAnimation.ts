import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, AppState, Easing } from 'react-native';

import { tokens } from '@/theme';

/**
 * Drives the logo shine and headline wipe from one native animation value.
 * Only the hidden headline layer changes after each sweep. Pauses when home
 * loses focus, the app backgrounds, or reduced motion is enabled.
 * Resumes interrupted sweeps without rewinding. Returns the shared progress,
 * logo position, and headline sequence index.
 */
export function useHomeHeroAnimation() {
  const [progress] = useState(() => new Animated.Value(0));
  const [headlineIndex, setHeadlineIndex] = useState(0);
  const [headlineProgress] = useState(
    () => [new Animated.Value(1), new Animated.Value(0)] as const
  );
  const activeSlot = useRef(0);
  const lastProgress = useRef(0);

  // Observe progress without making the next sweep wait for a native getValue callback.
  useEffect(() => {
    const listener = progress.addListener(({ value }) => {
      lastProgress.current = value;
    });

    return () => progress.removeListener(listener);
  }, [progress]);

  useFocusEffect(
    useCallback(() => {
      let disposed = false;
      let reducedMotion = true;
      let animation: Animated.CompositeAnimation | undefined;
      let timer: ReturnType<typeof setTimeout> | undefined;

      const canAnimate = () => !disposed && !reducedMotion && AppState.currentState === 'active';

      const stop = () => {
        clearTimeout(timer);
        animation?.stop();
      };

      const scheduleShine = (delay: number) => {
        timer = setTimeout(() => {
          if (!canAnimate()) return;

          const outgoing = activeSlot.current;
          const incoming = 1 - outgoing;
          const timing = {
            duration: tokens.motion.logoShineDuration * (1 - lastProgress.current),
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          };
          animation = Animated.parallel([
            Animated.timing(progress, { ...timing, toValue: 1 }),
            Animated.timing(headlineProgress[outgoing], { ...timing, toValue: 2 }),
            Animated.timing(headlineProgress[incoming], { ...timing, toValue: 1 }),
          ]);
          animation.start(({ finished }) => {
            if (!finished || disposed) return;

            // Both endpoints are transparent. Recycle only the hidden layer;
            // the visible layer keeps its text and native transform untouched.
            headlineProgress[outgoing].setValue(0);
            activeSlot.current = incoming;
            lastProgress.current = 0;
            progress.setValue(0);
            setHeadlineIndex((index) => index + 1);

            if (canAnimate()) {
              scheduleShine(tokens.motion.logoShineInterval - tokens.motion.logoShineDuration);
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
    }, [headlineProgress, progress])
  );

  const shinePosition = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [tokens.logoShine.travelStart, tokens.logoShine.travelEnd],
  });
  return { shinePosition, headlineIndex, headlineProgress };
}
