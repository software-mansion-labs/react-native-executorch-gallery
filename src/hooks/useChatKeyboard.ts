import { useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAnimatedStyle } from 'react-native-reanimated';

import { tokens } from '@/theme';

/** Keeps the chat footer above the native keyboard, accounting for the safe area and TaskScreen's bottom padding. */
export function useChatKeyboard() {
  const { height, progress } = useReanimatedKeyboardAnimation();
  const { bottom } = useSafeAreaInsets();
  const keyboardStyle = useAnimatedStyle(() => ({
    paddingBottom: Math.max(0, -height.get() - bottom - tokens.spacing.lg),
  }));
  const heroStyle = useAnimatedStyle(() => ({ opacity: 1 - progress.get() }));
  return { keyboardStyle, heroStyle };
}
