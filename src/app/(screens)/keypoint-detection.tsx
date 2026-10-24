import { useState } from 'react';
import {
  models,
  useKeypointDetector,
  type CocoLandmark,
  type KeypointDetection,
} from 'react-native-executorch';

import { KeypointOverlay } from '@/components/KeypointOverlay';
import { ModelSetup } from '@/components/ModelSetup';
import { PhotoPicker, type PickedImage } from '@/components/PhotoPicker';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { TaskScreen } from '@/components/TaskScreen';
import { useModelControls } from '@/hooks/useModelControls';
import { useTaskState } from '@/hooks/useTaskState';

const MODEL = models.keypointDetection.YOLO26_POSE.SIZE_384.DEFAULT;

function PoseEstimationTask() {
  const model = useModelControls(MODEL.modelPath, { name: 'YOLO26 Pose' });
  const [image, setImage] = useTaskState<PickedImage | null>(null, model.revision);
  const [results, setResults] = useTaskState<KeypointDetection<'xyxy', CocoLandmark>[] | null>(
    null,
    model.revision
  );
  const [latency, setLatency] = useTaskState<number | null>(null, model.revision);
  const [error, setError] = useTaskState<string | null>(null, model.revision);
  const [busy, setBusy] = useState(false);

  const detector = useKeypointDetector(MODEL, { preventLoad: !model.loaded });

  const run = async () => {
    if (!image || !model.loaded || !detector.isReady || !detector.detectKeypoints) return;
    if (busy || model.deleting) return;
    setBusy(true);
    setResults(null);
    setLatency(null);
    setError(null);
    try {
      const started = performance.now();
      const output = await detector.detectKeypoints(image.buffer);
      setLatency(Math.round(performance.now() - started));
      setResults(output);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <TaskScreen title="Pose estimation" model={model} status={detector} error={error} busy={busy}>
      <PhotoPicker
        key={model.revision}
        placeholderTitle="Find the pose."
        placeholderDescription="Trace body joints and connect them into a skeleton."
        busy={busy || model.deleting}
        canPick={model.prepared && model.loaded && detector.isReady}
        setupAction={<ModelSetup model={model} status={detector} disabled={busy} />}
        onRun={run}
        canRun={model.prepared && !!image && detector.isReady && model.loaded}
        running={busy}
        result={
          results
            ? `${results.length} ${results.length === 1 ? 'person' : 'people'} found`
            : undefined
        }
        latency={latency}
        onPick={(picked) => {
          setImage(picked);
          setResults(null);
          setLatency(null);
          setError(null);
        }}
        renderOverlay={(transform) =>
          results && <KeypointOverlay detections={results} transform={transform} />
        }
      />
    </TaskScreen>
  );
}

export default function PoseEstimationScreen() {
  return (
    <ScreenWrapper unmountOnBlur>
      <PoseEstimationTask />
    </ScreenWrapper>
  );
}
