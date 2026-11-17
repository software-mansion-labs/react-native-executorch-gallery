import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Canvas, Group, Path } from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';
import { VideoView, type VideoPlayer } from 'expo-video';
import { useRainSimulation } from '@/hooks/silhouette-rain/useRainSimulation';
import type { RainMask, RainRenderMetrics } from '@/hooks/silhouette-rain/useSilhouetteRain';
import { tokens, useTheme } from '@/theme';

/** Five batched draws: three rain layers, impact splashes and an optional diagnostic mask. */
export function RainCanvas({
  mask,
  playing,
  collisions,
  showMask,
  aspectRatio,
  player,
  fullScreen = false,
  onMetrics,
}: {
  mask: SharedValue<RainMask | null>;
  playing: boolean;
  collisions: boolean;
  showMask: boolean;
  aspectRatio: number;
  player?: VideoPlayer | null;
  fullScreen?: boolean;
  onMetrics?: (metrics: RainRenderMetrics) => void;
}) {
  const { colors } = useTheme('dark');
  const [layout, setLayout] = useState({ width: 1, height: 1 });
  const width = fullScreen ? Math.max(layout.width, layout.height * aspectRatio) : layout.width,
    height = width / aspectRatio;
  const { far, middle, near, splashPath, maskPath } = useRainSimulation({
    mask,
    playing,
    collisions,
    showMask,
    width,
    height,
    aspectRatio,
    onMetrics,
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
        <Group
          transform={[
            { translateX: (layout.width - width) / 2 },
            { translateY: (layout.height - height) / 2 },
          ]}
        >
          <Path
            path={far}
            color={tokens.rain.distant}
            style="stroke"
            strokeWidth={tokens.rain.farWidth}
            opacity={0.25}
            strokeCap="round"
          />
          <Path
            path={middle}
            color={tokens.rain.drop}
            style="stroke"
            strokeWidth={tokens.rain.dropWidth}
            opacity={0.55}
            strokeCap="round"
          />
          <Path
            path={near}
            color={tokens.rain.highlight}
            style="stroke"
            strokeWidth={tokens.rain.nearWidth}
            opacity={0.8}
            strokeCap="round"
          />
          <Path
            path={splashPath}
            color={tokens.rain.highlight}
            style="stroke"
            strokeWidth={tokens.rain.splashWidth}
            opacity={0.8}
            strokeCap="round"
          />
          {showMask && <Path path={maskPath} color={colors.accent} opacity={0.25} />}
        </Group>
      </Canvas>
    </View>
  );
}
const styles = StyleSheet.create({
  stage: { width: '100%', overflow: 'hidden', borderRadius: tokens.radius.card },
  fullScreen: { flex: 1, borderRadius: 0 },
});
