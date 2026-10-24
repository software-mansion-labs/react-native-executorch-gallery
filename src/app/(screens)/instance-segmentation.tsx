import { useState } from 'react';
import {
  models,
  useInstanceSegmenter,
  type CocoClassYolo,
  type InstanceSegmentationResult,
} from 'react-native-executorch';

import { InstanceSegmentationOverlay } from '@/components/InstanceSegmentationOverlay';
import { ModelSetup } from '@/components/ModelSetup';
import { PhotoPicker, type PickedImage } from '@/components/PhotoPicker';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { TaskScreen } from '@/components/TaskScreen';
import { useModelControls } from '@/hooks/useModelControls';
import { useTaskState } from '@/hooks/useTaskState';

const MODEL = models.instanceSegmentation.YOLO26.NANO.SIZE_384.DEFAULT;

function InstanceSegmentationTask() {
  const model = useModelControls(MODEL.modelPath, { name: 'YOLO26 Nano' });
  const [image, setImage] = useTaskState<PickedImage | null>(null, model.revision);
  const [results, setResults] = useTaskState<
    InstanceSegmentationResult<'xyxy', CocoClassYolo>[] | null
  >(null, model.revision);
  const [latency, setLatency] = useTaskState<number | null>(null, model.revision);
  const [error, setError] = useTaskState<string | null>(null, model.revision);
  const [busy, setBusy] = useState(false);

  const segmenter = useInstanceSegmenter(MODEL, { preventLoad: !model.loaded });

  const run = async () => {
    if (!image || !model.loaded || !segmenter.isReady || !segmenter.segmentInstances) return;
    if (busy || model.deleting) return;
    setBusy(true);
    setResults(null);
    setLatency(null);
    setError(null);
    try {
      const started = performance.now();
      const output = await segmenter.segmentInstances(image.buffer);
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
      title="Instance segmentation"
      model={model}
      status={segmenter}
      error={error}
      busy={busy}
    >
      <PhotoPicker
        key={model.revision}
        placeholderTitle="See each object clearly"
        placeholderDescription="Give every object its own colored mask, outline, and label."
        busy={busy || model.deleting}
        canPick={model.prepared && model.loaded && segmenter.isReady}
        setupAction={<ModelSetup model={model} status={segmenter} disabled={busy} />}
        onRun={run}
        canRun={model.prepared && !!image && segmenter.isReady && model.loaded}
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
        renderOverlay={(transform) =>
          results && (
            <InstanceSegmentationOverlay
              instances={results}
              imageWidth={image?.width ?? 0}
              imageHeight={image?.height ?? 0}
              transform={transform}
            />
          )
        }
      />
    </TaskScreen>
  );
}

export default function InstanceSegmentationScreen() {
  return (
    <ScreenWrapper unmountOnBlur>
      <InstanceSegmentationTask />
    </ScreenWrapper>
  );
}
