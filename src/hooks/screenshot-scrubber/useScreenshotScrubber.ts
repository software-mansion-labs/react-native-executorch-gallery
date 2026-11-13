import { useEffect, useRef, useState } from 'react';
import { Share } from 'react-native';
import { models, useOpticalCharacterRecognizer, usePrivacyFilter } from 'react-native-executorch';

import type { PickedImage } from '@/components/PhotoPicker';
import type { ModelControls } from '@/hooks/useModelControls';
import { exportScrubbedImage } from '@/lib/screenshot-scrubber/export-image';
import {
  indexRegions,
  markPrivateRegions,
  type ScrubberRegion,
} from '@/lib/screenshot-scrubber/regions';

const OCR = models.ocr.PADDLE.PPOCRV6_SMALL.XNNPACK;
const PRIVACY = models.privacyFilter.OPENAI.XNNPACK_8DA4W;
export const SCRUBBER_SOURCES = [OCR.modelPath, PRIVACY.modelPath];
export type ScrubberResult = { regions: ScrubberRegion[]; latency: number };

/**
 * Composes existing OCR and PII hooks after explicit model preparation. Tracks exact source offsets,
 * review masks and sequential inference. Ignores late results after leaving the screen.
 * @param model Shared download, preparation and deletion controls.
 * @returns Model status, image/result state, guarded inference, region review and flattened PNG sharing.
 */
export function useScreenshotScrubber(model: ModelControls) {
  const ocr = useOpticalCharacterRecognizer(OCR, { preventLoad: !model.loaded });
  const privacy = usePrivacyFilter(PRIVACY, { preventLoad: !model.loaded });
  const [image, setImage] = useState<PickedImage | null>(null);
  const [result, setResult] = useState<ScrubberResult | null>(null);
  const [phase, setPhase] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exported, setExported] = useState<string | null>(null);
  const active = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const status = {
    isReady: ocr.isReady && privacy.isReady,
    downloadProgress: Math.min(ocr.downloadProgress, privacy.downloadProgress),
    resource: ocr.resource && privacy.resource,
    error: ocr.error || privacy.error,
  };
  const pick = (picked: PickedImage | null) => {
    if (active.current) return;
    setImage(picked);
    setResult(null);
    setExported(null);
    setError(null);
  };
  const run = async () => {
    if (
      !image ||
      !model.prepared ||
      !model.loaded ||
      !status.isReady ||
      !ocr.recognizeCharacters ||
      !privacy.detectPii ||
      active.current ||
      model.deleting
    )
      return;
    active.current = true;
    setError(null);
    setResult(null);
    setExported(null);
    setPhase('Reading text…');
    try {
      const started = performance.now();
      const detections = await ocr.recognizeCharacters(image.buffer, { confidenceThreshold: 0.2 });
      if (!mounted.current) return;
      const indexed = indexRegions(detections);
      setPhase('Finding private details…');
      const entities = indexed.text.trim() ? await privacy.detectPii(indexed.text) : [];
      if (!mounted.current) return;
      setResult({
        regions: markPrivateRegions(indexed.regions, entities),
        latency: Math.round(performance.now() - started),
      });
    } catch (cause) {
      if (mounted.current) setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      active.current = false;
      if (mounted.current) setPhase(null);
    }
  };
  const toggle = (id: number) => {
    if (active.current) return;
    setExported(null);
    setResult(
      (previous) =>
        previous && {
          ...previous,
          regions: previous.regions.map((region) =>
            region.id === id ? { ...region, hidden: !region.hidden } : region
          ),
        }
    );
  };
  const share = async (ink: string) => {
    if (!image || !result || active.current || model.deleting) return;
    active.current = true;
    setError(null);
    setPhase('Creating redacted PNG…');
    try {
      const uri = await exportScrubbedImage(image, result.regions, ink);
      if (!mounted.current) return;
      setExported(uri);
      setPhase('Sharing redacted PNG…');
      await Share.share({ url: uri });
    } catch (cause) {
      if (mounted.current) setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      active.current = false;
      if (mounted.current) setPhase(null);
    }
  };
  return {
    status,
    image,
    result,
    phase,
    busy: phase !== null,
    error,
    exported,
    pick,
    run,
    toggle,
    share,
  };
}
