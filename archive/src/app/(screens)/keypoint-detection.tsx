import { useState } from 'react';
import {
  models,
  useKeypointDetector,
  type CocoLandmark,
  type KeypointDetection,
} from 'react-native-executorch';

import { KeypointOverlay } from '@/components/KeypointOverlay';
import { PhotoPicker, type PickedImage } from '@/components/PhotoPicker';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { TaskScreen } from '@/components/TaskScreen';

import { deleteCachedFiles } from '@/lib/deleteCachedFiles';

const MODEL = models.keypointDetection.YOLO26_POSE.SIZE_384.DEFAULT;

function KeypointDetectionTask() {
  const [loaded, setLoaded] = useState(false);
  const [image, setImage] = useState<PickedImage | null>(null);
  const [results, setResults] = useState<KeypointDetection<'xyxy', CocoLandmark>[]>([]);
  const [latency, setLatency] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const detector = useKeypointDetector(MODEL, { preventLoad: !loaded });

  const run = async () => {
    if (!image || !detector.detectKeypoints) return;
    setBusy(true);
    setResults([]);
    setLatency(null);
    setError(null);
    try {
      const t0 = Date.now();
      const output = await detector.detectKeypoints(image.buffer);
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
      title="Pose Estimation"
      subtitle="YOLO26 Pose"
      status={{ ...detector, error: error || detector.error }}
      onLoadModel={!loaded ? () => setLoaded(true) : undefined}
      canRun={!!image && detector.isReady}
      busy={busy}
      onRun={run}
      runLabel="Estimate Pose"
      onDeleteModel={async () => {
        await deleteCachedFiles(detector.resource);
        setLoaded(false);
      }}
      meta={latency != null ? `Inference ${latency} ms` : undefined}
    >
      <PhotoPicker
        busy={busy}
        onPick={(img) => {
          setImage(img);
          setResults([]);
          setLatency(null);
          setError(null);
        }}
        renderOverlay={(transform) => (
          <KeypointOverlay detections={results} transform={transform} />
        )}
      />
    </TaskScreen>
  );
}

export default function KeypointDetectionScreen() {
  return (
    <ScreenWrapper>
      <KeypointDetectionTask />
    </ScreenWrapper>
  );
}
