import { useState } from 'react';
import { models, useObjectDetector, type ObjectDetection } from 'react-native-executorch';

import { DetectionOverlay } from '@/components/DetectionOverlay';
import { PhotoPicker, type PickedImage } from '@/components/PhotoPicker';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { TaskScreen } from '@/components/TaskScreen';

import { deleteCachedFiles } from '@/lib/deleteCachedFiles';

const MODEL = models.objectDetection.SSDLITE320_MOBILENET_V3_LARGE.DEFAULT;

function ObjectDetectionTask() {
  const [loaded, setLoaded] = useState(false);
  const [image, setImage] = useState<PickedImage | null>(null);
  const [results, setResults] = useState<ObjectDetection<'xyxy', string>[]>([]);
  const [latency, setLatency] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const detector = useObjectDetector(MODEL, { preventLoad: !loaded });

  const run = async () => {
    if (!image || !detector.detectObjects) return;
    setBusy(true);
    setResults([]);
    setLatency(null);
    setError(null);
    try {
      const t0 = Date.now();
      const output = await detector.detectObjects(image.buffer);
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
      title="Object Detection"
      subtitle="SSDLite MobileNetV3"
      status={{ ...detector, error: error || detector.error }}
      onLoadModel={!loaded ? () => setLoaded(true) : undefined}
      canRun={!!image && detector.isReady}
      busy={busy}
      onRun={run}
      runLabel="Detect Objects"
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
          <DetectionOverlay detections={results} transform={transform} />
        )}
      />
    </TaskScreen>
  );
}

export default function ObjectDetectionScreen() {
  return (
    <ScreenWrapper>
      <ObjectDetectionTask />
    </ScreenWrapper>
  );
}
