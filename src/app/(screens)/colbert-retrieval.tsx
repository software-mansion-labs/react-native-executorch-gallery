import { useState } from 'react';
import { models, useColbertEmbedder } from 'react-native-executorch';

import { ColbertView, type ColbertResult } from '@/components/colbert-retrieval/ColbertView';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { TaskScreen } from '@/components/TaskScreen';
import { useModelControls } from '@/hooks/useModelControls';
import { useTaskState } from '@/hooks/useTaskState';
import { SEARCH_DOCUMENTS } from '@/lib/search-documents';

const MODEL = models.colbertEmbeddings.LFM2_5_COLBERT_350M.DEFAULT;
const suggestions = [
  { label: 'Books', prompt: 'Where can I borrow something to read?' },
  { label: 'Airport', prompt: 'How can I get to the airport?' },
  { label: 'Coffee', prompt: 'Somewhere for a cappuccino and a pastry' },
];

function ColbertRetrievalTask() {
  const model = useModelControls(MODEL.modelPath, { name: 'LFM2.5 ColBERT 350M' });
  const [input, setInput] = useTaskState('', model.revision);
  const [result, setResult] = useTaskState<ColbertResult | null>(null, model.revision);
  const [error, setError] = useTaskState<string | null>(null, model.revision);
  const [busy, setBusy] = useState(false);
  const colbert = useColbertEmbedder(MODEL, { preventLoad: !model.loaded });

  const run = async () => {
    if (!input.trim() || !model.loaded || !colbert.isReady || !colbert.embed || !colbert.maxSim)
      return;
    if (busy || model.deleting) return;
    setBusy(true);
    setError(null);
    try {
      const started = performance.now();
      const query = await colbert.embed(input.trim(), 'query');
      const matches = [];
      for (const document of SEARCH_DOCUMENTS) {
        const embedding = await colbert.embed(document.text, 'document');
        matches.push({ document, score: colbert.maxSim(query, embedding) });
      }
      matches.sort((a, b) => b.score - a.score);
      setResult({
        query: input.trim(),
        matches,
        latency: Math.round(performance.now() - started),
      });
      setInput('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <TaskScreen
      title="ColBERT retrieval"
      model={model}
      status={colbert}
      busy={busy}
      error={error}
      scrollable={false}
    >
      <ColbertView
        input={input}
        onInputChange={setInput}
        onSearch={run}
        result={result}
        busy={busy}
        suggestions={suggestions}
        model={model}
        status={colbert}
      />
    </TaskScreen>
  );
}

export default function ColbertRetrievalScreen() {
  return (
    <ScreenWrapper unmountOnBlur>
      <ColbertRetrievalTask />
    </ScreenWrapper>
  );
}
