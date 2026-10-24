import { StyleSheet } from 'react-native';
import {
  Canvas,
  Circle,
  FilterMode,
  Image as SkiaImage,
  ImageShader,
  Rect,
  Shader,
  Skia,
  type SkImage,
} from '@shopify/react-native-skia';
import { GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';

import type { ViewportTransform } from '@/components/PhotoPicker';
import { useDepthPhoto } from '@/hooks/useDepthPhoto';
import { DEPTH_FOCUS_SHADER } from '@/lib/depth-focus-shader';
import { tokens } from '@/theme';

const effect = Skia.RuntimeEffect.Make(DEPTH_FOCUS_SHADER);

/** Renders the original Skia photo and depth texture together; tapping refocuses without another inference. */
export function DepthPhoto({
  image,
  depthTexture,
  transform,
}: {
  image: SkImage;
  depthTexture: SkImage;
  transform: ViewportTransform;
}) {
  const photo = useDepthPhoto(image.width(), image.height(), transform);
  return (
    <GestureHandlerRootView style={StyleSheet.absoluteFill}>
      <GestureDetector gesture={photo.tap}>
        <Canvas
          style={StyleSheet.absoluteFill}
          accessible
          accessibilityLabel="Photo with adjustable focus"
          accessibilityHint="Tap a subject to focus. Double-tap with a screen reader to focus the center."
          onAccessibilityTap={photo.focusCenter}
        >
          {effect ? (
            <Rect rect={photo.rect}>
              <Shader source={effect} uniforms={photo.uniforms}>
                <ImageShader
                  image={image}
                  fit="fill"
                  rect={photo.rect}
                  tx="clamp"
                  ty="clamp"
                  sampling={{ filter: FilterMode.Linear }}
                />
                <ImageShader
                  image={depthTexture}
                  fit="fill"
                  rect={photo.rect}
                  tx="clamp"
                  ty="clamp"
                  sampling={{ filter: FilterMode.Linear }}
                />
              </Shader>
            </Rect>
          ) : (
            <SkiaImage image={image} fit="contain" {...photo.rect} />
          )}
          <Circle
            cx={photo.focusCx}
            cy={photo.focusCy}
            r={tokens.layout.depthFocusRadius}
            style="stroke"
            strokeWidth={tokens.layout.depthFocusStroke}
            color={tokens.annotation.text}
            opacity={photo.marker}
          />
        </Canvas>
      </GestureDetector>
    </GestureHandlerRootView>
  );
}
