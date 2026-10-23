import { useFocusEffect } from 'expo-router';
import { useCallback, useLayoutEffect, useState } from 'react';
import { AccessibilityInfo, Animated, AppState, Easing } from 'react-native';

import { tokens } from '@/theme';

/**
 * Drives the logo shine and headline wipe from one native animation value.
 * The copy changes as the shine crosses the center of the mark. Pauses when home
 * loses focus, the app backgrounds, or reduced motion is enabled.
 */
export function useHomeHeroAnimation() {
  const [progress] = useState(() => new Animated.Value(0));
  const [headlineIndex, setHeadlineIndex] = useState(0);

  // Reset after the next headline is committed, so the two text layers never flash.
  useLayoutEffect(() => {
    progress.setValue(0);
  }, [headlineIndex, progress]);

  useFocusEffect(
    useCallback(() => {
      let disposed = false;
      let reducedMotion = true;
      let animation: Animated.CompositeAnimation | undefined;
      let timer: ReturnType<typeof setTimeout> | undefined;

      const stop = () => {
        clearTimeout(timer);
        animation?.stop();
        progress.setValue(0);
      };

      const scheduleShine = (delay: number) => {
        timer = setTimeout(() => {
          if (disposed || reducedMotion || AppState.currentState !== 'active') return;

          progress.setValue(0);
          animation = Animated.timing(progress, {
            toValue: 1,
            duration: tokens.motion.logoShineDuration,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          });
          animation.start(({ finished }) => {
            if (!finished || disposed) return;

            setHeadlineIndex((index) => index + 1);
            scheduleShine(
              tokens.motion.logoShineInterval + Math.random() * tokens.motion.logoShineJitter
            );
          });
        }, delay);
      };

      const update = () => {
        stop();

        if (disposed) return;

        if (reducedMotion || AppState.currentState !== 'active') return;
        scheduleShine(tokens.motion.logoShineFirstDelay);
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
    }, [progress])
  );

  const shinePosition = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [tokens.logoShine.travelStart, tokens.logoShine.travelEnd],
  });
  return { shinePosition, headlineIndex, progress };
}
