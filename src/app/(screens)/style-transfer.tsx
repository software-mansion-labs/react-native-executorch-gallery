import { useState } from 'react';
import { models, useStyleTransfer } from 'react-native-executorch';

import { ModelSetup } from '@/components/ModelSetup';
import { PhotoPicker, type PickedImage } from '@/components/PhotoPicker';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { StyleTransferResult } from '@/components/style-transfer/StyleTransferResult';
import { TaskScreen } from '@/components/TaskScreen';
import { useDisposableImage } from '@/hooks/useDisposableImage';
import { useModelControls } from '@/hooks/useModelControls';
import { useTaskState } from '@/hooks/useTaskState';
import { bufferToSkImage } from '@/lib/image';

const MODEL = models.styleTransfer.MOSAIC.DEFAULT;

function StyleTransferTask() {
  const model = useModelControls(MODEL.modelPath, { name: 'Mosaic' });
  const [image, setImage] = useTaskState<PickedImage | null>(null, model.revision);
  const [styledImage, setStyledImage] = useDisposableImage(model.revision);
  const [showOriginal, setShowOriginal] = useTaskState(false, model.revision);
  const [latency, setLatency] = useTaskState<number | null>(null, model.revision);
  const [error, setError] = useTaskState<string | null>(null, model.revision);
  const [busy, setBusy] = useState(false);

  const styler = useStyleTransfer(MODEL, { preventLoad: !model.loaded });

  const run = async () => {
    if (!image || !model.loaded || !styler.isReady || !styler.transferStyle) return;
    if (busy || model.deleting) return;
    setBusy(true);
    setStyledImage(null);
    setShowOriginal(false);
    setLatency(null);
    setError(null);
    try {
      const started = performance.now();
      const output = await styler.transferStyle(image.buffer);
      setLatency(Math.round(performance.now() - started));
      const nextImage = bufferToSkImage(output);
      if (!nextImage) throw new Error('Failed to create styled image from output data');
      setStyledImage(nextImage);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <TaskScreen title="Style transfer" model={model} status={styler} error={error} busy={busy}>
      <PhotoPicker
        key={model.revision}
        placeholderTitle="Give it a new style"
        placeholderDescription="Turn your photo into a mosaic, then hold to compare."
        busy={busy || model.deleting}
        canPick={model.prepared && model.loaded && styler.isReady}
        setupAction={<ModelSetup model={model} status={styler} disabled={busy} />}
        onRun={run}
        canRun={model.prepared && !!image && styler.isReady && model.loaded}
        running={busy}
        resultsContent={
          <StyleTransferResult
            available={!!styledImage}
            showOriginal={showOriginal}
            latency={latency}
            onPressInOriginal={() => setShowOriginal(true)}
            onPressOutOriginal={() => setShowOriginal(false)}
          />
        }
        overlayImage={showOriginal ? null : styledImage}
        overlayOpacity={1}
        onPick={(picked) => {
          setImage(picked);
          setStyledImage(null);
          setShowOriginal(false);
          setLatency(null);
          setError(null);
        }}
      />
    </TaskScreen>
  );
}

export default function StyleTransferScreen() {
  return (
    <ScreenWrapper unmountOnBlur>
      <StyleTransferTask />
    </ScreenWrapper>
  );
}
