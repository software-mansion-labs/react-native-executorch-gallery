import { Canvas, Group, LinearGradient, Path, Skia, vec } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';

import { tokens, useTheme } from '@/theme';

/** Small capacity ring: the accent arc shows how much conversation space remains. */
export function ContextGauge({ used }: { used: SharedValue<number> }) {
  const { scheme } = useTheme();
  const { track, context: arcColors } = tokens.progressStroke[scheme];
  const path = useMemo(() => {
    const builder = Skia.PathBuilder.Make();
    builder.addCircle(center, center, (size - stroke) / 2);
    return builder.build();
  }, []);
  const remaining = useDerivedValue(() => 1 - used.get());
  return (
    <Canvas style={styles.gauge} accessible={false}>
      <Group origin={{ x: center, y: center }} transform={[{ rotate: -Math.PI / 2 }]}>
        <Path path={path} style="stroke" strokeWidth={stroke}>
          <LinearGradient start={gradientStart} end={gradientEnd} colors={track} />
        </Path>
        <Path
          path={path}
          style="stroke"
          strokeWidth={stroke}
          start={0}
          end={remaining}
          strokeCap="round"
        >
          <LinearGradient
            start={gradientStart}
            end={gradientEnd}
            colors={arcColors}
            positions={tokens.progressStroke.stops}
          />
        </Path>
      </Group>
    </Canvas>
  );
}

const size = tokens.iconSize.small;
const center = size / 2;
const stroke = tokens.layout.contextGaugeStroke;
const gradientStart = vec(size, 0);
const gradientEnd = vec(0, size);
const styles = StyleSheet.create({ gauge: { width: size, height: size } });
