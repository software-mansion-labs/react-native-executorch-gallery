import { useEffect } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import {
  cancelAnimation,
  Easing,
  ReduceMotion,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import type { ViewportTransform } from '@/components/PhotoPicker';
import { tokens } from '@/theme';

/** Maps taps through the aspect-fit photo bounds into shader focus coordinates; all interaction and marker motion stay on the UI thread. */
export function useDepthPhoto(width: number, height: number, transform: ViewportTransform) {
  const { offsetX: x, offsetY: y, scale } = transform;
  const imageWidth = width * scale;
  const imageHeight = height * scale;
  const rect = { x, y, width: imageWidth, height: imageHeight };
  const focusX = useSharedValue(0.5);
  const focusY = useSharedValue(0.5);
  const marker = useSharedValue(0);
  const reveal = useSharedValue(0);
  useEffect(() => {
    reveal.set(
      withTiming(1, {
        duration: tokens.motion.depthEffectFadeDuration,
        easing: Easing.out(Easing.cubic),
        reduceMotion: ReduceMotion.System,
      })
    );
    return () => cancelAnimation(reveal);
  }, [reveal]);
  const focusAt = (px: number, py: number) => {
    'worklet';
    if (
      imageWidth <= 0 ||
      imageHeight <= 0 ||
      px < x ||
      px > x + imageWidth ||
      py < y ||
      py > y + imageHeight
    )
      return;
    focusX.set((px - x) / imageWidth);
    focusY.set((py - y) / imageHeight);
    marker.set(
      withSequence(
        withTiming(1, {
          duration: tokens.motion.cardPressDuration,
          reduceMotion: ReduceMotion.System,
        }),
        withDelay(
          tokens.motion.depthFocusHoldDuration,
          withTiming(0, {
            duration: tokens.motion.modelLoadingFadeDuration,
            reduceMotion: ReduceMotion.System,
          })
        )
      )
    );
  };
  const tap = Gesture.Tap().onEnd((event, success) => {
    if (success) focusAt(event.x, event.y);
  });
  const uniforms = useDerivedValue(() => ({
    origin: [x, y],
    size: [imageWidth, imageHeight],
    focus: [focusX.get(), focusY.get()],
    amount: tokens.layout.depthFocusAmount,
    reveal: reveal.get(),
  }));
  return {
    rect,
    tap,
    uniforms,
    marker,
    focusCx: useDerivedValue(() => x + focusX.get() * imageWidth),
    focusCy: useDerivedValue(() => y + focusY.get() * imageHeight),
    focusCenter: () => focusAt(x + imageWidth / 2, y + imageHeight / 2),
  };
}
