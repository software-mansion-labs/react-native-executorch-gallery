import { useEffect, useRef, useState } from 'react';
import { KeyboardController } from 'react-native-keyboard-controller';
import {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { tokens } from '@/theme';

/**
 * Dismisses the keyboard before changing widget fullscreen layout so the composer
 * stays mounted throughout dismissal. Returns fullscreen state, pending status,
 * guarded toggle/minimize actions, and the animated preview style. Actions return
 * whether the layout change was applied and ignore completion after unmount.
 */
export function useWidgetFullscreen() {
  const [expanded, setExpanded] = useState(false);
  const [changing, setChanging] = useState(false);
  const pending = useRef(false);
  const mounted = useRef(true);
  const zoom = useSharedValue(1);
  const previewStyle = useAnimatedStyle(() => ({ transform: [{ scale: zoom.get() }] }));

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const changeExpanded = async (next: boolean) => {
    if (pending.current) return false;
    pending.current = true;
    setChanging(true);
    try {
      await KeyboardController.dismiss();
      if (!mounted.current) return false;
      setExpanded(next);
      zoom.set(
        withTiming(next ? tokens.motion.widgetExpandedScale : 1, {
          duration: tokens.motion.chatDisclosureDuration,
          easing: Easing.out(Easing.cubic),
          reduceMotion: ReduceMotion.System,
        })
      );
      return true;
    } finally {
      pending.current = false;
      if (mounted.current) setChanging(false);
    }
  };

  return {
    expanded,
    changing,
    toggleExpanded: () => changeExpanded(!expanded),
    minimize: () => changeExpanded(false),
    previewStyle,
  };
}
