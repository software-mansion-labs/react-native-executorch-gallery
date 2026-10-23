import { useState } from 'react';
import {
  models,
  useInstanceSegmenter,
  type CocoClassYolo,
  type InstanceSegmentationResult,
} from 'react-native-executorch';

import { InstanceSegmentationOverlay } from '@/components/InstanceSegmentationOverlay';
import { PhotoPicker, type PickedImage } from '@/components/PhotoPicker';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { TaskScreen } from '@/components/TaskScreen';

import { deleteCachedFiles } from '@/lib/deleteCachedFiles';

const MODEL = models.instanceSegmentation.YOLO26.NANO.SIZE_384.DEFAULT;

function InstanceSegmentationTask() {
  const [loaded, setLoaded] = useState(false);
  const [image, setImage] = useState<PickedImage | null>(null);
  const [results, setResults] = useState<InstanceSegmentationResult<'xyxy', CocoClassYolo>[]>([]);
  const [latency, setLatency] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const segmenter = useInstanceSegmenter(MODEL, { preventLoad: !loaded });

  const run = async () => {
    if (!image || !segmenter.segmentInstances) return;
    setBusy(true);
    setResults([]);
    setLatency(null);
    setError(null);
    try {
      const t0 = Date.now();
      const output = await segmenter.segmentInstances(image.buffer);
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
      title="Instance Segmentation"
      subtitle="YOLO26 Nano"
      status={{ ...segmenter, error: error || segmenter.error }}
      onLoadModel={!loaded ? () => setLoaded(true) : undefined}
      canRun={!!image && segmenter.isReady}
      busy={busy}
      onRun={run}
      runLabel="Segment Instances"
      onDeleteModel={async () => {
        await deleteCachedFiles(segmenter.resource);
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
          <InstanceSegmentationOverlay
            instances={results}
            imageWidth={image?.width ?? 0}
            imageHeight={image?.height ?? 0}
            transform={transform}
          />
        )}
      />
    </TaskScreen>
  );
}

export default function InstanceSegmentationScreen() {
  return (
    <ScreenWrapper>
      <InstanceSegmentationTask />
    </ScreenWrapper>
  );
}
