import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Canvas, Path, Group, Skia, Rect, Shader, BlurMask } from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';
import { VideoView, type VideoPlayer } from 'expo-video';

import type { RainMask, RainRenderMetrics } from '@/hooks/silhouette-rain/useSilhouetteRain';
import type { EffectId } from '@/lib/silhouette-rain/physics';
import { useSilhouetteEffects } from '@/hooks/silhouette-rain/useSilhouetteEffects';
import { LAVA_SHADER } from '@/lib/silhouette-rain/effects';
import { tokens, useTheme } from '@/theme';

/** Independent UI-thread effects with surface-normal collisions and cached mask geometry. */
export function RainCanvas({
  mask,
  playing,
  collisions,
  showMask,
  aspectRatio,
  player,
  fullScreen = false,
  onMetrics,
  effect = 'rain',
}: {
  mask: SharedValue<RainMask | null>;
  playing: boolean;
  collisions: boolean;
  showMask: boolean;
  aspectRatio: number;
  player?: VideoPlayer | null;
  fullScreen?: boolean;
  effect?: EffectId;
  onMetrics?: (metrics: RainRenderMetrics) => void;
}) {
  const { colors } = useTheme('dark');
  const [layout, setLayout] = useState({ width: 1, height: 1 });
  const width = fullScreen ? Math.max(layout.width, layout.height * aspectRatio) : layout.width;
  const height = width / aspectRatio;
  const offsetX = (layout.width - width) / 2,
    offsetY = (layout.height - height) / 2;
  const lava = useMemo(() => Skia.RuntimeEffect.Make(LAVA_SHADER), []);
  const { paths, splashPath, maskPath, contourPath, uniforms } = useSilhouetteEffects({
    mask,
    playing,
    collisions,
    showMask,
    effect,
    width,
    height,
    aspectRatio,
    onMetrics,
  });
  const color =
    effect === 'rain'
      ? tokens.effects.rain
      : effect === 'snow'
        ? tokens.effects.snow
        : tokens.effects.ember;
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
          {effect === 'lava' && lava && (
            <>
              <Group clip={collisions ? maskPath : undefined} invertClip={collisions}>
                <Rect x={0} y={0} width={width} height={height}>
                  <Shader source={lava} uniforms={uniforms} />
                </Rect>
              </Group>
              {collisions && (
                <>
                  <Path
                    path={contourPath}
                    color={tokens.effects.ember}
                    style="stroke"
                    strokeWidth={tokens.effects.glowWidth}
                    opacity={0.6}
                  >
                    <BlurMask blur={5} style="normal" />
                  </Path>
                  <Path
                    path={contourPath}
                    color={tokens.effects.hot}
                    style="stroke"
                    strokeWidth={tokens.effects.outlineWidth}
                    opacity={0.75}
                  >
                    <BlurMask blur={1} style="normal" />
                  </Path>
                </>
              )}
            </>
          )}
          {effect !== 'lava' && (
            <>
              {effect === 'embers' && (
                <ParticleLayer paths={paths} index={0} color={color} snow={false} glow />
              )}
              <ParticleLayers paths={paths} color={color} snow={effect === 'snow'} />
              <Path
                path={splashPath}
                color={tokens.effects.rain}
                style="stroke"
                strokeWidth={tokens.effects.splashWidth}
                opacity={0.7}
              />
            </>
          )}
          {showMask && <Path path={maskPath} color={colors.accent} opacity={0.3} />}
        </Group>
      </Canvas>
    </View>
  );
}

/** Three persistent shared paths give the particle field depth without React updates per frame. */
function ParticleLayers({
  paths,
  color,
  snow,
}: {
  paths: SharedValue<ReturnType<typeof Skia.Path.Make>[]>;
  color: string;
  snow: boolean;
}) {
  // Individual derived paths are read by Skia on its UI runtime.
  return (
    <>
      {[0, 1, 2].map((i) => (
        <ParticleLayer key={i} paths={paths} index={i} color={color} snow={snow} />
      ))}
    </>
  );
}

function ParticleLayer({
  paths,
  index,
  color,
  snow,
  glow = false,
}: {
  paths: SharedValue<ReturnType<typeof Skia.Path.Make>[]>;
  index: number;
  color: string;
  snow: boolean;
  glow?: boolean;
}) {
  const path = useDerivedValue(() => paths.value[index]!, [paths, index]);
  return (
    <Path
      path={path}
      color={color}
      style={snow ? 'fill' : 'stroke'}
      strokeWidth={glow ? tokens.effects.glowWidth : tokens.effects.streakWidth}
      strokeCap="round"
      opacity={glow ? 0.6 : 0.4 + index * 0.25}
    >
      {(glow || index === 0) && <BlurMask blur={glow ? 4 : 0.7} style="normal" />}
    </Path>
  );
}
const styles = StyleSheet.create({
  stage: { width: '100%', overflow: 'hidden', borderRadius: tokens.radius.card },
  fullScreen: { flex: 1, borderRadius: 0 },
});
