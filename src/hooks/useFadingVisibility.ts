import { useCallback, useEffect, useRef, useState } from 'react';
import {
  cancelAnimation,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { tokens } from '@/theme';

/** Keeps a view mounted through fade-out and ignores stale hide callbacks after reopening. */
export function useFadingVisibility(visible: boolean) {
  const [state, setState] = useState({ visible, mounted: visible });
  if (state.visible !== visible) setState({ visible, mounted: visible || state.mounted });
  const requested = useRef(visible);
  const opacity = useSharedValue(visible ? 1 : 0);
  const hide = useCallback(() => {
    if (!requested.current)
      setState((previous) => (previous.visible ? previous : { ...previous, mounted: false }));
  }, []);
  useEffect(() => {
    requested.current = visible;
    opacity.set(
      withTiming(
        visible ? 1 : 0,
        { duration: tokens.motion.photoRevealDuration, reduceMotion: ReduceMotion.System },
        (finished) => {
          if (finished && !visible) scheduleOnRN(hide);
        }
      )
    );
    return () => {
      requested.current = true;
      cancelAnimation(opacity);
    };
  }, [visible, opacity, hide]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  return { mounted: visible || state.mounted, style };
}
