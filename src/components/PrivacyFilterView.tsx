import { useState } from 'react';
import { Keyboard, ScrollView, StyleSheet, View } from 'react-native';
import type { nlp } from 'react-native-executorch';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';

import { ModelSetup } from '@/components/ModelSetup';
import type { ModelStatus } from '@/components/ModelSheet';
import { PrivacyFilterToggle } from '@/components/PrivacyFilterToggle';
import { PrivacyFilterResult } from '@/components/PrivacyFilterResult';
import { PromptInput } from '@/components/PromptInput';
import { TaskHero } from '@/components/TaskHero';
import { TaskHeroStage } from '@/components/TaskHeroStage';
import { ThinkingIndicator } from '@/components/ThinkingIndicator';
import { useChatKeyboard } from '@/hooks/useChatKeyboard';
import type { ModelControls } from '@/hooks/useModelControls';
import { tokens } from '@/theme';

export type PrivacyFilterOutput = {
  text: string;
  entities: readonly nlp.PiiEntity[];
  latency: number;
};

const suggestions = [
  {
    label: 'Contact',
    prompt: 'Hi, I’m Sarah Chen. Email me at sarah.chen@example.com or call (415) 923-0847.',
  },
  {
    label: 'Delivery',
    prompt:
      'Please deliver to Alex Morgan at 42 Maple Street, Portland, OR 97205. Call (503) 555-0198 when you arrive.',
  },
  {
    label: 'Account',
    prompt:
      'My name is Jordan Lee. My account number is ACC-8821-4490 and my password is RiverStone!2026.',
  },
];

/** Keyboard-following text input and a single redacted result, sharing the task hero and model preparation flow. */
export function PrivacyFilterView({
  input,
  onInputChange,
  onRun,
  result,
  busy,
  model,
  status,
}: {
  input: string;
  onInputChange: (value: string) => void;
  onRun: () => Promise<void>;
  result: PrivacyFilterOutput | null;
  busy: boolean;
  model: ModelControls;
  status: ModelStatus;
}) {
  const { keyboardStyle, heroStyle } = useChatKeyboard();
  const [comparison, setComparison] = useState({ result, original: false });
  const showOriginal = comparison.result === result && comparison.original;
  const ready = model.prepared && model.loaded && status.isReady && !model.deleting;
  return (
    <Animated.View style={[styles.root, keyboardStyle]}>
      <View style={styles.content}>
        <ScrollView
          style={styles.stage}
          contentContainerStyle={styles.results}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          {result && (
            <PrivacyFilterResult
              key={`${result.text}:${result.latency}`}
              result={result}
              revealed={showOriginal}
            />
          )}
        </ScrollView>
        <View style={styles.activity}>
          {busy && (
            <Animated.View entering={entrance} style={styles.loading}>
              <ThinkingIndicator accessibilityLabel="Filtering text" />
            </Animated.View>
          )}
        </View>
        {ready && (
          <Animated.View entering={entrance}>
            <PromptInput
              value={input}
              onChangeText={onInputChange}
              onSubmit={() => {
                Keyboard.dismiss();
                void onRun();
              }}
              disabled={busy}
              canSubmit={!!input.trim() && !busy}
              placeholder="Paste text to filter…"
              submitLabel="Filter text"
              suggestions={suggestions}
              reserveSuggestionSpace
              leadingAccessory={
                result && result.entities.length > 0 ? (
                  <PrivacyFilterToggle
                    original={showOriginal}
                    onChange={(original) => setComparison({ result, original })}
                  />
                ) : undefined
              }
            />
          </Animated.View>
        )}
        {!result && !busy && (
          <TaskHeroStage style={heroStyle} pointerEvents={ready ? 'none' : 'box-none'}>
            <TaskHero
              title="Keep the personal private"
              description="Find and hide sensitive details in your text, right on your device."
              setup={<ModelSetup model={model} status={status} />}
            />
          </TaskHeroStage>
        )}
      </View>
    </Animated.View>
  );
}

const { spacing } = tokens;
const entrance = FadeIn.duration(tokens.motion.photoRevealDuration).reduceMotion(
  ReduceMotion.System
);
const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  content: { flex: 1, gap: spacing.md },
  stage: { flex: 1, minHeight: 0 },
  results: { flexGrow: 1, justifyContent: 'center', paddingVertical: spacing.xl, gap: spacing.xl },
  activity: { height: tokens.typography.body.lineHeight, justifyContent: 'center' },
  loading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
});
