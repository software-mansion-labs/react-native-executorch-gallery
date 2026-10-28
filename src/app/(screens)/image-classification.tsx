import { useState } from 'react';
import {
  models,
  useClassifier,
  type Classification,
  type ImageNet1KLabel,
} from 'react-native-executorch';

import { ClassificationResult } from '@/components/image-classification/ClassificationResult';
import { ModelSetup } from '@/components/ModelSetup';
import { PhotoPicker, type PickedImage } from '@/components/PhotoPicker';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { TaskScreen } from '@/components/TaskScreen';
import { useModelControls } from '@/hooks/useModelControls';
import { useTaskState } from '@/hooks/useTaskState';

const MODEL = models.classification.EFFICIENTNET_V2_S.DEFAULT;

function ImageClassificationTask() {
  const model = useModelControls(MODEL.modelPath, { name: 'EfficientNetV2-S' });
  const [image, setImage] = useTaskState<PickedImage | null>(null, model.revision);
  const [result, setResult] = useTaskState<Classification<ImageNet1KLabel> | null>(
    null,
    model.revision
  );
  const [error, setError] = useTaskState<string | null>(null, model.revision);
  const [busy, setBusy] = useState(false);

  const classifier = useClassifier(MODEL, { preventLoad: !model.loaded });

  const run = async () => {
    if (!image || !model.loaded || !classifier.isReady || !classifier.classify) return;
    if (busy || model.deleting) return;
    setBusy(true);
    setResult(null);
    setError(null);
    try {
      const [prediction] = await classifier.classify(image.buffer, { topk: 1 });
      setResult(prediction ?? null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <TaskScreen
      title="Image classification"
      model={model}
      status={classifier}
      error={error}
      busy={busy}
    >
      <PhotoPicker
        key={model.revision}
        placeholderTitle="Put a name to it"
        placeholderDescription="Recognize the main subject in your photo."
        busy={busy || model.deleting}
        canPick={model.prepared && model.loaded && classifier.isReady}
        setupAction={<ModelSetup model={model} status={classifier} disabled={busy} />}
        onRun={run}
        canRun={model.prepared && !!image && classifier.isReady && model.loaded}
        running={busy}
        resultsContent={<ClassificationResult result={result} />}
        onPick={(picked) => {
          setImage(picked);
          setResult(null);
          setError(null);
        }}
      />
    </TaskScreen>
  );
}

export default function ImageClassificationScreen() {
  return (
    <ScreenWrapper unmountOnBlur>
      <ImageClassificationTask />
    </ScreenWrapper>
  );
}
