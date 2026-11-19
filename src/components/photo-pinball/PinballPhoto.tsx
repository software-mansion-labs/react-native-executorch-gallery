import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Canvas,
  Circle,
  FilterMode,
  Image,
  ImageShader,
  Rect,
  Shader,
  Skia,
  type SkImage,
} from '@shopify/react-native-skia';
import { GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';

import { AppText } from '@/components/AppText';
import { PhotoActionButton } from '@/components/PhotoActionButton';
import type { ViewportTransform } from '@/components/PhotoPicker';
import { usePhotoPinball } from '@/hooks/usePhotoPinball';
import type { ForegroundBumper } from '@/lib/photo-pinball/foreground-bumper';
import { tokens, useTheme } from '@/theme';

const ballEffect = Skia.RuntimeEffect.Make(`
uniform shader depth;
uniform float2 origin;
uniform float2 size;
uniform float2 center;
uniform float radius;
uniform float useDepth;

half4 main(float2 position) {
  float2 p = position - origin;
  float2 ball = (p - center) / radius;
  float r = length(ball);
  if (r > 1.08) return half4(0);

  // Estimate table depth for this row from the clear strips near the sides.
  float left = depth.eval(origin + float2(size.x * 0.14, p.y)).r;
  float right = depth.eval(origin + float2(size.x * 0.86, p.y)).r;
  float table = mix(left, right, clamp(p.x / size.x, 0.0, 1.0));
  float foreground = depth.eval(position).r - table;
  float visible = 1.0 - useDepth * smoothstep(0.055, 0.11, foreground);

  float3 normal = float3(ball, sqrt(max(0.0, 1.0 - r * r)));
  float lit = max(0.0, dot(normal, normalize(float3(-0.5, -0.7, 1.0))));
  half3 chrome = mix(half3(0.11, 0.16, 0.23), half3(0.95, 0.99, 1.0), lit);
  half alpha = half((1.0 - smoothstep(0.92, 1.07, r)) * visible);
  return half4(chrome * alpha, alpha);
}
`);

export function PinballPhoto({
  image,
  depth,
  transform,
  foreground,
}: {
  image: SkImage;
  depth: SkImage;
  transform: ViewportTransform;
  foreground: ForegroundBumper | null;
}) {
  const [occlusion, setOcclusion] = useState(true);
  const { colors } = useTheme();
  const rect = {
    x: transform.offsetX,
    y: transform.offsetY,
    width: image.width() * transform.scale,
    height: image.height() * transform.scale,
  };
  const game = usePhotoPinball(rect.width, rect.height, [rect.x, rect.y], occlusion, foreground);

  return (
    <GestureHandlerRootView style={StyleSheet.absoluteFill}>
      <GestureDetector gesture={game.gesture}>
        <Canvas
          style={StyleSheet.absoluteFill}
          accessible
          accessibilityLabel="Pinball playfield"
          accessibilityHint="Flick to aim or double-tap to launch straight."
          onAccessibilityTap={game.straightShot}
        >
          <Image image={image} fit="fill" {...rect} />
          {game.bumpers.map(({ x, y, radius }, index) => (
            <Circle
              key={index}
              cx={rect.x + x}
              cy={rect.y + y}
              r={radius}
              color={colors.accent}
              opacity={0.85}
              style="stroke"
              strokeWidth={tokens.spacing.xxs}
            />
          ))}
          {ballEffect && (
            <Rect rect={rect}>
              <Shader source={ballEffect} uniforms={game.uniforms}>
                <ImageShader
                  image={depth}
                  fit="fill"
                  rect={rect}
                  tx="clamp"
                  ty="clamp"
                  sampling={{ filter: FilterMode.Linear }}
                />
              </Shader>
            </Rect>
          )}
        </Canvas>
      </GestureDetector>
      <View style={styles.controls}>
        <AppText variant="caption" style={[styles.label, { backgroundColor: colors.surface }]}>
          {occlusion ? 'Depth on' : 'Depth off'}
        </AppText>
        <PhotoActionButton
          iconName={occlusion ? 'layers-outline' : 'square-outline'}
          label={occlusion ? 'Turn depth off' : 'Turn depth on'}
          disabled={false}
          size="small"
          onPress={() => setOcclusion((value) => !value)}
        />
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  controls: {
    position: 'absolute',
    right: tokens.spacing.sm,
    bottom: tokens.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
  },
  label: {
    borderRadius: tokens.radius.pill,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: tokens.spacing.xs,
    overflow: 'hidden',
  },
});
