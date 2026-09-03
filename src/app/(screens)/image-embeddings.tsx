import { useState } from 'react';
import { models, useImageEmbedder, useTextEmbedder } from 'react-native-executorch';

import { MultimodalRankOverlay, type CandidateQueryItem } from '@/components/MultimodalRankOverlay';
import { PhotoPicker, type PickedImage } from '@/components/PhotoPicker';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { TaskScreen } from '@/components/TaskScreen';

import { deleteCachedFiles } from '@/lib/deleteCachedFiles';

const INITIAL_QUERIES: CandidateQueryItem[] = [
  { id: '2', text: 'a delicious plate of food', score: null },
  { id: '3', text: 'a scenic outdoor landscape', score: null },
  { id: '1', text: 'a photo of an animal or pet', score: null },
  { id: '4', text: 'urban architecture and buildings', score: null },
  { id: '5', text: 'a group of people or portrait', score: null },
];

const IMAGE_MODEL = models.imageEmbeddings.CLIP_VIT_BASE_PATCH32.DEFAULT;
const TEXT_MODEL = models.textEmbeddings.CLIP_VIT_BASE_PATCH32_TEXT.DEFAULT;

const dotProduct = (a: Float32Array, b: Float32Array): number =>
  a.reduce((sum, val, i) => sum + val * (b[i] ?? 0), 0);

function ImageEmbeddingsTask() {
  const [loaded, setLoaded] = useState(false);
  const [image, setImage] = useState<PickedImage | null>(null);
  const [items, setItems] = useState<CandidateQueryItem[]>(INITIAL_QUERIES);
  const [latency, setLatency] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const imageModel = useImageEmbedder(IMAGE_MODEL, { preventLoad: !loaded });
  const textModel = useTextEmbedder(TEXT_MODEL, { preventLoad: !loaded });

  const isReady = imageModel.isReady && textModel.isReady;
  const downloadProgress = Math.min(imageModel.downloadProgress, textModel.downloadProgress);

  const activeError =
    error ||
    (imageModel.error ? imageModel.error.message : null) ||
    (textModel.error ? textModel.error.message : null);

  const run = async () => {
    if (busy || !image || !imageModel.embed || !textModel.embed) return;
    setBusy(true);
    setLatency(null);
    setError(null);
    try {
      const t0 = Date.now();
      const imageEmbedding = await imageModel.embed(image.buffer);

      const scored: CandidateQueryItem[] = [];
      for (const item of items) {
        const textEmbedding = await textModel.embed(item.text);
        scored.push({ ...item, score: dotProduct(imageEmbedding, textEmbedding) });
      }

      // Re-organize candidate queries by descending similarity
      scored.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

      setLatency(Date.now() - t0);
      setItems(scored);
    } catch (err: any) {
      setError(err?.message ?? String(err));
    } finally {
      setBusy(false);
    }
  };

  const handlePick = (newImage: PickedImage | null) => {
    setImage(newImage);
    setItems(INITIAL_QUERIES);
    setLatency(null);
    setError(null);
  };

  return (
    <TaskScreen
      title="Multimodal Search"
      subtitle="CLIP ViT-B/32 · Image & Text"
      status={{
        isReady,
        downloadProgress,
        error: activeError ? new Error(activeError) : undefined,
      }}
      onLoadModel={!loaded ? () => setLoaded(true) : undefined}
      canRun={!!image && isReady}
      busy={busy}
      onRun={() => run()}
      runLabel="Rank queries"
      onDeleteModel={async () => {
        await Promise.all([
          deleteCachedFiles(imageModel.resource),
          deleteCachedFiles(textModel.resource),
        ]);
        setLoaded(false);
        setImage(null);
        setItems(INITIAL_QUERIES);
      }}
      meta={latency != null ? `Inference ${latency} ms` : undefined}
    >
      <PhotoPicker
        busy={busy}
        onPick={handlePick}
        renderOverlay={() => <MultimodalRankOverlay items={items} />}
      />
    </TaskScreen>
  );
}

export default function ImageEmbeddingsScreen() {
  return (
    <ScreenWrapper>
      <ImageEmbeddingsTask />
    </ScreenWrapper>
  );
}
