import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Canvas, Path, Group, Skia } from '@shopify/react-native-skia';
import { useFrameCallback, useSharedValue, type SharedValue } from 'react-native-reanimated';
import { VideoView, type VideoPlayer } from 'expo-video';

import type { RainMask } from '@/hooks/silhouette-rain/useSilhouetteRain';
import { advanceDrop, isFreshMask } from '@/lib/silhouette-rain/physics';
import { tokens, useTheme } from '@/theme';

const COUNT = 240;

/** Animates rain independently of inference; only fresh person masks affect collisions. */
export function RainCanvas({
  mask,
  playing,
  collisions,
  showMask,
  aspectRatio,
  player,
  fullScreen = false,
}: {
  mask: SharedValue<RainMask | null>;
  playing: boolean;
  collisions: boolean;
  showMask: boolean;
  aspectRatio: number;
  player?: VideoPlayer | null;
  fullScreen?: boolean;
}) {
  const { colors } = useTheme('dark');
  const [layout, setLayout] = useState({ width: 1, height: 1 });
  const width = fullScreen ? Math.max(layout.width, layout.height * aspectRatio) : layout.width;
  const height = width / aspectRatio;
  const offsetX = (layout.width - width) / 2;
  const offsetY = (layout.height - height) / 2;
  const initial = useMemo(
    () =>
      Array.from({ length: COUNT }, (_, i) => ({
        x: ((i * 73) % COUNT) / COUNT,
        y: ((i * 137) % COUNT) / COUNT,
        vx: 0,
      })),
    []
  );
  const drops = useSharedValue(initial);
  const rainPath = useSharedValue(Skia.Path.Make());
  const maskPath = useSharedValue(Skia.Path.Make());

  useFrameCallback((info) => {
    'worklet';
    const dt = Math.min((info.timeSincePreviousFrame ?? 16) / 1000, 0.04);
    const now = Date.now();
    const field = mask.value;
    const fresh = isFreshMask(field, now, playing);
    const path = Skia.Path.Make();
    if (playing) {
      for (const drop of drops.value) {
        const oldX = drop.x;
        advanceDrop(drop, dt, collisions && fresh ? field : null);
        if (drop.y > 1.02 || drop.x < 0 || drop.x > 1) {
          drop.y = -0.02;
          drop.x =
            (((Math.sin((info.timestamp + oldX * 3000) * 12.9898) * 43758.5453) % 1) + 1) % 1;
          drop.vx = 0;
        }
        path.moveTo(drop.x * width, drop.y * height);
        path.lineTo((drop.x - drop.vx * 0.015) * width, (drop.y - 0.014) * height);
      }
    }
    rainPath.value = path;
    const overlay = Skia.Path.Make();
    if (showMask && fresh && field) {
      for (let y = 0; y < field.height; y++) {
        let start = -1;
        for (let x = 0; x <= field.width; x++) {
          const filled = x < field.width && field.data[y * field.width + x] === 1;
          if (filled && start < 0) start = x;
          if (!filled && start >= 0) {
            overlay.addRect(
              Skia.XYWHRect(
                (start * width) / field.width,
                (y * height) / field.height,
                ((x - start) * width) / field.width,
                height / field.height
              )
            );
            start = -1;
          }
        }
      }
    }
    maskPath.value = overlay;
  });

  return (
    <View
      onLayout={({ nativeEvent }) => setLayout(nativeEvent.layout)}
      style={[
        styles.stage,
        fullScreen ? styles.fullScreen : { aspectRatio },
        { backgroundColor: colors.background },
      ]}
    >
      {player && (
        <VideoView
          player={player}
          style={StyleSheet.absoluteFill}
          contentFit={fullScreen ? 'cover' : 'contain'}
          nativeControls={false}
          surfaceType="textureView"
        />
      )}
      <Canvas style={StyleSheet.absoluteFill}>
        <Group transform={[{ translateX: offsetX }, { translateY: offsetY }]}>
          <Path path={maskPath} color={colors.accent} opacity={0.28} />
          <Path
            path={rainPath}
            color={colors.text}
            opacity={0.85}
            style="stroke"
            strokeWidth={tokens.rain.dropWidth}
          />
        </Group>
      </Canvas>
    </View>
  );
}
const styles = StyleSheet.create({
  stage: { width: '100%', overflow: 'hidden', borderRadius: tokens.radius.card },
  fullScreen: { flex: 1, borderRadius: 0 },
});
