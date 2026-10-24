import { useEffect, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { tokens } from '@/theme';

/** Measures full-width disclosure content and animates its height, fade and chevron independently of streaming. */
export function useChatDisclosure(expanded: boolean) {
  const [height, setHeight] = useState(0);
  const animatedHeight = useSharedValue(0);
  const opacity = useSharedValue(0);
  const rotation = useSharedValue(0);
  useEffect(() => {
    const config = {
      duration: tokens.motion.chatDisclosureDuration,
      easing: Easing.inOut(Easing.cubic),
      reduceMotion: ReduceMotion.System,
    };
    animatedHeight.set(withTiming(expanded ? height : 0, config));
    opacity.set(
      withTiming(expanded ? 1 : 0, {
        ...config,
        duration: tokens.motion.chatDisclosureFadeDuration,
      })
    );
    rotation.set(withTiming(expanded ? 180 : 0, config));
  }, [expanded, height, animatedHeight, opacity, rotation]);
  return {
    contentStyle: useAnimatedStyle(() => ({
      height: animatedHeight.get(),
      opacity: opacity.get(),
    })),
    chevronStyle: useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.get()}deg` }] })),
    onLayout: (event: LayoutChangeEvent) => setHeight(event.nativeEvent.layout.height),
  };
}
