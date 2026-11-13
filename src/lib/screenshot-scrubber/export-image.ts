import { ImageFormat, Skia } from '@shopify/react-native-skia';
import RNBlobUtil from 'react-native-blob-util';

import type { PickedImage } from '@/components/PhotoPicker';
import { regionRect, type ScrubberRegion } from '@/lib/screenshot-scrubber/regions';

/** Writes a fresh flattened PNG with solid masks, preserving source resolution and no source metadata. */
export async function exportScrubbedImage(
  image: PickedImage,
  regions: readonly ScrubberRegion[],
  ink: string
) {
  const data = await Skia.Data.fromURI(image.uri);
  const source = Skia.Image.MakeImageFromEncoded(data);
  const surface = Skia.Surface.MakeOffscreen(image.width, image.height);
  if (!source || !surface) {
    source?.dispose();
    surface?.dispose();
    throw new Error('Could not create the redacted image.');
  }
  const paint = Skia.Paint();
  let snapshot;
  try {
    const canvas = surface.getCanvas();
    canvas.drawImage(source, 0, 0);
    paint.setColor(Skia.Color(ink));
    paint.setAntiAlias(false);
    for (const region of regions) {
      if (!region.hidden) continue;
      const rect = regionRect(region, image.width, image.height);
      canvas.drawRect(Skia.XYWHRect(rect.x, rect.y, rect.width, rect.height), paint);
    }
    surface.flush();
    snapshot = surface.makeImageSnapshot();
    const path = `${RNBlobUtil.fs.dirs.CacheDir}/scrubbed-${Date.now()}.png`;
    await RNBlobUtil.fs.writeFile(path, snapshot.encodeToBase64(ImageFormat.PNG), 'base64');
    return `file://${path}`;
  } finally {
    snapshot?.dispose();
    paint.dispose();
    surface.dispose();
    source.dispose();
  }
}
