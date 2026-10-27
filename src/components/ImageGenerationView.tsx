import { Keyboard, StyleSheet, View } from 'react-native';
import type { SkImage } from '@shopify/react-native-skia';
import type { useTextToImage } from 'react-native-executorch';
import Animated, { Easing, FadeIn, ReduceMotion } from 'react-native-reanimated';

import { AppText } from '@/components/AppText';
import { CircularProgress } from '@/components/CircularProgress';
import { GeneratedImageViewport } from '@/components/GeneratedImageViewport';
import { ModelSetup } from '@/components/ModelSetup';
import { PromptInput } from '@/components/PromptInput';
import { TaskHero } from '@/components/TaskHero';
import { TaskHeroStage } from '@/components/TaskHeroStage';
import { useChatKeyboard } from '@/hooks/useChatKeyboard';
import { useKeyboardScroll } from '@/hooks/useKeyboardScroll';
import type { ModelControls } from '@/hooks/useModelControls';
import { tokens } from '@/theme';

const suggestions = [
  {
    label: 'Landscape',
    prompt: 'A serene mountain lake at sunrise, soft golden light, landscape photography',
  },
  { label: 'Painting', prompt: 'A cozy library with warm candlelight, digital painting' },
  { label: 'Photo', prompt: 'A golden retriever puppy in a field of flowers, studio photo' },
];

/** A centred task hero, generated canvas and keyboard-following prompt, with honest indeterminate generation feedback. */
export function ImageGenerationView({
  image,
  prompt,
  onPromptChange,
  onGenerate,
  busy,
  latency,
  model,
  status,
}: {
  image: SkImage | null;
  prompt: string;
  onPromptChange: (value: string) => void;
  onGenerate: () => Promise<void>;
  busy: boolean;
  latency: number | null;
  model: ModelControls;
  status: ReturnType<typeof useTextToImage>;
}) {
  const { keyboardStyle, heroStyle } = useChatKeyboard();
  const scroll = useKeyboardScroll();
  const ready = model.prepared && model.loaded && status.isReady && !model.deleting;
  return (
    <Animated.View style={[styles.root, keyboardStyle]}>
      <View style={styles.content}>
        <Animated.ScrollView
          ref={scroll}
          style={styles.stage}
          contentContainerStyle={styles.previewContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
        >
          {image && (
            <>
              <GeneratedImageViewport image={image} />
              <View style={styles.result} accessibilityLiveRegion="polite">
                <AppText variant="secondary" numberOfLines={1} style={styles.resultLabel}>
                  Image generated
                </AppText>
                {latency !== null && (
                  <AppText variant="caption" tone="muted" numberOfLines={1}>
                    {latency} ms
                  </AppText>
                )}
              </View>
            </>
          )}
          {busy && (
            <View
              style={styles.loading}
              accessible
              accessibilityRole="progressbar"
              accessibilityLabel="Generating image"
              accessibilityState={{ busy: true }}
            >
              <CircularProgress progress={100} indeterminate />
              <AppText variant="secondary" tone="muted">
                Creating image…
              </AppText>
            </View>
          )}
        </Animated.ScrollView>
        {ready && (
          <Animated.View entering={composerEntrance}>
            <PromptInput
              value={prompt}
              onChangeText={onPromptChange}
              onSubmit={() => {
                Keyboard.dismiss();
                void onGenerate();
              }}
              disabled={busy}
              canSubmit={!!prompt.trim() && !busy}
              placeholder="Describe an image…"
              submitLabel="Generate image"
              suggestions={suggestions}
              reserveSuggestionSpace
            />
          </Animated.View>
        )}
        {!image && !busy && (
          <TaskHeroStage style={heroStyle} pointerEvents={ready ? 'none' : 'box-none'}>
            <TaskHero
              title="Imagine it. Create it"
              description="Turn a few words into a picture, right on your device."
              setup={<ModelSetup model={model} status={status} />}
            />
          </TaskHeroStage>
        )}
      </View>
    </Animated.View>
  );
}
const { spacing, layout } = tokens;
const composerEntrance = FadeIn.duration(tokens.motion.photoRevealDuration)
  .easing(Easing.out(Easing.cubic))
  .reduceMotion(ReduceMotion.System);
const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  content: { flex: 1, gap: spacing.sm },
  stage: { flex: 1, minHeight: 0 },
  previewContent: { flexGrow: 1, justifyContent: 'center', gap: spacing.md },
  loading: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  result: {
    minHeight: layout.touchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  resultLabel: { flex: 1 },
});
