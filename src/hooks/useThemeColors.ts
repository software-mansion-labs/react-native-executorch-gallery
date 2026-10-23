import { useEffect, useSyncExternalStore } from 'react';
import { interpolateColor, useReducedMotion } from 'react-native-reanimated';

import type { Theme } from '@/theme';

type Colors = Theme['colors'];

let colors: Colors | undefined;
let target: Colors | undefined;
let frame: number | undefined;
const listeners = new Set<() => void>();
const getColors = () => colors;
const notify = () => listeners.forEach((listener) => listener());

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (!listeners.size) {
      if (frame !== undefined) cancelAnimationFrame(frame);
      frame = undefined;
      colors = target;
    }
  };
}

function transition(next: Colors, duration: number) {
  if (target === next) return;
  if (frame !== undefined) cancelAnimationFrame(frame);
  frame = undefined;
  target = next;

  if (!colors || !duration) {
    colors = next;
    notify();
    return;
  }

  const from = colors;
  const started = performance.now();
  const update = (now: number) => {
    const progress = Math.max(0, Math.min(1, (now - started) / duration));
    const eased = 1 - (1 - progress) ** 3;
    colors = Object.fromEntries(
      (Object.keys(next) as (keyof Colors)[]).map((key) => [
        key,
        interpolateColor(eased, [0, 1], [from[key], next[key]]),
      ])
    ) as Colors;
    if (progress === 1) colors = next;
    notify();
    frame = progress < 1 ? requestAnimationFrame(update) : undefined;
  };
  frame = requestAnimationFrame(update);
}

/**
 * Blends the app's shared palette toward the requested colors over `duration` milliseconds.
 * All consumers share one animation; rapid changes continue from the current colors.
 * Returns the current palette, applying the initial theme and Reduce Motion changes immediately.
 */
export function useThemeColors(next: Colors, duration: number): Colors {
  const reducedMotion = useReducedMotion();
  const current = useSyncExternalStore(subscribe, getColors, getColors);

  useEffect(() => {
    transition(next, reducedMotion ? 0 : duration);
  }, [duration, next, reducedMotion]);

  return current ?? next;
}
