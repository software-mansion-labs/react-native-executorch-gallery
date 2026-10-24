import { useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { tokens } from '@/theme';

/**
 * Slides only the sheet while fading a stationary backdrop. Receives the final
 * close callback and returns styles and native modal/layout handlers. Keeps the
 * modal mounted until dismissal finishes and respects system Reduce Motion.
 */
export function useBottomSheetAnimation(onClose: () => void) {
  const { height } = useWindowDimensions();
  const sheetHeight = useSharedValue(height);
  const progress = useSharedValue(1);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: progress.get() * sheetHeight.get() }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: 1 - progress.get(),
  }));

  const onLayout = (event: LayoutChangeEvent) => {
    sheetHeight.set(event.nativeEvent.layout.height);
  };

  const onShow = () => {
    progress.set(
      withTiming(0, {
        duration: tokens.motion.sheetOpenDuration,
        easing: Easing.out(Easing.cubic),
        reduceMotion: ReduceMotion.System,
      })
    );
  };

  const dismiss = () => {
    progress.set(
      withTiming(
        1,
        {
          duration: tokens.motion.sheetCloseDuration,
          easing: Easing.in(Easing.cubic),
          reduceMotion: ReduceMotion.System,
        },
        (finished) => {
          if (finished) scheduleOnRN(onClose);
        }
      )
    );
  };

  return { sheetStyle, backdropStyle, onLayout, onShow, dismiss };
}
