import { memo, useRef, useState } from 'react';
import { Keyboard, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';

import { BottomSheet } from '@/components/BottomSheet';
import { OmniVoiceStage } from '@/components/omni/OmniVoiceStage';
import { AppText } from '@/components/AppText';
import { ChatContext } from '@/components/chat/ChatContext';
import { ChatPhoto } from '@/components/chat/ChatPhoto';
import { ChatText } from '@/components/chat/ChatText';
import { ChatImageInput } from '@/components/image-description/ChatImageInput';
import { ChatImagePreview } from '@/components/image-description/ChatImagePreview';
import { ModelSetup } from '@/components/ModelSetup';
import type { PickedImage } from '@/components/PhotoPicker';
import { PhotoActionButton } from '@/components/PhotoActionButton';
import { PromptInput } from '@/components/PromptInput';
import { TaskHero } from '@/components/TaskHero';
import { TaskHeroStage } from '@/components/TaskHeroStage';
import { TaskScreen } from '@/components/TaskScreen';
import { ThinkingIndicator } from '@/components/ThinkingIndicator';
import { useChatKeyboard } from '@/hooks/useChatKeyboard';
import { useOmni, type OmniChatTurn } from '@/hooks/useOmni';
import { usePhotoInput } from '@/hooks/usePhotoInput';
import { tokens, useTheme } from '@/theme';

export function OmniDemo() {
  const omni = useOmni();
  return (
    <TaskScreen
      title="Omni conversation"
      model={omni.model}
      status={omni.status}
      error={omni.error}
      busy={omni.busy || omni.isRecording || omni.recordingStarting}
      scrollable={false}
    >
      <OmniConversation key={omni.revision} omni={omni} />
    </TaskScreen>
  );
}

function OmniConversation({ omni }: { omni: ReturnType<typeof useOmni> }) {
  const { keyboardStyle, heroStyle } = useChatKeyboard();
  const scroll = useRef<ScrollView>(null);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [draft, setDraft] = useState('');
  const [image, setImage] = useState<PickedImage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const photo = usePhotoInput(setImage, 800, setError);
  const ready = omni.model.loaded && omni.model.prepared && omni.status.isReady;
  const blocked = omni.busy || omni.model.deleting || omni.isRecording || omni.recordingStarting;
  const clearComposer = () => {
    setDraft('');
    photo.clear();
  };
  const send = async () => {
    if (!ready || blocked || photo.picking || (!draft.trim() && !image)) return;
    Keyboard.dismiss();
    setError(null);
    await omni.run(
      {
        prompt: draft.trim() || (image ? 'Describe this photo briefly.' : ''),
        imageUri: image?.uri,
        image: image?.buffer,
      },
      clearComposer
    );
  };
  return (
    <Animated.View style={[styles.root, keyboardStyle]}>
      <View style={styles.content}>
        {ready && (
          <Animated.View style={[styles.scroll, heroStyle]}>
            <OmniVoiceStage
              recording={omni.isRecording}
              starting={omni.recordingStarting}
              generating={omni.busy}
              playing={omni.speaking}
              buffering={omni.bufferingSpeech}
              paused={historyVisible}
              level={omni.isRecording ? omni.microphoneLevel : omni.playbackLevel}
              onPress={() => {
                if (omni.busy || omni.playing) omni.stop();
                else {
                  Keyboard.dismiss();
                  void omni.record(
                    { prompt: draft.trim(), image: image?.buffer, imageUri: image?.uri },
                    clearComposer
                  );
                }
              }}
            />
          </Animated.View>
        )}
        {ready && (
          <Animated.View entering={entrance}>
            {error && <AppText accessibilityRole="alert">{error}</AppText>}
            <PromptInput
              value={draft}
              onChangeText={setDraft}
              onSubmit={() => void send()}
              onStop={omni.stop}
              isGenerating={omni.busy}
              disabled={omni.isRecording || omni.recordingStarting || omni.model.deleting}
              canSubmit={!blocked && !photo.picking && (!!draft.trim() || !!image)}
              placeholder="Ask for a spoken reply…"
              attachment={
                photo.image ? (
                  <ChatImagePreview
                    image={photo.image}
                    onRemove={photo.clear}
                    disabled={blocked || photo.picking}
                  />
                ) : undefined
              }
              leadingAccessory={
                <View style={styles.contextActions}>
                  <ChatContext
                    session={omni}
                    description="Messages, photos and speech share this space."
                    busy={blocked}
                    hasMessages={omni.turns.length > 0}
                    onNewChat={() => void omni.reset()}
                  />
                  <View style={styles.actions}>
                    <ChatImageInput
                      onChoose={photo.choose}
                      picking={photo.picking}
                      disabled={blocked}
                    />
                    <PhotoActionButton
                      size="small"
                      iconName="chatbubbles-outline"
                      label="Conversation history"
                      disabled={false}
                      onPress={() => setHistoryVisible(true)}
                    />
                  </View>
                </View>
              }
            />
          </Animated.View>
        )}
        {!ready && (
          <TaskHeroStage style={heroStyle} pointerEvents={ready ? 'none' : 'box-none'}>
            <TaskHero
              title="Let’s hear it"
              description="Ask with words, a photo or your voice. Get a spoken reply, right on your device."
              setup={<ModelSetup model={omni.model} status={omni.status} />}
            />
          </TaskHeroStage>
        )}
      </View>
      <BottomSheet
        title="Conversation"
        visible={historyVisible}
        onClose={() => setHistoryVisible(false)}
        scrollViewRef={scroll}
      >
        <View
          style={styles.messages}
          onLayout={() => scroll.current?.scrollToEnd({ animated: false })}
        >
          {omni.turns.map((turn) => (
            <SpeechTurn
              key={turn.id}
              turn={turn}
              playing={omni.playingTurn === turn.id && omni.playing}
              busy={omni.busy}
              onPlay={omni.play}
              onStop={omni.stopPlayback}
            />
          ))}
          {!omni.turns.length && (
            <AppText tone="muted">Your spoken conversation will appear here.</AppText>
          )}
        </View>
      </BottomSheet>
    </Animated.View>
  );
}

const SpeechTurn = memo(function SpeechTurn({
  turn,
  playing,
  busy,
  onPlay,
  onStop,
}: {
  turn: OmniChatTurn;
  playing: boolean;
  busy: boolean;
  onPlay: (audio: Float32Array, id: number) => Promise<void>;
  onStop: () => void;
}) {
  const { colors } = useTheme();
  const result = turn.result;
  const text = result?.text ?? turn.preview;
  return (
    <View style={styles.turn}>
      <View
        style={[
          styles.question,
          turn.imageUri && styles.imageQuestion,
          { backgroundColor: colors.background },
        ]}
      >
        {turn.imageUri && <ChatPhoto uri={turn.imageUri} />}
        <AppText selectable>{turn.question}</AppText>
      </View>
      {(text || result || turn.error) && (
        <Animated.View
          entering={entrance}
          style={[styles.answer, { backgroundColor: colors.background }]}
        >
          {!!text && <ChatText>{text}</ChatText>}
          {result && (
            <View style={styles.row}>
              <PhotoActionButton
                size="small"
                iconName={playing ? 'stop' : 'play'}
                label={playing ? 'Stop spoken reply' : 'Replay spoken reply'}
                disabled={busy}
                onPress={() => {
                  if (playing) onStop();
                  else void onPlay(result.audio, turn.id);
                }}
              />
              <View style={styles.speechLabel}>
                <AppText>Spoken reply</AppText>
                <AppText variant="secondary" tone="muted">
                  {playing ? 'Playing · ' : ''}
                  {(result.audio.length / 24000).toFixed(1)}s
                </AppText>
              </View>
            </View>
          )}
          {result?.limited && (
            <AppText variant="secondary" tone="muted">
              {result.finishReason === 'context'
                ? 'Conversation context is full. Start a new chat to continue.'
                : 'Reply reached the requested length limit.'}
            </AppText>
          )}
          {turn.error && <AppText accessibilityRole="alert">{turn.error}</AppText>}
        </Animated.View>
      )}
      {turn.pending && <ThinkingIndicator accessibilityLabel="Preparing spoken reply" />}
    </View>
  );
});

const entrance = FadeIn.duration(tokens.motion.chatDisclosureFadeDuration).reduceMotion(
  ReduceMotion.System
);
const { spacing, radius } = tokens;
const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  content: { flex: 1, gap: spacing.sm },
  scroll: { flex: 1, minHeight: 0 },
  messages: { flexGrow: 1, gap: spacing.xl, paddingTop: spacing.xl, paddingBottom: spacing.sm },
  question: {
    alignSelf: 'flex-end',
    maxWidth: '90%',
    gap: spacing.md,
    borderRadius: radius.card,
    borderBottomRightRadius: radius.annotation,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  imageQuestion: { width: '90%' },
  answer: {
    alignSelf: 'flex-start',
    maxWidth: '90%',
    gap: spacing.md,
    borderRadius: radius.card,
    borderBottomLeftRadius: radius.annotation,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  actions: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: spacing.sm,
  },
  turn: { gap: spacing.md },
  contextActions: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  speechLabel: { gap: spacing.xs },
});
