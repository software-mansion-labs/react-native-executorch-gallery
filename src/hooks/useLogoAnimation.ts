import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { AccessibilityInfo, Animated, AppState, Easing } from 'react-native';

import { tokens } from '@/theme';

/**
 * Occasionally sweeps a horizontal highlight across the logo shape.
 * Returns the animated position of the shine band. Animation pauses when
 * the home screen loses focus, the app backgrounds, or reduced motion is enabled.
 */
export function useLogoAnimation() {
  const [shinePosition] = useState(() => new Animated.Value(tokens.logoShine.travelStart));

  useFocusEffect(
    useCallback(() => {
      let disposed = false;
      let reducedMotion = true;
      let animation: Animated.CompositeAnimation | undefined;
      let timer: ReturnType<typeof setTimeout> | undefined;

      const stop = () => {
        clearTimeout(timer);
        animation?.stop();
        shinePosition.setValue(tokens.logoShine.travelStart);
      };

      const scheduleShine = (delay: number) => {
        timer = setTimeout(() => {
          if (disposed || reducedMotion || AppState.currentState !== 'active') return;

          shinePosition.setValue(tokens.logoShine.travelStart);
          animation = Animated.timing(shinePosition, {
            toValue: tokens.logoShine.travelEnd,
            duration: tokens.motion.logoShineDuration,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          });
          animation.start(({ finished }) => {
            if (!finished || disposed) return;

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
    }, [shinePosition])
  );

  return { shinePosition };
}
