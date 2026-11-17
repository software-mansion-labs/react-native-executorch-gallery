import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Atlas, BlurMask, Canvas, Group, Path } from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';
import { useRainSimulation } from '@/hooks/silhouette-rain/useRainSimulation';
import type { RainMask, RainRenderMetrics } from '@/hooks/silhouette-rain/useSilhouetteRain';
import { createRainTexture, DROP_TEXTURE, RAIN_COUNT } from '@/lib/silhouette-rain/texture';
import { tokens } from '@/theme';

/** A textured droplet atlas and one batched splash path over a centered cover preview, shared with local post captures. */
export function RainCanvas({
  enabled = true,
  mask,
  playing,
  aspectRatio,
  onMetrics,
}: {
  enabled?: boolean;
  mask: SharedValue<RainMask | null>;
  playing: boolean;
  aspectRatio: number;
  onMetrics?: (metrics: RainRenderMetrics) => void;
}) {
  const [layout, setLayout] = useState({ width: 1, height: 1 });
  const width = Math.max(layout.width, layout.height * aspectRatio),
    height = width / aspectRatio;
  const { transforms, splashPath } = useRainSimulation({
    mask,
    playing: playing && enabled,
    width,
    height,
    aspectRatio,
    onMetrics,
  });
  const texture = useMemo(() => createRainTexture(), []);
  const sprites = useMemo(
    () =>
      Array.from({ length: RAIN_COUNT }, () => ({
        x: 0,
        y: 0,
        width: DROP_TEXTURE.width,
        height: DROP_TEXTURE.height,
      })),
    []
  );
  useEffect(() => () => texture?.dispose(), [texture]);
  return (
    <View
      onLayout={({ nativeEvent }) => setLayout(nativeEvent.layout)}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    >
      <Canvas style={StyleSheet.absoluteFill}>
        {enabled && (
          <Group
            transform={[
              { translateX: (layout.width - width) / 2 },
              { translateY: (layout.height - height) / 2 },
            ]}
          >
            <Atlas
              image={texture}
              sprites={sprites}
              transforms={transforms}
              colorBlendMode="modulate"
            />
            <Path
              path={splashPath}
              color={tokens.rain.drop}
              style="stroke"
              strokeWidth={tokens.rain.sprayWidth}
              opacity={tokens.rain.sprayOpacity}
              strokeCap="round"
            >
              <BlurMask blur={tokens.rain.sprayBlur} style="normal" />
            </Path>
            <Path
              path={splashPath}
              color={tokens.rain.highlight}
              style="stroke"
              strokeWidth={tokens.rain.splashWidth}
              opacity={0.8}
              strokeCap="round"
            />
          </Group>
        )}
      </Canvas>
    </View>
  );
}
