import { useState } from 'react';
import { models, usePrivacyFilter } from 'react-native-executorch';

import {
  PrivacyFilterView,
  type PrivacyFilterOutput,
} from '@/components/privacy-filter/PrivacyFilterView';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { TaskScreen } from '@/components/TaskScreen';
import { useModelControls } from '@/hooks/useModelControls';
import { useTaskState } from '@/hooks/useTaskState';

const MODEL = models.privacyFilter.OPENAI.DEFAULT;

function PrivacyFilterTask() {
  const model = useModelControls(MODEL.modelPath, { name: 'OpenAI Privacy Filter' });
  const [input, setInput] = useTaskState('', model.revision);
  const [result, setResult] = useTaskState<PrivacyFilterOutput | null>(null, model.revision);
  const [error, setError] = useTaskState<string | null>(null, model.revision);
  const [busy, setBusy] = useState(false);

  const filter = usePrivacyFilter(MODEL, { preventLoad: !model.loaded });

  const run = async () => {
    if (!input.trim() || !model.loaded || !filter.isReady || !filter.detectPii) return;
    if (busy || model.deleting) return;
    setBusy(true);
    setError(null);
    const text = input;
    setInput('');
    try {
      const started = performance.now();
      const entities = await filter.detectPii(text);
      setResult({ text, entities, latency: Math.round(performance.now() - started) });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <TaskScreen
      title="Privacy filter"
      model={model}
      status={filter}
      error={error}
      busy={busy}
      scrollable={false}
    >
      <PrivacyFilterView
        input={input}
        onInputChange={setInput}
        onRun={run}
        result={result}
        busy={busy}
        model={model}
        status={filter}
      />
    </TaskScreen>
  );
}

export default function PrivacyFilterScreen() {
  return (
    <ScreenWrapper unmountOnBlur>
      <PrivacyFilterTask />
    </ScreenWrapper>
  );
}
