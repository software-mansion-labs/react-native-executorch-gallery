import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { AlphaType, ColorType, Skia, type SkImage } from '@shopify/react-native-skia';
import type { ImageBuffer } from 'react-native-executorch/cv';

/** Skia pixel layouts for the buffer formats the vision tasks emit. */
const PIXEL_LAYOUTS = {
  rgba: { colorType: ColorType.RGBA_8888, bytesPerPixel: 4 },
  gray: { colorType: ColorType.Alpha_8, bytesPerPixel: 1 },
} as const;

/**
 * Decode a Skia image into the raw RGBA/HWC {@link ImageBuffer} that
 * react-native-executorch vision tasks consume.
 */
export function skImageToBuffer(image: SkImage): ImageBuffer {
  const pixels = image.readPixels();
  if (!(pixels instanceof Uint8Array)) {
    throw new Error('Could not read pixels from the selected image.');
  }
  return {
    data: pixels,
    width: image.width(),
    height: image.height(),
    format: 'rgba',
    layout: 'hwc',
  };
}

/**
 * Decode a raw {@link ImageBuffer} produced by a vision task into an `SkImage`.
 *
 * Both `Skia.Data.fromBytes` and `Skia.Image.MakeImage` copy the pixels into
 * native memory and register their size as external memory pressure on the JS
 * heap, so this must never run during render — call it once from an event
 * handler or effect and keep only the returned image. The caller owns the
 * result and should `dispose()` it once it is no longer rendered.
 *
 * @param buffer Raw `rgba` or `gray` HWC buffer returned by a task.
 * @returns The decoded image, or `null` if the buffer is empty or its format is
 * not one Skia can raster directly.
 */
export function bufferToSkImage(buffer: ImageBuffer): SkImage | null {
  const layout = PIXEL_LAYOUTS[buffer.format as keyof typeof PIXEL_LAYOUTS];
  if (!layout || buffer.width <= 0 || buffer.height <= 0) return null;

  const info = {
    width: buffer.width,
    height: buffer.height,
    colorType: layout.colorType,
    alphaType: AlphaType.Premul,
  };
  return Skia.Image.MakeImage(
    info,
    Skia.Data.fromBytes(buffer.data),
    buffer.width * layout.bytesPerPixel
  );
}

/**
 * Pick an image from the library or camera.
 * If `targetWidth` is provided, downscales the image; otherwise preserves full original resolution.
 */
export async function pickImage(
  source: 'camera' | 'library',
  targetWidth?: number
): Promise<string | undefined> {
  const permission =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    Alert.alert('Permission required', `Please allow ${source} access to continue.`);
    return;
  }

  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1 };
  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled || !result.assets[0]) return;

  if (targetWidth != null) {
    const rendered = await ImageManipulator.manipulate(result.assets[0].uri)
      .resize({ width: targetWidth })
      .renderAsync();
    const saved = await rendered.saveAsync({ format: SaveFormat.PNG });
    return saved.uri;
  }

  return result.assets[0].uri;
}
