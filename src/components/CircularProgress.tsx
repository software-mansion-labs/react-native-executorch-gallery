import { Canvas, Group, Path } from '@shopify/react-native-skia';
import { StyleSheet, View } from 'react-native';

import { useCircularProgress } from '@/hooks/useCircularProgress';
import { tokens, useTheme } from '@/theme';

type CircularProgressProps = {
  progress: number;
  indeterminate?: boolean;
  size?: number;
  color?: string;
  accessible?: boolean;
};

/** A rounded hexagon showing download progress and rotating fully colored while preparing. */
export function CircularProgress({
  progress,
  indeterminate = false,
  size = tokens.layout.modelProgressSize,
  color,
  accessible = true,
}: CircularProgressProps) {
  const { colors } = useTheme();
  const percentage = Math.max(0, Math.min(100, Number.isFinite(progress) ? progress : 0));
  const { path, end, trackStart, transform } = useCircularProgress(percentage, indeterminate);

  return (
    <View
      style={{ width: size, height: size }}
      accessible={accessible}
      accessibilityRole="progressbar"
      accessibilityLabel={indeterminate ? 'Preparing model' : 'Downloading model'}
      accessibilityState={{ busy: true }}
      accessibilityValue={
        indeterminate ? undefined : { min: 0, max: 100, now: Math.round(percentage) }
      }
    >
      <Canvas style={StyleSheet.absoluteFill}>
        <Group transform={[{ scale: size / tokens.layout.modelProgressSize }]}>
          <Group origin={{ x: center, y: center }} transform={transform}>
            {!indeterminate && (
              <Path
                path={path}
                start={trackStart}
                end={1}
                style="stroke"
                strokeWidth={stroke}
                strokeCap="round"
                color={colors.border}
              />
            )}
            <Path
              path={path}
              start={0}
              end={end}
              style="stroke"
              strokeWidth={stroke}
              strokeCap="round"
              color={color ?? colors.accent}
            />
          </Group>
        </Group>
      </Canvas>
    </View>
  );
}

const size = tokens.layout.modelProgressSize;
const stroke = tokens.layout.modelProgressStroke;
const center = size / 2;
