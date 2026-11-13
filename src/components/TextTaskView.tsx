import { Keyboard, ScrollView, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { AppText } from '@/components/AppText';
import { ModelSetup } from '@/components/ModelSetup';
import type { ModelStatus } from '@/components/ModelSheet';
import { PromptInput } from '@/components/PromptInput';
import { PromptStage } from '@/components/PromptStage';
import { TaskHero } from '@/components/TaskHero';
import { TaskHeroStage } from '@/components/TaskHeroStage';
import { ThinkingIndicator } from '@/components/ThinkingIndicator';
import { useChatKeyboard } from '@/hooks/useChatKeyboard';
import type { ModelControls } from '@/hooks/useModelControls';
import { tokens } from '@/theme';

export type TextTaskResult = { input: string; text: string; latency: number };

/** Shared text-task presentation with explicit model setup, editable examples and a readable result. */
export function TextTaskView({
  title,
  description,
  placeholder,
  suggestions,
  model,
  status,
  task,
}: {
  title: string;
  description: string;
  placeholder: string;
  suggestions: readonly { label: string; prompt: string }[];
  model: ModelControls;
  status: ModelStatus;
  task: {
    input: string;
    setInput: (value: string) => void;
    result: TextTaskResult | null;
    busy: boolean;
    run: () => Promise<void>;
  };
}) {
  const { keyboardStyle, heroStyle } = useChatKeyboard();
  const ready = model.prepared && model.loaded && status.isReady && !model.deleting;
  return (
    <Animated.View style={[styles.root, keyboardStyle]}>
      <PromptStage
        footer={
          ready ? (
            <>
              <PromptInput
                value={task.input}
                onChangeText={task.setInput}
                onSubmit={() => {
                  Keyboard.dismiss();
                  void task.run();
                }}
                disabled={task.busy}
                canSubmit={!!task.input.trim() && !task.busy}
                placeholder={placeholder}
                submitLabel="Run task"
                suggestions={suggestions}
              />
            </>
          ) : null
        }
      >
        {(contentInset) => (
          <>
            <ScrollView
              style={styles.content}
              contentContainerStyle={[styles.result, contentInset]}
              keyboardDismissMode="interactive"
            >
              {task.result && (
                <>
                  <AppText variant="secondary" tone="muted">
                    {task.result.input}
                  </AppText>
                  <AppText selectable>{task.result.text}</AppText>
                  <AppText variant="secondary" tone="muted">
                    {task.result.latency} ms · On device
                  </AppText>
                </>
              )}
            </ScrollView>
            {task.busy && (
              <View style={styles.activity}>
                <ThinkingIndicator accessibilityLabel="Processing text" />
              </View>
            )}

            {!task.result && !task.busy && (
              <TaskHeroStage style={heroStyle} pointerEvents={ready ? 'none' : 'box-none'}>
                <TaskHero
                  title={title}
                  description={description}
                  setup={<ModelSetup model={model} status={status} />}
                />
              </TaskHeroStage>
            )}
          </>
        )}
      </PromptStage>
    </Animated.View>
  );
}

const { spacing } = tokens;
const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flex: 1 },
  result: { flexGrow: 1, justifyContent: 'center', gap: spacing.xl, paddingVertical: spacing.xl },
  activity: { alignItems: 'center' },
});
