import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  type SharedValue,
} from 'react-native-reanimated';

import { tokens, useTheme } from '@/theme';

const heights = [0.25, 0.45, 0.7, 0.9, 1, 0.8, 0.6, 0.85, 0.65, 0.4, 0.2];

function Bar({
  height,
  level,
  color,
  reducedMotion,
}: {
  height: number;
  level: SharedValue<number>;
  color: string;
  reducedMotion: boolean;
}) {
  const animation = useAnimatedStyle(() => ({
    transform: [
      {
        scaleY: reducedMotion
          ? height
          : (tokens.layout.speechWaveformBarWidth +
              level.get() *
                height *
                (tokens.layout.speechWaveformHeight - tokens.layout.speechWaveformBarWidth)) /
            tokens.layout.speechWaveformHeight,
      },
    ],
  }));
  return <Animated.View style={[styles.bar, { backgroundColor: color }, animation]} />;
}

/** Compact waveform driven by real microphone energy, with a calm baseline during silence. */
export function SpeechWaveform({ level }: { level: SharedValue<number> }) {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  return (
    <View style={styles.wave} accessible={false}>
      {heights.map((height, index) => (
        <Bar
          key={index}
          height={height}
          level={level}
          color={colors.accent}
          reducedMotion={reducedMotion}
        />
      ))}
    </View>
  );
}
const { layout, spacing, radius } = tokens;
const styles = StyleSheet.create({
  wave: {
    height: layout.speechWaveformHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxs,
  },
  bar: {
    width: layout.speechWaveformBarWidth,
    height: layout.speechWaveformHeight,
    borderRadius: radius.pill,
  },
});
