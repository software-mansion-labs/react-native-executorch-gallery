import { useState } from 'react';
import { models, useOpticalCharacterRecognizer, type OcrDetection } from 'react-native-executorch';

import { OcrOverlay } from '@/components/OcrOverlay';
import { PhotoPicker, type PickedImage } from '@/components/PhotoPicker';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { TaskScreen } from '@/components/TaskScreen';

import { deleteCachedFiles } from '@/lib/deleteCachedFiles';

const MODEL = models.ocr.PADDLE.PPOCRV6_SMALL.DEFAULT;

function OcrTask() {
  const [loaded, setLoaded] = useState(false);
  const [image, setImage] = useState<PickedImage | null>(null);
  const [results, setResults] = useState<OcrDetection[]>([]);
  const [latency, setLatency] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ocr = useOpticalCharacterRecognizer(MODEL, { preventLoad: !loaded });

  const run = async () => {
    if (!image || !ocr.recognizeCharacters) return;
    setBusy(true);
    setResults([]);
    setLatency(null);
    setError(null);
    try {
      const t0 = Date.now();
      const output = await ocr.recognizeCharacters(image.buffer);
      setLatency(Date.now() - t0);
      setResults(output);
    } catch (err: any) {
      setError(err?.message ?? String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <TaskScreen
      title="OCR Text Recognition"
      subtitle="PaddleOCR PP-OCRv6"
      status={{ ...ocr, error: error || ocr.error }}
      onLoadModel={!loaded ? () => setLoaded(true) : undefined}
      canRun={!!image && ocr.isReady}
      busy={busy}
      onRun={run}
      runLabel="Recognize Text"
      onDeleteModel={async () => {
        await deleteCachedFiles(ocr.resource);
        setLoaded(false);
      }}
      meta={latency != null ? `Inference ${latency} ms` : undefined}
    >
      <PhotoPicker
        targetWidth={null}
        busy={busy}
        onPick={(img) => {
          setImage(img);
          setResults([]);
          setLatency(null);
          setError(null);
        }}
        renderOverlay={(transform) => <OcrOverlay detections={results} transform={transform} />}
      />
    </TaskScreen>
  );
}

export default function OCRScreen() {
  return (
    <ScreenWrapper>
      <OcrTask />
    </ScreenWrapper>
  );
}
