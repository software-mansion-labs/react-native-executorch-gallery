import { useState } from 'react';
import { models, useLLMChatSession } from 'react-native-executorch';

import { ScreenWrapper } from '@/components/ScreenWrapper';
import { TaskScreen } from '@/components/TaskScreen';
import { WidgetBuilderView } from '@/components/widget-builder/WidgetBuilderView';
import { useAppBuilderGrammar } from '@/hooks/widget-builder/useAppBuilderGrammar';
import { useWidgetSessionConfig } from '@/hooks/widget-builder/useWidgetSessionConfig';
import { useModelControls } from '@/hooks/useModelControls';
import { useTaskState } from '@/hooks/useTaskState';
import { useWidgetBuildStream } from '@/hooks/widget-builder/useWidgetBuildStream';
import {
  APP_BUILDER_MESSAGES,
  WIDGET_STOP_REGEX,
  parseGeneratedApp,
  type GeneratedApp,
} from '@/lib/widget-builder/app-builder';
import { appBuilderConstraints } from '@/lib/widget-builder/app-builder-grammar';

const MODEL = models.llm.LFM3_1_7B.DEFAULT;

function WidgetBuilderTask() {
  const model = useModelControls(MODEL.modelPath, { name: 'LFM3 1.7B' });
  const [input, setInput] = useTaskState('', model.revision);
  const [lastPrompt, setLastPrompt] = useTaskState('', model.revision);
  const [widget, setWidget] = useTaskState<GeneratedApp | null>(null, model.revision);
  const [source, setSource] = useTaskState('', model.revision);
  const build = useWidgetBuildStream(model.revision);
  const [error, setError] = useTaskState<string | null>(null, model.revision);
  const [busy, setBusy] = useState(false);

  const { config, error: configError } = useWidgetSessionConfig(MODEL, model.loaded);
  const session = useLLMChatSession(config ?? MODEL, {
    preventLoad: !model.loaded || !config,
    resetOnTurn: true,
    initialMessages: APP_BUILDER_MESSAGES,
    stopRegex: WIDGET_STOP_REGEX,
  });
  const status = { ...session, error: configError ?? session.error };
  const grammar = useAppBuilderGrammar(session.resource?.tokenizerPath);
  const canRun = model.prepared && session.isReady && !!grammar.tokens && !busy;

  const run = async (retryPrompt?: string) => {
    const prompt = (retryPrompt ?? input).trim();
    if (!canRun || !session.sendMessage || !grammar.grammar || !grammar.tokens || !prompt) return;
    if (busy || model.deleting) return;
    setInput('');
    setLastPrompt(prompt);
    setError(null);
    setBusy(true);
    try {
      if (!(await build.reset())) return;
      const result = await session.sendMessage(prompt, build.append, {
        enableThinking: false,
        temperature: 0.1,
        topK: 50,
        topP: 1,
        minP: 0,
        repetitionPenalty: 1.1,
        maxNewTokens: 1024,
        constraints: appBuilderConstraints(grammar.grammar, grammar.tokens),
      });
      if (result.finishReason === 'cancelled') {
        if (retryPrompt === undefined) setInput(prompt);
        return;
      }
      const response = result.messages.findLast((message) => message.role === 'assistant')?.content;
      if (typeof response !== 'string') throw new Error('No widget was generated. Try again.');
      const next = parseGeneratedApp(response);
      setWidget(next);
      setSource(response);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      if (retryPrompt === undefined) setInput(prompt);
    } finally {
      setBusy(false);
    }
  };

  return (
    <TaskScreen
      title="Tiny widget builder"
      model={model}
      status={status}
      busy={busy}
      error={error || grammar.error}
      scrollable={false}
    >
      <WidgetBuilderView
        input={input}
        onInputChange={setInput}
        widget={widget}
        source={source}
        readOutput={build.readOutput}
        buildingWidget={build.preview}
        busy={busy}
        canRun={canRun}
        canRegenerate={canRun && !!lastPrompt}
        onRun={run}
        onRegenerate={() => run(lastPrompt)}
        onStop={() => session.stop?.()}
        model={model}
        status={status}
      />
    </TaskScreen>
  );
}

export default function WidgetBuilderScreen() {
  return (
    <ScreenWrapper unmountOnBlur>
      <WidgetBuilderTask />
    </ScreenWrapper>
  );
}
