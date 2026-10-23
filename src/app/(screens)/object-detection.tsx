import { useState } from 'react';
import { models, useObjectDetector, type ObjectDetection } from 'react-native-executorch';

import { DetectionOverlay } from '@/components/DetectionOverlay';
import { PhotoPicker, type PickedImage } from '@/components/PhotoPicker';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { TaskScreen } from '@/components/TaskScreen';
import { useModelControls } from '@/hooks/useModelControls';

const MODEL = models.objectDetection.SSDLITE320_MOBILENET_V3_LARGE.DEFAULT;

function ObjectDetectionTask() {
  const controls = useModelControls();
  const detector = useObjectDetector(MODEL, { preventLoad: !controls.loaded });
  const [image, setImage] = useState<PickedImage | null>(null);
  const [results, setResults] = useState<ObjectDetection<'xyxy', string>[] | null>(null);
  const [latency, setLatency] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    if (!image || !detector.isReady || !detector.detectObjects || busy || controls.deleting) return;
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
    <TaskScreen
      title="Object detection"
      subtitle="SSDLite MobileNetV3"
      status={detector}
      loaded={controls.loaded}
      deleting={controls.deleting}
      error={error || controls.error}
      busy={busy}
      onLoadModel={controls.load}
      onUnloadModel={controls.unload}
      onDeleteModel={() => controls.remove(detector.resource?.modelPath)}
      modelMenuVisible={controls.menuVisible}
      onOpenModelMenu={controls.openMenu}
      onCloseModelMenu={controls.closeMenu}
    >
      <PhotoPicker
        busy={busy || controls.deleting}
        onChooseModel={controls.openMenu}
        onRun={run}
        canRun={!!image && detector.isReady && controls.loaded}
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
