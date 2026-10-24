import { useState } from 'react';
import { models, useDepthEstimator } from 'react-native-executorch';

import { DepthPhoto } from '@/components/DepthPhoto';
import { ModelSetup } from '@/components/ModelSetup';
import { PhotoPicker, type PickedImage } from '@/components/PhotoPicker';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { TaskScreen } from '@/components/TaskScreen';
import { useDisposableImage } from '@/hooks/useDisposableImage';
import { useModelControls } from '@/hooks/useModelControls';
import { useTaskState } from '@/hooks/useTaskState';
import { createDepthTexture } from '@/lib/depth-focus';

const MODEL = models.depthEstimation.DEPTH_ANYTHING_V3_SMALL.DEFAULT;

function DepthEstimationTask() {
  const model = useModelControls(MODEL.modelPath, { name: 'Depth Anything V3 Small' });
  const [image, setImage] = useTaskState<PickedImage | null>(null, model.revision);
  const [texture, setTexture] = useDisposableImage(model.revision);
  const [latency, setLatency] = useTaskState<number | null>(null, model.revision);
  const [error, setError] = useTaskState<string | null>(null, model.revision);
  const [busy, setBusy] = useState(false);

  const estimator = useDepthEstimator(MODEL, { preventLoad: !model.loaded });

  const run = async () => {
    if (!image || !model.loaded || !estimator.isReady || !estimator.estimateDepth) return;
    if (busy || model.deleting) return;
    setBusy(true);
    setTexture(null);
    setLatency(null);
    setError(null);
    try {
      const started = performance.now();
      const depth = await estimator.estimateDepth(image.buffer);
      setLatency(Math.round(performance.now() - started));
      setTexture(createDepthTexture(depth));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <TaskScreen title="Depth estimation" model={model} status={estimator} error={error} busy={busy}>
      <PhotoPicker
        key={model.revision}
        placeholderTitle="Find your focus."
        placeholderDescription="Choose a photo, then tap a subject to bring it into focus."
        busy={busy || model.deleting}
        canPick={model.prepared && model.loaded && estimator.isReady}
        setupAction={<ModelSetup model={model} status={estimator} disabled={busy} />}
        onRun={run}
        canRun={model.prepared && !!image && model.loaded && estimator.isReady}
        running={busy}
        renderPhoto={
          texture
            ? (photo, transform) => (
                <DepthPhoto image={photo} depthTexture={texture} transform={transform} />
              )
            : undefined
        }
        result={texture ? 'Tap a subject to focus' : undefined}
        latency={latency}
        onPick={(picked) => {
          setImage(picked);
          setTexture(null);
          setLatency(null);
          setError(null);
        }}
      />
    </TaskScreen>
  );
}
export default function DepthEstimationScreen() {
  return (
    <ScreenWrapper unmountOnBlur>
      <DepthEstimationTask />
    </ScreenWrapper>
  );
}
