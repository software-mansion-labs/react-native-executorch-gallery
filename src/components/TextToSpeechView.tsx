import { Keyboard, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';

import { ModelSetup } from '@/components/ModelSetup';
import type { ModelStatus } from '@/components/ModelSheet';
import { PromptInput } from '@/components/PromptInput';
import { PhotoActionButton } from '@/components/PhotoActionButton';
import { SpeechReadAlong } from '@/components/SpeechReadAlong';
import { TaskHero } from '@/components/TaskHero';
import { TaskHeroStage } from '@/components/TaskHeroStage';
import { ThinkingIndicator } from '@/components/ThinkingIndicator';
import { useChatKeyboard } from '@/hooks/useChatKeyboard';
import type { ModelControls } from '@/hooks/useModelControls';
import { useReadAlongScroll } from '@/hooks/useReadAlongScroll';
import type { useSpeechPlayback } from '@/hooks/useSpeechPlayback';
import { tokens } from '@/theme';

const suggestions = [
  {
    label: 'A short welcome',
    prompt: 'Welcome. Make yourself at home. There’s a world of ideas waiting for you.',
  },
  {
    label: 'A tongue twister',
    prompt: 'She sells seashells by the seashore. The shells she sells are surely seashells.',
  },
];

/** Quiet read-along result above the shared keyboard-following composer and model preparation flow. */
export function TextToSpeechView({
  input,
  onInputChange,
  onRun,
  onReplay,
  playback,
  model,
  status,
}: {
  input: string;
  onInputChange: (value: string) => void;
  onRun: () => Promise<void>;
  onReplay: () => Promise<void>;
  playback: ReturnType<typeof useSpeechPlayback>;
  model: ModelControls;
  status: ModelStatus;
}) {
  const { keyboardStyle, heroStyle } = useChatKeyboard();
  const ready = model.prepared && model.loaded && status.isReady && !model.deleting;
  const text = model.loaded ? playback.text : '';
  const { scroll, onLayout, onTextLayout } = useReadAlongScroll(
    text,
    playback.words[playback.activeWord]?.offset
  );
  return (
    <Animated.View style={[styles.root, keyboardStyle]}>
      <View style={styles.content}>
        <ScrollView
          ref={scroll}
          onLayout={onLayout}
          style={styles.stage}
          contentContainerStyle={styles.result}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {!!text && (
            <SpeechReadAlong
              text={text}
              words={playback.words}
              activeWord={playback.activeWord}
              onTextLayout={onTextLayout}
            />
          )}
        </ScrollView>
        <View style={styles.activity}>
          {playback.busy && (
            <Animated.View entering={entrance} style={styles.status}>
              <ThinkingIndicator
                accessibilityLabel={playback.playing ? 'Speaking' : 'Preparing speech'}
              />
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
              onStop={playback.stop}
              canSubmit={!!input.trim() && !playback.busy}
              isGenerating={playback.busy}
              placeholder="Text to read…"
              submitLabel="Speak text"
              stopLabel="Stop speaking"
              suggestions={suggestions}
              reserveSuggestionSpace
              leadingAccessory={
                playback.canReplay ? (
                  <Animated.View entering={entrance}>
                    <PhotoActionButton
                      iconName="refresh-outline"
                      label="Replay speech"
                      size="small"
                      disabled={false}
                      onPress={() => {
                        Keyboard.dismiss();
                        void onReplay();
                      }}
                    />
                  </Animated.View>
                ) : undefined
              }
            />
          </Animated.View>
        )}
        {!text && (
          <TaskHeroStage style={heroStyle} pointerEvents={ready ? 'none' : 'box-none'}>
            <TaskHero
              title="Give your words a voice"
              description="Hear natural speech and follow every word, right on your device."
              setup={<ModelSetup model={model} status={status} />}
            />
          </TaskHeroStage>
        )}
      </View>
    </Animated.View>
  );
}

const { spacing, typography } = tokens;
const entrance = FadeIn.duration(tokens.motion.photoRevealDuration).reduceMotion(
  ReduceMotion.System
);
const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  content: { flex: 1, gap: spacing.md },
  stage: { flex: 1, minHeight: 0 },
  result: { flexGrow: 1, justifyContent: 'center', paddingVertical: spacing.xl },
  activity: { height: typography.body.lineHeight, justifyContent: 'center', alignItems: 'center' },
  status: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
});
