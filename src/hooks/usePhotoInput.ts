import { useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { Skia, type SkImage } from '@shopify/react-native-skia';
import RNBlobUtil from 'react-native-blob-util';

import type { PickedImage } from '@/components/PhotoPicker';
import { pickImage, skImageToBuffer } from '@/lib/image';

/** Decodes a picked photo once and shares the resulting Skia image and pixels with the preview and model. */
export function usePhotoInput(
  onPick: (image: PickedImage | null) => void,
  targetWidth: number | null = 800,
  onError?: (message: string) => void
) {
  const [photo, setPhoto] = useState<{ uri: string; image: SkImage } | null>(null);
  const [picking, setPicking] = useState(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const choose = async (source: 'library' | 'camera') => {
    if (picking) return;
    setPicking(true);
    try {
      const uri = await pickImage(source, targetWidth ?? undefined);
      if (!uri || !mounted.current) return;
      const path = uri.startsWith('file://') ? decodeURIComponent(uri.slice(7)) : uri;
      const encoded = await RNBlobUtil.fs.readFile(path, 'base64');
      if (!mounted.current) return;
      const data = Skia.Data.fromBase64(encoded);
      try {
        const image = Skia.Image.MakeImageFromEncoded(data);
        if (!image) throw new Error('Could not open this photo. Try another image.');
        const buffer = skImageToBuffer(image);
        setPhoto({ uri, image });
        onPick({ uri, buffer, width: image.width(), height: image.height() });
      } finally {
        data.dispose();
      }
    } catch (cause) {
      if (!mounted.current) return;
      const message = cause instanceof Error ? cause.message : String(cause);
      if (onError) onError(message);
      else Alert.alert('Could not open photo', message);
    } finally {
      if (mounted.current) setPicking(false);
    }
  };

  const clear = () => {
    setPhoto(null);
    onPick(null);
  };
  return { image: photo?.image ?? null, uri: photo?.uri ?? null, choose, clear, picking };
}
