import { useEffect, useRef, useState } from 'react';
import type { SkImage } from '@shopify/react-native-skia';

/**
 * Holds a single task-output `SkImage` and releases replaced ones eagerly.
 *
 * Every `SkImage` registers its byte size as external memory pressure on the JS
 * heap, so leaving superseded frames to the garbage collector lets several
 * full-resolution images accumulate before anything is reclaimed. Disposal runs
 * from an effect rather than from the setter, so an image is only freed once
 * React has committed a tree that no longer draws it — freeing it any earlier
 * would leave the canvas holding a disposed handle.
 *
 * The final image is left to the collector on unmount: the screen and its
 * canvas go away together, and an eager dispose there would break under
 * `StrictMode`, whose simulated remount would free an image still in use.
 *
 * @returns The current image and a setter for replacing it.
 */
export function useDisposableImage() {
  const [image, setImage] = useState<SkImage | null>(null);
  const renderedRef = useRef<SkImage | null>(null);

  useEffect(() => {
    const superseded = renderedRef.current;
    renderedRef.current = image;
    if (superseded && superseded !== image) superseded.dispose();
  }, [image]);

  return [image, setImage] as const;
}
