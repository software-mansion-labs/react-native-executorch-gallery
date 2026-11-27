import { BlurMask, Canvas, Circle, LinearGradient, vec } from '@shopify/react-native-skia';
import { StyleSheet, View } from 'react-native';
import { useDerivedValue, useReducedMotion, type SharedValue } from 'react-native-reanimated';

import { tokens, useTheme } from '@/theme';

/** A recording ring that brightens and expands with microphone energy. */
export function SpeechActivityHalo({ level }: { level: SharedValue<number> }) {
  const { scheme } = useTheme();
  const colors = tokens.activityAccent[scheme];
  const reducedMotion = useReducedMotion();
  const radius = useDerivedValue(
    () => buttonRadius + spacing.xs + (reducedMotion ? 0 : level.get() * spacing.sm)
  );
  const glowOpacity = useDerivedValue(() => (reducedMotion ? 0.35 : 0.24 + level.get() * 0.54));

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} accessible={false}>
      <Canvas style={StyleSheet.absoluteFill}>
        <Circle c={center} r={radius} style="stroke" strokeWidth={4} opacity={glowOpacity}>
          <LinearGradient start={top} end={bottom} colors={colors} />
          <BlurMask blur={4} style="normal" />
        </Circle>
        <Circle c={center} r={radius} style="stroke" strokeWidth={1.5}>
          <LinearGradient start={top} end={bottom} colors={colors} />
        </Circle>
      </Canvas>
    </View>
  );
}

const { layout, spacing } = tokens;
const size = layout.speechActivitySize;
const center = vec(size / 2, size / 2);
const buttonRadius = layout.photoControlSize / 2;
const top = vec(size * 0.22, size * 0.15);
const bottom = vec(size * 0.82, size * 0.85);
