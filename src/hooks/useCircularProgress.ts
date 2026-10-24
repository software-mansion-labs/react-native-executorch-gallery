import { Skia } from '@shopify/react-native-skia';
import { useEffect, useMemo } from 'react';
import {
  cancelAnimation,
  Easing,
  ReduceMotion,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { tokens } from '@/theme';

/**
 * Drives a rotating rounded hexagon with measured download progress
 * or a fully colored preparation outline. Motion stays on the UI thread, respects Reduce Motion,
 * and stops when unmounted. Returns the animated path, arc bounds, and rotation.
 */
export function useCircularProgress(progress: number, indeterminate: boolean) {
  const fill = useSharedValue(0);
  const rotation = useSharedValue(0);

  useEffect(() => {
    fill.set(
      withTiming(progress / 100, {
        duration: tokens.motion.modelProgressDuration,
        easing: Easing.out(Easing.cubic),
        reduceMotion: ReduceMotion.System,
      })
    );
    return () => cancelAnimation(fill);
  }, [fill, progress]);

  useEffect(() => {
    rotation.set(
      withRepeat(
        withTiming(Math.PI * 2, {
          duration: tokens.motion.modelSpinnerDuration,
          easing: Easing.linear,
          reduceMotion: ReduceMotion.System,
        }),
        -1,
        false,
        undefined,
        ReduceMotion.System
      )
    );
    return () => {
      cancelAnimation(rotation);
    };
  }, [rotation]);

  const path = useMemo(() => {
    const count = tokens.layout.modelProgressSides;
    const vertices = Array.from({ length: count }, (_, index) => {
      const angle = (index * Math.PI * 2) / count;
      return { x: center + Math.cos(angle) * radius, y: center + Math.sin(angle) * radius };
    });
    const corners = vertices.map((vertex, index) => {
      const previous = vertices[(index + count - 1) % count];
      const next = vertices[(index + 1) % count];
      const inset =
        tokens.layout.modelProgressCornerInset / Math.hypot(next.x - vertex.x, next.y - vertex.y);
      return {
        vertex,
        start: {
          x: vertex.x + (previous.x - vertex.x) * inset,
          y: vertex.y + (previous.y - vertex.y) * inset,
        },
        end: {
          x: vertex.x + (next.x - vertex.x) * inset,
          y: vertex.y + (next.y - vertex.y) * inset,
        },
      };
    });
    const builder = Skia.PathBuilder.Make();
    builder.moveTo(corners[0].start.x, corners[0].start.y);
    for (let index = 0; index < corners.length; index++) {
      const { vertex, end } = corners[index];
      const next = corners[(index + 1) % corners.length];
      builder.quadTo(vertex.x, vertex.y, end.x, end.y);
      builder.lineTo(next.start.x, next.start.y);
    }
    builder.close();
    return builder.build();
  }, []);
  const end = useDerivedValue(() => (indeterminate ? 1 : fill.get()));
  const trackStart = useDerivedValue(() => Math.min(1, end.get() + 0.04));
  const transform = useDerivedValue(() => [{ rotate: rotation.get() - Math.PI / 2 }]);
  return { path, end, trackStart, transform };
}

const center = tokens.layout.modelProgressSize / 2;
const radius =
  (tokens.layout.modelProgressSize - tokens.layout.modelProgressStroke) / 2 - tokens.spacing.xxs;
