import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  AlphaType,
  Atlas,
  BlurMask,
  Canvas,
  ColorType,
  FilterMode,
  Group,
  Image,
  MipmapMode,
  Path,
  Skia,
} from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { useRainSimulation } from '@/hooks/silhouette-rain/useRainSimulation';
import type { RainMask } from '@/hooks/silhouette-rain/useSilhouetteRain';
import { createRainTexture, DROP_TEXTURE, RAIN_COUNT } from '@/lib/silhouette-rain/texture';
import { tokens } from '@/theme';

/** A textured droplet atlas and one batched splash path over a centered cover preview, shared with local post captures. */
export function RainCanvas({
  enabled = true,
  mask,
  playing,
  aspectRatio,
}: {
  enabled?: boolean;
  mask: SharedValue<RainMask | null>;
  playing: boolean;
  aspectRatio: number;
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
  });
  const texture = useMemo(() => createRainTexture(), []);
  const { backdropRgb, personOpacity, silhouetteFeather } = tokens.rain;
  const previewShade = useDerivedValue(() => {
    const field = mask.get();
    const width = field?.width ?? 1;
    const height = field?.height ?? 1;
    const pixels = new Uint8Array(width * height * 4);
    for (let i = 0; i < width * height; i++) {
      const distance = field?.distance[i] ?? silhouetteFeather;
      const t = Math.max(0, Math.min(1, 0.5 + distance / (2 * silhouetteFeather)));
      const blend = t * t * (3 - 2 * t);
      const opacity = personOpacity + blend * (1 - personOpacity);
      const offset = i * 4;
      pixels[offset] = Math.round(backdropRgb[0] * opacity);
      pixels[offset + 1] = Math.round(backdropRgb[1] * opacity);
      pixels[offset + 2] = Math.round(backdropRgb[2] * opacity);
      pixels[offset + 3] = Math.round(255 * opacity);
    }
    return Skia.Image.MakeImage(
      { width, height, alphaType: AlphaType.Premul, colorType: ColorType.RGBA_8888 },
      Skia.Data.fromBytes(pixels),
      width * 4
    );
  });
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
      style={[StyleSheet.absoluteFill, !enabled && styles.hidden]}
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
            <Image
              image={previewShade}
              x={0}
              y={0}
              width={width}
              height={height}
              fit="fill"
              sampling={{ filter: FilterMode.Linear, mipmap: MipmapMode.None }}
            />
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

const styles = StyleSheet.create({
  hidden: { opacity: 0 },
});
