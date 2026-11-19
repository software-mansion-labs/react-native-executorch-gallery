import { StyleSheet, View } from 'react-native';
import { GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  Canvas,
  FilterMode,
  Image,
  ImageShader,
  Rect,
  Shader,
  Skia,
  type SkImage,
} from '@shopify/react-native-skia';

import { PhotoActionButton } from '@/components/PhotoActionButton';
import type { ViewportTransform } from '@/components/PhotoPicker';
import { usePhotoPinball } from '@/hooks/usePhotoPinball';
import type { ForegroundBumper } from '@/lib/photo-pinball/foreground-bumper';
import type { TableDepthGradient } from '@/lib/photo-pinball/table-plane';
import { tokens } from '@/theme';

const ballEffect = Skia.RuntimeEffect.Make(`
uniform shader depth;
uniform float2 origin;
uniform float2 size;
uniform float2 center;
uniform float radius;

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
  float visible = 1.0 - smoothstep(0.055, 0.11, foreground);

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
  gradient,
}: {
  image: SkImage;
  depth: SkImage;
  transform: ViewportTransform;
  foreground: ForegroundBumper | null;
  gradient: TableDepthGradient;
}) {
  const rect = {
    x: transform.offsetX,
    y: transform.offsetY,
    width: image.width() * transform.scale,
    height: image.height() * transform.scale,
  };
  const game = usePhotoPinball(rect.width, rect.height, [rect.x, rect.y], foreground, gradient);

  return (
    <GestureHandlerRootView style={StyleSheet.absoluteFill}>
      <GestureDetector gesture={game.swipe}>
        <Canvas style={StyleSheet.absoluteFill} accessibilityLabel="Photo bounce test">
          <Image image={image} fit="fill" {...rect} />
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
      {foreground && (
        <View style={styles.controls}>
          <PhotoActionButton
            iconName="play"
            label="Run bounce test"
            disabled={false}
            size="small"
            onPress={game.runTest}
          />
        </View>
      )}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  controls: {
    position: 'absolute',
    right: tokens.spacing.sm,
    bottom: tokens.spacing.sm,
  },
});
