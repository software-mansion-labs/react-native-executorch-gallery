import { useState } from 'react';
import { models, useSemanticSegmenter } from 'react-native-executorch';

import { PhotoPicker, type PickedImage } from '@/components/PhotoPicker';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { TaskScreen } from '@/components/TaskScreen';

import { useDisposableImage } from '@/hooks/useDisposableImage';

import { deleteCachedFiles } from '@/lib/deleteCachedFiles';
import { bufferToSkImage } from '@/lib/image';

const MODEL = models.semanticSegmentation.DEEPLAB_V3_RESNET50.DEFAULT;

function SemanticSegmentationTask() {
  const [loaded, setLoaded] = useState(false);
  const [image, setImage] = useState<PickedImage | null>(null);
  const [segmentationImage, setSegmentationImage] = useDisposableImage();
  const [latency, setLatency] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const segmenter = useSemanticSegmenter(MODEL, { preventLoad: !loaded });

  const run = async () => {
    if (busy || !image || !segmenter.segment) return;
    setBusy(true);
    setLatency(null);
    setError(null);
    try {
      const t0 = Date.now();
      const { buffer: outBuffer } = await segmenter.segment(image.buffer);
      setLatency(Date.now() - t0);

      const nextImage = bufferToSkImage(outBuffer);
      if (!nextImage) throw new Error('Failed to create overlay image from output data');
      setSegmentationImage(nextImage);
    } catch (err: any) {
      setError(err?.message ?? String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <TaskScreen
      title="Semantic Segmentation"
      subtitle="DeepLabV3 ResNet50"
      status={{ ...segmenter, error: error || segmenter.error }}
      onLoadModel={!loaded ? () => setLoaded(true) : undefined}
      canRun={!!image && segmenter.isReady && !busy}
      busy={busy}
      onRun={run}
      runLabel="Segment Image"
      onDeleteModel={async () => {
        await deleteCachedFiles(segmenter.resource);
        setLoaded(false);
      }}
      meta={latency != null ? `Inference ${latency} ms` : undefined}
    >
      <PhotoPicker
        busy={busy}
        overlayImage={segmentationImage}
        overlayOpacity={0.65}
        onPick={(img) => {
          setImage(img);
          setSegmentationImage(null);
          setLatency(null);
          setError(null);
        }}
      />
    </TaskScreen>
  );
}

export default function SemanticSegmentationScreen() {
  return (
    <ScreenWrapper>
      <SemanticSegmentationTask />
    </ScreenWrapper>
  );
}
