import { useEffect, useRef, useState } from 'react';
import {
  createVectorStore,
  models,
  useImageEmbedder,
  useTextEmbedder,
} from 'react-native-executorch';

import { MultimodalSearchView } from '@/components/MultimodalSearchView';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { TaskScreen } from '@/components/TaskScreen';
import { useModelControls, type ModelControls } from '@/hooks/useModelControls';
import {
  readSearchPhoto,
  SEARCH_PHOTOS,
  type SearchPhoto,
  type SearchResult,
} from '@/lib/search-photos';

const IMAGE_MODEL = models.imageEmbeddings.CLIP_VIT_BASE_PATCH32.DEFAULT;
const TEXT_MODEL = models.textEmbeddings.CLIP_VIT_BASE_PATCH32_TEXT.DEFAULT;
const SOURCES = [IMAGE_MODEL.modelPath, TEXT_MODEL.modelPath];

function SearchSession({ model }: { model: ModelControls }) {
  const imageModel = useImageEmbedder(IMAGE_MODEL, { preventLoad: !model.loaded });
  const textModel = useTextEmbedder(TEXT_MODEL, { preventLoad: !model.loaded });
  const [store] = useState(() => createVectorStore<SearchPhoto>());
  const [draft, setDraft] = useState('');
  const [result, setResult] = useState<SearchResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const active = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      store.clear();
    };
  }, [store]);
  const status = {
    isReady: imageModel.isReady && textModel.isReady,
    downloadProgress: Math.min(imageModel.downloadProgress, textModel.downloadProgress),
    resource: imageModel.resource && textModel.resource,
    error: imageModel.error || textModel.error,
  };

  const run = async () => {
    const query = draft.trim();
    if (!model.prepared || !imageModel.embed || !textModel.embed || !query) return;
    if (active.current || model.deleting) return;
    active.current = true;
    setBusy(true);
    setError(null);
    try {
      for (const item of SEARCH_PHOTOS) {
        if (store.has(item.id)) continue;
        const input = await readSearchPhoto(item);
        if (!mounted.current) return;
        const embedding = await imageModel.embed(input);
        if (!mounted.current) return;
        store.add(item.id, embedding, item);
      }
      const queryEmbedding = await textModel.embed(query);
      if (!mounted.current) return;
      const matches = store.query(queryEmbedding, SEARCH_PHOTOS.length);
      setResult({
        query,
        photos: matches.map((match) => match.metadata),
      });
    } catch (cause) {
      if (mounted.current) setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      active.current = false;
      if (mounted.current) setBusy(false);
    }
  };
  const clear = () => {
    setResult(null);
    setDraft('');
    setError(null);
  };
  return (
    <TaskScreen
      title="Multimodal search"
      model={model}
      status={status}
      busy={busy}
      error={error}
      scrollable={false}
    >
      <MultimodalSearchView
        model={model}
        status={status}
        photos={SEARCH_PHOTOS}
        draft={draft}
        onDraftChange={setDraft}
        result={result}
        busy={busy}
        onClear={clear}
        onSearch={run}
      />
    </TaskScreen>
  );
}

function MultimodalSearchTask() {
  const model = useModelControls(SOURCES, { name: 'CLIP ViT-B/32' });
  return <SearchSession key={model.revision} model={model} />;
}

export default function MultimodalSearchScreen() {
  return (
    <ScreenWrapper unmountOnBlur>
      <MultimodalSearchTask />
    </ScreenWrapper>
  );
}
