import { BlurStyle, Skia, TileMode } from '@shopify/react-native-skia';
import { tokens } from '@/theme';

export const RAIN_COUNT = 600;
export const DROP_TEXTURE = { width: 24, height: 96, anchorX: 12, anchorY: 86 };

/** Generates one transparent, tapered water streak with a soft rim and a bright rounded head. */
export function createRainTexture() {
  const surface = Skia.Surface.MakeOffscreen(DROP_TEXTURE.width, DROP_TEXTURE.height);
  if (!surface) return null;
  const canvas = surface.getCanvas();
  const builder = Skia.PathBuilder.Make();
  builder.moveTo(12, 5);
  builder.cubicTo(11, 36, 8, 68, 8, 81);
  builder.cubicTo(8, 89, 16, 89, 16, 81);
  builder.cubicTo(16, 68, 13, 36, 12, 5);
  builder.close();
  const path = builder.detach();
  builder.dispose();
  const faint = Skia.Color(tokens.rain.distant);
  faint[3] = 0;
  const paint = Skia.Paint();
  paint.setAntiAlias(true);
  paint.setShader(
    Skia.Shader.MakeLinearGradient(
      { x: 12, y: 5 },
      { x: 12, y: 86 },
      [faint, Skia.Color(tokens.rain.drop), Skia.Color(tokens.rain.highlight)],
      [0, 0.65, 1],
      TileMode.Clamp
    )
  );
  paint.setAlphaf(0.3);
  paint.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, 2, true));
  canvas.drawPath(path, paint);
  paint.setAlphaf(0.85);
  paint.setMaskFilter(null);
  canvas.drawPath(path, paint);
  path.dispose();
  const snapshot = surface.makeImageSnapshot();
  const image = snapshot.makeNonTextureImage();
  snapshot.dispose();
  surface.dispose();
  return image;
}
