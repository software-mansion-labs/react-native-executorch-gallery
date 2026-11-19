import { useState } from 'react';
import { models, useDepthEstimator } from 'react-native-executorch';

import { ModelSetup } from '@/components/ModelSetup';
import { PhotoPicker, type PickedImage } from '@/components/PhotoPicker';
import { TaskScreen } from '@/components/TaskScreen';
import { PinballPhoto } from '@/components/photo-pinball/PinballPhoto';
import { useDisposableImage } from '@/hooks/useDisposableImage';
import { useModelControls } from '@/hooks/useModelControls';
import { useTaskState } from '@/hooks/useTaskState';
import { createDepthTexture } from '@/lib/depth-estimation/depth-focus';

import { findForegroundBumper, type ForegroundBumper } from '@/lib/photo-pinball/foreground-bumper';

const MODEL = models.depthEstimation.DEPTH_ANYTHING_V3_SMALL.DEFAULT;

export default function PhotoPinball() {
  const model = useModelControls(MODEL.modelPath, { name: 'Depth Anything V3 Small' });
  const estimator = useDepthEstimator(MODEL, { preventLoad: !model.loaded });
  const [photo, setPhoto] = useTaskState<PickedImage | null>(null, model.revision);
  const [depth, setDepth] = useDisposableImage(model.revision);
  const [foreground, setForeground] = useTaskState<ForegroundBumper | null>(null, model.revision);
  const [error, setError] = useTaskState<string | null>(null, model.revision);
  const [busy, setBusy] = useState(false);
  const canPick = model.prepared && model.loaded && estimator.isReady;

  async function preparePlayfield() {
    if (!photo || !canPick || !estimator.estimateDepth || busy || model.deleting) return;
    setBusy(true);
    setError(null);
    try {
      const texture = createDepthTexture(await estimator.estimateDepth(photo.buffer));
      setForeground(findForegroundBumper(texture));
      setDepth(texture);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <TaskScreen title="Photo pinball" model={model} status={estimator} error={error} busy={busy}>
      <PhotoPicker
        key={model.revision}
        placeholderTitle="Test a bounce in a photo"
        placeholderDescription="Choose an angled desk photo with a foreground object and some clear space around it."
        allowCamera={false}
        busy={busy || model.deleting}
        canPick={canPick}
        setupAction={<ModelSetup model={model} status={estimator} disabled={busy} />}
        onPick={(image) => {
          setDepth(null);
          setForeground(null);
          setError(null);
          setPhoto(image);
        }}
        onRun={depth ? undefined : preparePlayfield}
        canRun={canPick && photo != null}
        running={busy}
        renderPhoto={
          depth
            ? (image, transform) => (
                <PinballPhoto
                  image={image}
                  depth={depth}
                  transform={transform}
                  foreground={foreground}
                />
              )
            : undefined
        }
        result={
          depth
            ? foreground
              ? 'Foreground object detected'
              : 'No foreground object detected'
            : undefined
        }
      />
    </TaskScreen>
  );
}
