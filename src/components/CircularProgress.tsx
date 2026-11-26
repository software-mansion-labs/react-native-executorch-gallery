import { Canvas, Group, LinearGradient, Path, vec } from '@shopify/react-native-skia';
import { StyleSheet, View } from 'react-native';

import { useCircularProgress } from '@/hooks/useCircularProgress';
import { tokens, useTheme, type Theme } from '@/theme';

type CircularProgressProps = {
  progress: number;
  indeterminate?: boolean;
  size?: number;
  accessible?: boolean;
  accessibilityLabel?: string;
  appearance?: Theme['scheme'];
};

/** A rounded hexagon showing download progress and rotating fully colored while preparing. */
export function CircularProgress({
  progress,
  indeterminate = false,
  size = tokens.layout.modelProgressSize,
  accessible = true,
  accessibilityLabel,
  appearance,
}: CircularProgressProps) {
  const { scheme } = useTheme(appearance);
  const track = tokens.progressTrack[scheme];
  const percentage = Math.max(0, Math.min(100, Number.isFinite(progress) ? progress : 0));
  const { path, end, trackStart, transform } = useCircularProgress(percentage, indeterminate);

  return (
    <View
      style={{ width: size, height: size }}
      accessible={accessible}
      accessibilityRole="progressbar"
      accessibilityLabel={
        accessibilityLabel ?? (indeterminate ? 'Preparing model' : 'Downloading model')
      }
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
              >
                <LinearGradient start={gradientStart} end={gradientEnd} colors={track} />
              </Path>
            )}
            <Path
              path={path}
              start={0}
              end={end}
              style="stroke"
              strokeWidth={stroke}
              strokeCap="round"
            >
              <LinearGradient
                start={gradientStart}
                end={gradientEnd}
                colors={tokens.activityAccent[scheme]}
              />
            </Path>
          </Group>
        </Group>
      </Canvas>
    </View>
  );
}

const size = tokens.layout.modelProgressSize;
const stroke = tokens.layout.modelProgressStroke;
const center = size / 2;
const gradientStart = vec(0, 0);
const gradientEnd = vec(size, size);
