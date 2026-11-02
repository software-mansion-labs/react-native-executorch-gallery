import { useEffect, useRef, useState } from 'react';
import type { SkImage } from '@shopify/react-native-skia';
import type { InstanceSegmentationResult } from 'react-native-executorch';

import { bufferToSkImage } from '@/lib/image';

const EMPTY_IMAGES: (SkImage | null)[] = [];

/**
 * Decodes instance masks after commit and returns images matching the supplied results.
 * Superseded images are disposed only after the canvas stops drawing them. Pending
 * decoding is cancelled on replacement or unmount; the final displayed images are
 * left to Skia's collector, as in useDisposableImage, to support Strict Mode remounts.
 */
export function useInstanceMasks(instances: InstanceSegmentationResult<'xyxy', string>[]) {
  const [decoded, setDecoded] = useState<{
    source: typeof instances;
    images: (SkImage | null)[];
  } | null>(null);
  const images = decoded?.source === instances ? decoded.images : EMPTY_IMAGES;
  const renderedRef = useRef(EMPTY_IMAGES);

  useEffect(() => {
    if (!instances.length) return;
    let cancelled = false;
    // Schedule native image allocation after commit, never during React rendering.
    queueMicrotask(() => {
      if (cancelled) return;
      const next = instances.map((instance) => {
        try {
          return bufferToSkImage(instance.mask);
        } catch (cause) {
          console.warn('Failed to decode instance mask image:', cause);
          return null;
        }
      });
      setDecoded({ source: instances, images: next });
    });
    return () => {
      cancelled = true;
    };
  }, [instances]);

  useEffect(() => {
    const superseded = renderedRef.current;
    renderedRef.current = images;
    if (superseded !== images) superseded.forEach((image) => image?.dispose());
  }, [images]);

  return images;
}
