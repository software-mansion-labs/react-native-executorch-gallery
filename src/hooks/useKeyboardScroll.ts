import type { ScrollView } from 'react-native';
import { useKeyboardHandler } from 'react-native-keyboard-controller';
import {
  scrollTo,
  useAnimatedRef,
  useScrollOffset,
  useSharedValue,
  type AnimatedRef,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tokens } from '@/theme';

/**
 * Anchors task results to the moving keyboard on the UI thread, including interactive
 * dismissal. Reuses an animated scroll ref when provided. No React state updates,
 * JS frame callbacks, or delayed scroll animations are needed during the transition.
 */
export function useKeyboardScroll(existing?: AnimatedRef<ScrollView>) {
  const own = useAnimatedRef<ScrollView>();
  const scroll = existing ?? own;
  const offset = useScrollOffset(scroll);
  const inset = useSharedValue(0);
  const anchorInset = useSharedValue(0);
  const anchorOffset = useSharedValue(0);
  const moving = useSharedValue(false);
  const { bottom } = useSafeAreaInsets();
  const move = (event: { height: number }) => {
    'worklet';
    if (!moving.get()) {
      anchorInset.set(inset.get());
      anchorOffset.set(offset.get());
      moving.set(true);
    }
    const next = Math.max(0, event.height - bottom - tokens.spacing.lg);
    inset.set(next);
    scrollTo(scroll, 0, Math.max(0, anchorOffset.get() + next - anchorInset.get()), false);
  };
  useKeyboardHandler(
    {
      onStart: () => {
        'worklet';
        anchorInset.set(inset.get());
        anchorOffset.set(offset.get());
        moving.set(true);
      },
      onMove: move,
      onInteractive: move,
      onEnd: (event) => {
        'worklet';
        move(event);
        moving.set(false);
      },
    },
    [scroll, offset, bottom]
  );
  return scroll;
}
