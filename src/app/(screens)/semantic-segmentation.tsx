import { useState } from 'react';
import { models, useSemanticSegmenter } from 'react-native-executorch';

import { ModelSetup } from '@/components/ModelSetup';
import { PhotoPicker, type PickedImage } from '@/components/PhotoPicker';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { TaskScreen } from '@/components/TaskScreen';
import { useDisposableImage } from '@/hooks/useDisposableImage';
import { useModelControls } from '@/hooks/useModelControls';
import { useTaskState } from '@/hooks/useTaskState';
import { bufferToSkImage } from '@/lib/image';

const MODEL = models.semanticSegmentation.DEEPLAB_V3_RESNET50.DEFAULT;

function SemanticSegmentationTask() {
  const model = useModelControls(MODEL.modelPath, { name: 'DeepLabV3 ResNet50' });
  const [image, setImage] = useTaskState<PickedImage | null>(null, model.revision);
  const [segmentationImage, setSegmentationImage] = useDisposableImage(model.revision);
  const [latency, setLatency] = useTaskState<number | null>(null, model.revision);
  const [error, setError] = useTaskState<string | null>(null, model.revision);
  const [busy, setBusy] = useState(false);

  const segmenter = useSemanticSegmenter(MODEL, { preventLoad: !model.loaded });

  const run = async () => {
    if (!image || !model.loaded || !segmenter.isReady || !segmenter.segment) return;
    if (busy || model.deleting) return;
    setBusy(true);
    setSegmentationImage(null);
    setLatency(null);
    setError(null);
    try {
      const started = performance.now();
      const { buffer } = await segmenter.segment(image.buffer);
      setLatency(Math.round(performance.now() - started));
      const nextImage = bufferToSkImage(buffer);
      if (!nextImage) throw new Error('Failed to create overlay image from output data');
      setSegmentationImage(nextImage);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <TaskScreen
      title="Semantic segmentation"
      model={model}
      status={segmenter}
      error={error}
      busy={busy}
    >
      <PhotoPicker
        key={model.revision}
        placeholderTitle="See objects in color."
        placeholderDescription="Highlight each region of your photo with a colored mask."
        busy={busy || model.deleting}
        canPick={model.prepared && model.loaded && segmenter.isReady}
        setupAction={<ModelSetup model={model} status={segmenter} disabled={busy} />}
        onRun={run}
        canRun={model.prepared && !!image && segmenter.isReady && model.loaded}
        running={busy}
        result={segmentationImage ? 'Image segmented' : undefined}
        latency={latency}
        overlayImage={segmentationImage}
        overlayOpacity={0.65}
        onPick={(picked) => {
          setImage(picked);
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
    <ScreenWrapper unmountOnBlur>
      <SemanticSegmentationTask />
    </ScreenWrapper>
  );
}
