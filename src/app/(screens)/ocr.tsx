import { useState } from 'react';
import { models, useOpticalCharacterRecognizer, type OcrDetection } from 'react-native-executorch';

import { ModelSetup } from '@/components/ModelSetup';
import { OcrOverlay } from '@/components/OcrOverlay';
import { OcrResult } from '@/components/OcrResult';
import { PhotoPicker, type PickedImage } from '@/components/PhotoPicker';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { TaskScreen } from '@/components/TaskScreen';
import { useModelControls } from '@/hooks/useModelControls';
import { useOcrPresentation } from '@/hooks/useOcrPresentation';
import { useTaskState } from '@/hooks/useTaskState';

const MODEL = models.ocr.PADDLE.PPOCRV6_SMALL.DEFAULT;

function OcrTask() {
  const model = useModelControls(MODEL.modelPath, { name: 'PaddleOCR PP-OCRv6' });
  const [image, setImage] = useTaskState<PickedImage | null>(null, model.revision);
  const [results, setResults] = useTaskState<OcrDetection[] | null>(null, model.revision);
  const [latency, setLatency] = useTaskState<number | null>(null, model.revision);
  const [error, setError] = useTaskState<string | null>(null, model.revision);
  const [busy, setBusy] = useState(false);
  const presentation = useOcrPresentation(results);

  const ocr = useOpticalCharacterRecognizer(MODEL, { preventLoad: !model.loaded });

  const run = async () => {
    if (!image || !model.loaded || !ocr.isReady || !ocr.recognizeCharacters) return;
    if (busy || model.deleting) return;
    setBusy(true);
    setResults(null);
    setLatency(null);
    setError(null);
    try {
      const started = performance.now();
      const output = await ocr.recognizeCharacters(image.buffer);
      setLatency(Math.round(performance.now() - started));
      setResults(output);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <TaskScreen title="Text recognition" model={model} status={ocr} error={error} busy={busy}>
      <PhotoPicker
        key={model.revision}
        targetWidth={null}
        placeholderTitle="Read between the pixels."
        placeholderDescription="Find text in your photo, then select or copy what it says."
        busy={busy || model.deleting}
        canPick={model.prepared && model.loaded && ocr.isReady}
        setupAction={<ModelSetup model={model} status={ocr} disabled={busy} />}
        onRun={run}
        canRun={model.prepared && !!image && ocr.isReady && model.loaded}
        running={busy}
        resultsContent={<OcrResult presentation={presentation} latency={latency} />}
        onPick={(picked) => {
          setImage(picked);
          setResults(null);
          setLatency(null);
          setError(null);
        }}
        renderOverlay={(transform) =>
          results && (
            <OcrOverlay detections={results} transform={transform} onSelect={presentation.open} />
          )
        }
      />
    </TaskScreen>
  );
}

export default function OcrScreen() {
  return (
    <ScreenWrapper unmountOnBlur>
      <OcrTask />
    </ScreenWrapper>
  );
}
