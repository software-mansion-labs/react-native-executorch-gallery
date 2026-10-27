import { useState } from 'react';
import { models, useInpainter } from 'react-native-executorch';

import { InpaintingCanvas } from '@/components/InpaintingCanvas';
import { InpaintingResult } from '@/components/InpaintingResult';
import { ModelSetup } from '@/components/ModelSetup';
import { PhotoPicker, type PickedImage } from '@/components/PhotoPicker';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { TaskScreen } from '@/components/TaskScreen';
import { useDisposableImage } from '@/hooks/useDisposableImage';
import { useInpaintingMask } from '@/hooks/useInpaintingMask';
import { useModelControls } from '@/hooks/useModelControls';
import { useTaskState } from '@/hooks/useTaskState';
import { bufferToSkImage } from '@/lib/image';

const MODEL = models.inpainting.MIGAN.SIZE_512.DEFAULT;

function InpaintingTask() {
  const model = useModelControls(MODEL.modelPath, { name: 'MI-GAN' });
  const [image, setImage] = useTaskState<PickedImage | null>(null, model.revision);
  const [result, setResult] = useDisposableImage(model.revision);
  const [showOriginal, setShowOriginal] = useTaskState(false, model.revision);
  const [latency, setLatency] = useTaskState<number | null>(null, model.revision);
  const [error, setError] = useTaskState<string | null>(null, model.revision);
  const [busy, setBusy] = useState(false);
  const mask = useInpaintingMask(model.revision);

  const inpainter = useInpainter(MODEL, { preventLoad: !model.loaded });

  const clearResult = () => {
    setResult(null);
    setShowOriginal(false);
    setLatency(null);
    setError(null);
  };
  const run = async () => {
    if (!image || !model.loaded || !inpainter.isReady || !inpainter.inpaint) return;
    if (busy || model.deleting || !mask.strokes.length) return;
    setBusy(true);
    clearResult();
    try {
      const painted = mask.create(image.width, image.height);
      const started = performance.now();
      const output = await inpainter.inpaint(image.buffer, painted);
      setLatency(Math.round(performance.now() - started));
      const nextImage = bufferToSkImage(output);
      if (!nextImage) throw new Error('Could not display the retouched photo.');
      setResult(nextImage);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <TaskScreen
      title="Photo cleanup"
      model={model}
      status={inpainter}
      error={error}
      busy={busy}
      scrollable={false}
    >
      <PhotoPicker
        key={model.revision}
        placeholderTitle="Make distractions disappear"
        placeholderDescription="Brush over an unwanted detail to remove it from your photo."
        busy={busy || model.deleting}
        canPick={model.prepared && model.loaded && inpainter.isReady}
        setupAction={<ModelSetup model={model} status={inpainter} disabled={busy} />}
        onRun={run}
        canRun={
          model.prepared &&
          !!image &&
          inpainter.isReady &&
          model.loaded &&
          !!mask.strokes.length &&
          !result
        }
        running={busy}
        overlayImage={showOriginal ? null : result}
        overlayOpacity={1}
        renderInteraction={(transform) =>
          image &&
          !result && (
            <InpaintingCanvas
              width={image.width}
              height={image.height}
              transform={transform}
              mask={mask}
              enabled={!busy && !model.deleting}
            />
          )
        }
        resultsContent={
          <InpaintingResult
            hasImage={!!image}
            hasStrokes={!!mask.strokes.length}
            available={!!result}
            latency={latency}
            busy={busy || model.deleting}
            onUndo={() => {
              mask.undo();
              clearResult();
            }}
            onCompare={setShowOriginal}
          />
        }
        onPick={(picked) => {
          setImage(picked);
          mask.clear();
          clearResult();
        }}
      />
    </TaskScreen>
  );
}

export default function InpaintingScreen() {
  return (
    <ScreenWrapper unmountOnBlur>
      <InpaintingTask />
    </ScreenWrapper>
  );
}
