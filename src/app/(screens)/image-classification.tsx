import { useState } from 'react';
import {
  models,
  useClassifier,
  type Classification,
  type ImageNet1KLabel,
} from 'react-native-executorch';

import { ClassificationOverlay } from '@/components/ClassificationOverlay';
import { PhotoPicker, type PickedImage } from '@/components/PhotoPicker';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { TaskScreen } from '@/components/TaskScreen';

import { deleteCachedFiles } from '@/lib/deleteCachedFiles';

const MODEL = models.classification.EFFICIENTNET_V2_S.DEFAULT;

function ImageClassificationTask() {
  const [loaded, setLoaded] = useState(false);
  const [image, setImage] = useState<PickedImage | null>(null);
  const [results, setResults] = useState<Classification<ImageNet1KLabel>[]>([]);
  const [latency, setLatency] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const classifier = useClassifier(MODEL, { preventLoad: !loaded });

  const run = async () => {
    if (!image || !classifier.classify) return;
    setBusy(true);
    setResults([]);
    setLatency(null);
    setError(null);
    try {
      const t0 = Date.now();
      const output = await classifier.classify(image.buffer, { topk: 3 });
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
      title="Image Classification"
      subtitle="EfficientNetV2-S"
      status={{ ...classifier, error: error || classifier.error }}
      onLoadModel={!loaded ? () => setLoaded(true) : undefined}
      canRun={!!image && classifier.isReady}
      busy={busy}
      onRun={run}
      runLabel="Classify Image"
      onDeleteModel={async () => {
        await deleteCachedFiles(classifier.resource);
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
        renderOverlay={() => <ClassificationOverlay results={results} />}
      />
    </TaskScreen>
  );
}

export default function ImageClassificationScreen() {
  return (
    <ScreenWrapper>
      <ImageClassificationTask />
    </ScreenWrapper>
  );
}
