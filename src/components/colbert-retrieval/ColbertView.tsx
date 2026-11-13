import { Keyboard, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';

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
import type { SearchDocument } from '@/lib/search-documents';
import { tokens, useTheme } from '@/theme';

export type ColbertResult = {
  query: string;
  matches: { document: SearchDocument; score: number }[];
  latency: number;
};

/** Presents a city-guide search as quiet ranked cards, with raw scores and relative relevance bars. */
export function ColbertView({
  input,
  onInputChange,
  onSearch,
  result,
  busy,
  suggestions,
  model,
  status,
}: {
  input: string;
  onInputChange: (value: string) => void;
  onSearch: () => Promise<void>;
  result: ColbertResult | null;
  busy: boolean;
  suggestions: readonly { label: string; prompt: string }[];
  model: ModelControls;
  status: ModelStatus;
}) {
  const { colors } = useTheme();
  const { keyboardStyle, heroStyle } = useChatKeyboard();
  const ready = model.prepared && model.loaded && status.isReady && !model.deleting;
  const bestScore = result?.matches[0]?.score ?? 0;
  return (
    <Animated.View style={[styles.root, keyboardStyle]}>
      <PromptStage
        footer={
          ready ? (
            <>
              {busy && (
                <View style={styles.activity}>
                  <ThinkingIndicator accessibilityLabel="Searching places" />
                </View>
              )}
              <PromptInput
                value={input}
                onChangeText={onInputChange}
                onSubmit={() => {
                  Keyboard.dismiss();
                  void onSearch();
                }}
                disabled={busy}
                canSubmit={!!input.trim() && !busy}
                placeholder="What are you looking for?"
                submitLabel="Search places"
                suggestions={suggestions}
              />
            </>
          ) : null
        }
      >
        {(contentInset) => (
          <>
            <Animated.ScrollView
              key={result?.query}
              style={styles.scroll}
              contentContainerStyle={[styles.results, contentInset]}
              keyboardDismissMode="interactive"
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {result && (
                <Animated.View entering={entrance} style={styles.results}>
                  <View style={styles.summary}>
                    <AppText variant="heading">{result.query}</AppText>
                    <AppText variant="caption" tone="muted">
                      {result.matches.length} places · {result.latency} ms
                    </AppText>
                  </View>
                  {result.matches.map(({ document, score }, index) => (
                    <View
                      key={document.id}
                      style={[styles.card, { backgroundColor: colors.surface }]}
                    >
                      <View style={styles.cardHeading}>
                        <AppText variant="title" style={styles.title}>
                          {document.title}
                        </AppText>
                        {index === 0 && (
                          <AppText variant="caption" tone="accent">
                            Best match
                          </AppText>
                        )}
                      </View>
                      <AppText variant="secondary" tone="muted">
                        {document.text}
                      </AppText>
                      <View style={styles.relevance}>
                        <View
                          style={[styles.track, { backgroundColor: colors.border }]}
                          accessible
                          accessibilityLabel={`Relative relevance: ${Math.round(Math.max(0, Math.min(1, bestScore > 0 ? score / bestScore : 0)) * 100)} percent of the top result`}
                        >
                          <View
                            style={[
                              styles.fill,
                              {
                                backgroundColor: index === 0 ? colors.accent : colors.muted,
                                width: `${Math.max(0, Math.min(1, bestScore > 0 ? score / bestScore : 0)) * 100}%`,
                              },
                            ]}
                          />
                        </View>
                        <AppText variant="caption" tone="muted">
                          {score.toFixed(2)}
                        </AppText>
                      </View>
                    </View>
                  ))}
                  <AppText variant="caption" tone="muted" style={styles.note}>
                    Ranked by relevance to your search
                  </AppText>
                </Animated.View>
              )}
            </Animated.ScrollView>

            {!result && !busy && (
              <TaskHeroStage style={heroStyle} pointerEvents={ready ? 'none' : 'box-none'}>
                <TaskHero
                  title="A place for every plan"
                  description="A quiet walk, a good book, a coffee. Search a little city guide in your own words."
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

const { spacing, radius, borderWidth } = tokens;
const entrance = FadeIn.duration(tokens.motion.photoRevealDuration).reduceMotion(
  ReduceMotion.System
);
const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  results: { gap: spacing.md, paddingBottom: spacing.sm },
  summary: { gap: spacing.sm, paddingTop: spacing.lg, paddingBottom: spacing.sm },
  card: { borderRadius: radius.card, padding: spacing.lg, gap: spacing.sm },
  cardHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { flex: 1 },
  relevance: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  track: { flex: 1, height: borderWidth.thin, overflow: 'hidden', borderRadius: radius.pill },
  fill: { height: '100%', borderRadius: radius.pill },
  note: { textAlign: 'center', paddingTop: spacing.xs },
  activity: { alignItems: 'center' },
});
