import { useState } from 'react';
import { models, useObjectDetector, type ObjectDetection } from 'react-native-executorch';

import { DetectionOverlay } from '@/components/object-detection/DetectionOverlay';
import { ModelSetup } from '@/components/ModelSetup';
import { PhotoPicker, type PickedImage } from '@/components/PhotoPicker';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { TaskScreen } from '@/components/TaskScreen';
import { useModelControls } from '@/hooks/useModelControls';
import { useTaskState } from '@/hooks/useTaskState';

const MODEL = models.objectDetection.SSDLITE320_MOBILENET_V3_LARGE.DEFAULT;

function ObjectDetectionTask() {
  const model = useModelControls(MODEL.modelPath, { name: 'SSDLite MobileNetV3' });
  const [image, setImage] = useTaskState<PickedImage | null>(null, model.revision);
  const [results, setResults] = useTaskState<ObjectDetection<'xyxy', string>[] | null>(
    null,
    model.revision
  );
  const [latency, setLatency] = useTaskState<number | null>(null, model.revision);
  const [error, setError] = useTaskState<string | null>(null, model.revision);
  const [busy, setBusy] = useState(false);

  const detector = useObjectDetector(MODEL, { preventLoad: !model.loaded });

  const run = async () => {
    if (!image || !model.loaded || !detector.isReady || !detector.detectObjects) return;
    if (busy || model.deleting) return;
    setBusy(true);
    setResults(null);
    setLatency(null);
    setError(null);
    try {
      const started = performance.now();
      const output = await detector.detectObjects(image.buffer);
      setLatency(Math.round(performance.now() - started));
      setResults(output);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <TaskScreen title="Object detection" model={model} status={detector} error={error} busy={busy}>
      <PhotoPicker
        key={model.revision}
        busy={busy || model.deleting}
        canPick={model.prepared && model.loaded && detector.isReady}
        setupAction={<ModelSetup model={model} status={detector} disabled={busy} />}
        onRun={run}
        canRun={model.prepared && !!image && detector.isReady && model.loaded}
        running={busy}
        result={
          results
            ? `${results.length} ${results.length === 1 ? 'object' : 'objects'} found`
            : undefined
        }
        latency={latency}
        onPick={(picked) => {
          setImage(picked);
          setResults(null);
          setLatency(null);
          setError(null);
        }}
        renderOverlay={(transform) => (
          <DetectionOverlay detections={results ?? []} transform={transform} />
        )}
      />
    </TaskScreen>
  );
}

export default function ObjectDetectionScreen() {
  return (
    <ScreenWrapper unmountOnBlur>
      <ObjectDetectionTask />
    </ScreenWrapper>
  );
}
