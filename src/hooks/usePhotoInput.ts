import { useEffect, useRef, useState } from 'react';
import { useImage } from '@shopify/react-native-skia';

import type { PickedImage } from '@/components/PhotoPicker';
import { pickImage, skImageToBuffer } from '@/lib/image';

/** Shared CV/chat input: decodes the picked URI with Skia, publishes its raw pixels, and exposes that same image for the canvas. */
export function usePhotoInput(
  onPick: (image: PickedImage | null) => void,
  targetWidth: number | null = 800,
  onError?: (message: string) => void
) {
  const [uri, setUri] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const image = useImage(uri, () => {
    onPick(null);
    onError?.('Could not open this photo. Try another image.');
  });
  const choose = async (source: 'library' | 'camera') => {
    if (picking) return;
    setPicking(true);
    try {
      const widthToUse = targetWidth === null ? undefined : targetWidth;
      const picked = await pickImage(source, widthToUse);
      if (!picked || !mounted.current) return;
      onPick(null);
      setUri(picked);
    } catch (cause) {
      if (onError) {
        if (mounted.current) onError(cause instanceof Error ? cause.message : String(cause));
      } else throw cause;
    } finally {
      if (mounted.current) setPicking(false);
    }
  };
  useEffect(() => {
    if (!image || !uri) return;
    onPick({ uri, buffer: skImageToBuffer(image), width: image.width(), height: image.height() });
    // Publish once per decoded photo, exactly as in the CV PhotoPicker.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [image, uri]);
  const clear = () => {
    setUri(null);
    onPick(null);
  };
  return { image, uri, choose, clear, picking };
}
