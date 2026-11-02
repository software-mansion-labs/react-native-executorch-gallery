import {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { tokens } from '@/theme';

/**
 * Provides a subtle card compression on press and a damped return on release.
 * Returns the animated style and press handlers; also resets on cancelled presses.
 * Animation follows the system's Reduce Motion setting.
 */
export function useCardPressAnimation() {
  const scale = useSharedValue(tokens.motion.cardRestScale);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.get() }],
  }));

  const onPressIn = () => {
    scale.set(
      withTiming(tokens.motion.cardPressedScale, {
        duration: tokens.motion.cardPressDuration,
        reduceMotion: ReduceMotion.System,
      })
    );
  };

  const onPressOut = () => {
    scale.set(
      withSpring(tokens.motion.cardRestScale, {
        ...tokens.motion.cardReleaseSpring,
        reduceMotion: ReduceMotion.System,
      })
    );
  };

  return { animatedStyle, onPressIn, onPressOut };
}
