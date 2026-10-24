import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { radius } from '@/theme';

const BAR_PROFILES = [0.35, 0.65, 1.0, 0.55, 0.9, 0.45, 0.8, 0.6, 0.3];
// Non-harmonic frequencies for organic multi-channel motion
const FREQ_FACTORS = [2.1, 2.7, 3.3, 2.4, 3.1, 2.8, 3.5, 2.6, 3.0];
const PHASE_OFFSETS = [0.0, 1.2, 2.4, 0.8, 1.9, 2.9, 0.5, 1.6, 2.2];

function MeterBarItem({
  index,
  speechWeight,
  listenWeight,
  time,
  accentColor,
  barWidth,
  maxBarHeight,
}: {
  index: number;
  speechWeight: SharedValue<number>;
  listenWeight: SharedValue<number>;
  time: SharedValue<number>;
  accentColor: string;
  barWidth: number;
  maxBarHeight: number;
}) {
  const profile = BAR_PROFILES[index] ?? 0.5;
  const freq = FREQ_FACTORS[index] ?? 2.5;
  const phase = PHASE_OFFSETS[index] ?? 0;

  const barStyle = useAnimatedStyle(() => {
    const t = time.value;
    const sWeight = speechWeight.value;
    const lWeight = listenWeight.value;

    // Continuous smooth sinusoidal wave for active speech
    const speechWave = Math.sin(t * freq * 2.2 + phase) * 0.5 + 0.5;
    // Gentle, natural breathing wave for idle listening
    const idleWave = Math.sin(t * 2.8 + phase * 0.8) * 0.5 + 0.5;

    // Smooth blended oscillation factor
    const combinedWave =
      sWeight * (0.2 + speechWave * 0.8) + (1 - sWeight) * lWeight * (0.08 + idleWave * 0.22);

    const minHeight = Math.max(4, maxBarHeight * 0.12);
    const height = minHeight + (maxBarHeight * profile - minHeight) * combinedWave;
    const opacity = 0.25 + lWeight * 0.2 + sWeight * 0.55;

    return {
      width: barWidth,
      height,
      opacity,
      backgroundColor: accentColor,
    };
  });

  return <Animated.View style={[styles.bar, barStyle]} />;
}

export interface AudioMeterBarsProps {
  /** Whether active speech is currently detected. */
  active: boolean;
  /** Whether the microphone is actively capturing/listening (defaults to `active`). */
  isListening?: boolean;
  /** Accent color to use for the meter bars. */
  accentColor: string;
  /** Optional fallback color (kept for backward compat). */
  idleColor?: string;
  /** Bar width in points (default: 3.5). */
  barWidth?: number;
  /** Max bar height in points (default: 30). */
  maxBarHeight?: number;
  /** Gap between bars in points (default: 4). */
  gap?: number;
}

/**
 * Shared, multi-channel acoustic level meter with continuous frame-driven wave physics
 * and ultra-smooth ease-in-out transitions between speech, listening, and idle states.
 *
 * @param props Active state, listening state, accent color, and size options.
 * @returns Fluid multi-channel meter bar row.
 */
export function AudioMeterBars({
  active,
  isListening = active,
  accentColor,
  barWidth = 3.5,
  maxBarHeight = 30,
  gap = 4,
}: AudioMeterBarsProps) {
  const time = useSharedValue(0);
  const speechWeight = useSharedValue(0);
  const listenWeight = useSharedValue(0);

  useFrameCallback((frameInfo) => {
    const dt = frameInfo.timeSincePreviousFrame
      ? Math.min(frameInfo.timeSincePreviousFrame / 1000, 0.05)
      : 0.016;
    time.value += dt;
  });

  useEffect(() => {
    speechWeight.value = withTiming(active ? 1 : 0, { duration: 400 });
  }, [active, speechWeight]);

  useEffect(() => {
    listenWeight.value = withTiming(isListening ? 1 : 0, { duration: 450 });
  }, [isListening, listenWeight]);

  return (
    <View style={[styles.container, { height: maxBarHeight + 4, gap }]}>
      {BAR_PROFILES.map((_, i) => (
        <MeterBarItem
          key={i}
          index={i}
          speechWeight={speechWeight}
          listenWeight={listenWeight}
          time={time}
          accentColor={accentColor}
          barWidth={barWidth}
          maxBarHeight={maxBarHeight}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bar: {
    borderRadius: radius.pill,
  },
});
