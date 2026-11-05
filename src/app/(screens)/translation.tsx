import { useState } from 'react';
import { models, useTranslator } from 'react-native-executorch';

import { ScreenWrapper } from '@/components/ScreenWrapper';
import { TaskScreen } from '@/components/TaskScreen';
import { TextTaskView, type TextTaskResult } from '@/components/TextTaskView';
import { useModelControls } from '@/hooks/useModelControls';
import { useTaskState } from '@/hooks/useTaskState';

const MODEL = models.translation.OPUS_MT_EN_DE.DEFAULT;
const suggestions = [
  { label: 'Travel', prompt: 'Where is the nearest train station?' },
  { label: 'Hello', prompt: 'Hello! It is lovely to meet you.' },
];

function TranslationTask() {
  const model = useModelControls(MODEL.modelPath, { name: 'Opus-MT · English → German' });
  const [input, setInput] = useTaskState('', model.revision);
  const [result, setResult] = useTaskState<TextTaskResult | null>(null, model.revision);
  const [error, setError] = useTaskState<string | null>(null, model.revision);
  const [busy, setBusy] = useState(false);
  const translator = useTranslator(MODEL, { preventLoad: !model.loaded });

  const run = async () => {
    if (!input.trim() || !model.loaded || !translator.isReady || !translator.translate) return;
    if (busy || model.deleting) return;
    setBusy(true);
    setError(null);
    try {
      const started = performance.now();
      const output = await translator.translate(input.trim(), {
        sourceLanguage: 'en',
        targetLanguage: 'de',
      });
      setResult({
        input: input.trim(),
        text: output,
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
      title="Translation"
      model={model}
      status={translator}
      busy={busy}
      error={error}
      scrollable={false}
    >
      <TextTaskView
        title="Find the words"
        description="Translate English into German, wherever you are. No connection needed after download."
        placeholder="Write in English…"
        suggestions={suggestions}
        model={model}
        status={translator}
        task={{ input, setInput, result, busy, run }}
      />
    </TaskScreen>
  );
}

export default function TranslationScreen() {
  return (
    <ScreenWrapper unmountOnBlur>
      <TranslationTask />
    </ScreenWrapper>
  );
}
