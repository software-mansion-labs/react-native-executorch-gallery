import React, { useEffect } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  Easing,
  useDerivedValue,
  useFrameCallback,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Canvas, LinearGradient, Path, Skia, vec } from '@shopify/react-native-skia';

import { borderWidth, radius, spacing, useTheme } from '@/theme';

const CANVAS_WIDTH = 260;
const CANVAS_HEIGHT = 80;
const MID_Y = CANVAS_HEIGHT / 2;

export interface AudioWaveformVisualizerProps {
  /** Whether audio is actively synthesizing or streaming playback. */
  active: boolean;
}

/**
 * Multi-layer 4-wave harmonic traveling audio visualizer.
 *
 * Renders 4 intertwining sinusoids with independent frequencies, phase offsets,
 * and speeds housed inside a clean surface capsule card.
 * Tapping anywhere on the container dismisses the soft keyboard.
 *
 * @param props Active playback state.
 * @returns Floating capsule viewport with header text and 4 harmonic waves.
 */
export function AudioWaveformVisualizer({ active }: AudioWaveformVisualizerProps) {
  const { colors } = useTheme();

  // Continuous monotonic time counter driven by frame callback
  const time = useSharedValue(0);
  const amplitude = useSharedValue(5);

  // Frame-driven monotonic progression: gentle drift when idle (0.7x), energetic when active (2.8x)
  useFrameCallback((frameInfo) => {
    const dt = frameInfo.timeSincePreviousFrame
      ? Math.min(frameInfo.timeSincePreviousFrame / 1000, 0.05)
      : 0.016;
    const speed = active ? 2.8 : 0.7;
    time.value += dt * speed;
  });

  useEffect(() => {
    if (active) {
      amplitude.value = withTiming(22, {
        duration: 450,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      amplitude.value = withTiming(5, {
        duration: 600,
        easing: Easing.inOut(Easing.quad),
      });
    }
  }, [active, amplitude]);

  // Wave 1: Primary lead wave (brightest, dominant front wave)
  const wavePath1 = useDerivedValue(() => {
    const path = Skia.Path.Make();
    const t = time.value;
    const amp = amplitude.value;
    const step = 4;

    path.moveTo(0, MID_Y);
    for (let x = 0; x <= CANVAS_WIDTH; x += step) {
      const normalizedX = (x / CANVAS_WIDTH) * 2 - 1;
      const envelope = Math.exp(-3.2 * normalizedX * normalizedX);

      const y =
        MID_Y +
        (Math.sin(x * 0.035 - t * 2.1) * 0.65 +
          Math.sin(x * 0.063 - t * 3.4) * 0.28 +
          Math.cos(x * 0.098 + t * 1.7) * 0.18) *
          amp *
          envelope;

      path.lineTo(x, y);
    }
    return path;
  });

  // Wave 2: Mid-harmonic counter-drifting wave
  const wavePath2 = useDerivedValue(() => {
    const path = Skia.Path.Make();
    const t = time.value;
    const amp = amplitude.value * 0.8;
    const step = 4;

    path.moveTo(0, MID_Y);
    for (let x = 0; x <= CANVAS_WIDTH; x += step) {
      const normalizedX = (x / CANVAS_WIDTH) * 2 - 1;
      const envelope = Math.exp(-3.2 * normalizedX * normalizedX);

      const y =
        MID_Y +
        (Math.cos(x * 0.045 + t * 1.7) * 0.6 +
          Math.sin(x * 0.076 - t * 2.7) * 0.3 +
          Math.sin(x * 0.121 + t * 0.9) * 0.15) *
          amp *
          envelope;

      path.lineTo(x, y);
    }
    return path;
  });

  // Wave 3: Higher frequency shimmer wave
  const wavePath3 = useDerivedValue(() => {
    const path = Skia.Path.Make();
    const t = time.value;
    const amp = amplitude.value * 0.6;
    const step = 4;

    path.moveTo(0, MID_Y);
    for (let x = 0; x <= CANVAS_WIDTH; x += step) {
      const normalizedX = (x / CANVAS_WIDTH) * 2 - 1;
      const envelope = Math.exp(-3.2 * normalizedX * normalizedX);

      const y =
        MID_Y +
        (Math.sin(x * 0.052 + t * 2.5) * 0.55 +
          Math.cos(x * 0.088 - t * 1.9) * 0.35 +
          Math.sin(x * 0.142 + t * 3.2) * 0.15) *
          amp *
          envelope;

      path.lineTo(x, y);
    }
    return path;
  });

  // Wave 4: Deep ambient bass wave (slower, longer wavelength)
  const wavePath4 = useDerivedValue(() => {
    const path = Skia.Path.Make();
    const t = time.value;
    const amp = amplitude.value * 0.7;
    const step = 4;

    path.moveTo(0, MID_Y);
    for (let x = 0; x <= CANVAS_WIDTH; x += step) {
      const normalizedX = (x / CANVAS_WIDTH) * 2 - 1;
      const envelope = Math.exp(-3.2 * normalizedX * normalizedX);

      const y =
        MID_Y +
        (Math.cos(x * 0.024 - t * 1.3) * 0.7 + Math.sin(x * 0.048 + t * 1.1) * 0.3) *
          amp *
          envelope;

      path.lineTo(x, y);
    }
    return path;
  });

  // Dynamic stroke colors per wave depth layer
  const leadColor = active ? colors.accent : colors.textMuted;
  const midColor1 = active ? colors.accent + '90' : colors.textMuted + '80';
  const midColor2 = active ? colors.accent + '65' : colors.border;
  const deepColor = active ? colors.accent + '40' : colors.border + '80';

  return (
    <Pressable style={styles.container} onPress={Keyboard.dismiss} accessible={false}>
      <View
        style={[
          styles.capsule,
          {
            backgroundColor: colors.surface,
            borderColor: active ? colors.accent : colors.border,
          },
        ]}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>
            {active ? 'Playing Speech…' : 'Synthesize Speech'}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textDim }]}>
            {active ? 'Streaming audio on-device' : 'Enter prompt below to synthesize'}
          </Text>
        </View>

        <Canvas style={styles.canvas}>
          {/* Wave 4: Deep ambient under-wave */}
          <Path
            path={wavePath4}
            style="stroke"
            strokeWidth={1}
            strokeCap="round"
            strokeJoin="round"
          >
            <LinearGradient
              start={vec(0, 0)}
              end={vec(CANVAS_WIDTH, 0)}
              colors={[deepColor + '10', deepColor, deepColor + '10']}
            />
          </Path>

          {/* Wave 3: High shimmer harmonic wave */}
          <Path
            path={wavePath3}
            style="stroke"
            strokeWidth={1}
            strokeCap="round"
            strokeJoin="round"
          >
            <LinearGradient
              start={vec(0, 0)}
              end={vec(CANVAS_WIDTH, 0)}
              colors={[midColor2 + '15', midColor2, midColor2 + '15']}
            />
          </Path>

          {/* Wave 2: Mid counter-drifting harmonic wave */}
          <Path
            path={wavePath2}
            style="stroke"
            strokeWidth={1.5}
            strokeCap="round"
            strokeJoin="round"
          >
            <LinearGradient
              start={vec(0, 0)}
              end={vec(CANVAS_WIDTH, 0)}
              colors={[midColor1 + '20', midColor1, midColor1 + '20']}
            />
          </Path>

          {/* Wave 1: Lead crisp front wave */}
          <Path
            path={wavePath1}
            style="stroke"
            strokeWidth={active ? 2.5 : 1.5}
            strokeCap="round"
            strokeJoin="round"
          >
            <LinearGradient
              start={vec(0, 0)}
              end={vec(CANVAS_WIDTH, 0)}
              colors={[leadColor + '30', leadColor, leadColor + '30']}
            />
          </Path>
        </Canvas>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  capsule: {
    width: '100%',
    maxWidth: 340,
    borderRadius: radius.xl,
    borderWidth,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  header: {
    alignItems: 'center',
    gap: spacing.xxs,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  canvas: {
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
  },
});
