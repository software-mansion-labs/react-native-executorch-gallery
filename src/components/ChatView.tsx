import { useRef, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeIn, ReduceMotion } from 'react-native-reanimated';
import type { useLLMChatSession } from 'react-native-executorch';

import { AppText } from '@/components/AppText';
import { ChatPhoto } from '@/components/ChatPhoto';
import { ChatContext } from '@/components/ChatContext';
import { ChatDisclosure } from '@/components/ChatDisclosure';
import { ChatThinking } from '@/components/ChatThinking';
import { ChatText } from '@/components/ChatText';
import { ChatToolDetails } from '@/components/ChatToolDetails';
import { ChatResponseError } from '@/components/ChatResponseError';
import { ModelSetup } from '@/components/ModelSetup';
import { PromptInput } from '@/components/PromptInput';
import { TaskHero } from '@/components/TaskHero';
import { TaskHeroStage } from '@/components/TaskHeroStage';
import { ThinkingIndicator } from '@/components/ThinkingIndicator';
import { presentChatTurn, type ChatTurn } from '@/lib/chat-presentation';
import type { ModelControls } from '@/hooks/useModelControls';
import { useChatKeyboard } from '@/hooks/useChatKeyboard';
import { tokens, useTheme } from '@/theme';

const defaultSuggestions = [
  { label: 'Calculate', prompt: 'What’s 18% of 245?' },
  { label: 'Convert', prompt: 'Convert 72°F to Celsius.' },
  { label: 'Time', prompt: 'What time is it in Tokyo?' },
];

/** Conversation, expandable reasoning, context budget and a keyboard-friendly composer. */
export function ChatView({
  draft,
  onDraftChange,
  turns,
  busy,
  onSend,
  onStop,
  session,
  model,
  onNewChat,
  heroTitle = 'Let’s talk it through',
  heroDescription = 'A conversation, right on your device.',
  suggestions = defaultSuggestions,
  canSend = true,
  composerAccessory,
  contextAccessory,
}: {
  draft: string;
  onDraftChange: (value: string) => void;
  turns: ChatTurn[];
  busy: boolean;
  onSend: (prompt?: string) => Promise<void>;
  onStop: () => void;
  session: ReturnType<typeof useLLMChatSession>;
  model: ModelControls;
  onNewChat: () => void;
  heroTitle?: string;
  heroDescription?: string;
  suggestions?: readonly { label: string; prompt: string }[];
  canSend?: boolean;
  composerAccessory?: ReactNode;
  contextAccessory?: ReactNode;
}) {
  const { colors } = useTheme();
  const { keyboardStyle, heroStyle } = useChatKeyboard();
  const scroll = useRef<ScrollView>(null);
  const following = useRef(true);
  const readingDetails = useRef(false);
  const onDisclosureToggle = () => {
    readingDetails.current = true;
    following.current = false;
  };
  const ready = model.prepared && model.loaded && session.isReady;
  return (
    <Animated.View style={[styles.root, keyboardStyle]}>
      <View style={styles.content}>
        <ScrollView
          style={styles.scroll}
          ref={scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.messages}
          scrollEventThrottle={16}
          onScroll={({ nativeEvent: { contentOffset, contentSize, layoutMeasurement } }) => {
            if (readingDetails.current) return;
            following.current =
              contentSize.height - contentOffset.y - layoutMeasurement.height <
              tokens.layout.chatScrollThreshold;
          }}
          onScrollBeginDrag={() => {
            readingDetails.current = false;
          }}
          onContentSizeChange={() => {
            if (following.current) scroll.current?.scrollToEnd({ animated: false });
          }}
          onLayout={() => {
            if (following.current) scroll.current?.scrollToEnd({ animated: false });
          }}
        >
          {turns.map(presentChatTurn).map((turn, turnIndex) => (
            <View key={turnIndex} style={styles.turn}>
              <View
                style={[
                  styles.question,
                  turn.imageUri && styles.imageQuestion,
                  { backgroundColor: colors.surface },
                ]}
              >
                {turn.imageUri && <ChatPhoto uri={turn.imageUri} />}
                <AppText selectable>{turn.question}</AppText>
              </View>
              {(turn.responses.some(Boolean) || turn.tools.length > 0 || !!turn.error) && (
                <Animated.View
                  entering={answerEntrance}
                  style={[styles.answer, { backgroundColor: colors.surface }]}
                >
                  {(turn.thinking || (turn.pending && !turn.plainResponse)) && (
                    <ChatThinking
                      text={turn.thinking}
                      active={turn.pending && turn.reasoning}
                      onToggle={onDisclosureToggle}
                    />
                  )}
                  {turn.tools.map((tool, index) => {
                    return (
                      <ChatDisclosure
                        key={index}
                        icon="tool"
                        label={
                          tool.detail.includes('"error"')
                            ? `${tool.name} · Couldn’t complete`
                            : tool.name
                        }
                        onToggle={onDisclosureToggle}
                      >
                        <ChatToolDetails tool={tool} />
                      </ChatDisclosure>
                    );
                  })}
                  {!!turn.answer && (
                    <Animated.View entering={answerEntrance}>
                      <ChatText>{turn.answer}</ChatText>
                    </Animated.View>
                  )}
                  {turn.error && (
                    <Animated.View entering={answerEntrance}>
                      <ChatResponseError
                        message={turn.error}
                        disabled={busy}
                        onEditPrompt={() => onDraftChange(turn.question)}
                      />
                    </Animated.View>
                  )}
                </Animated.View>
              )}
              {turn.pending && <ThinkingIndicator />}
            </View>
          ))}
        </ScrollView>
        {ready && (
          <Animated.View entering={composerEntrance}>
            <PromptInput
              value={draft}
              onChangeText={onDraftChange}
              canSubmit={canSend && !!draft.trim() && !busy}
              isGenerating={busy}
              onStop={onStop}
              onSubmit={() => {
                following.current = true;
                readingDetails.current = false;
                void onSend();
              }}
              suggestions={!turns.length ? suggestions : undefined}
              reserveSuggestionSpace={!turns.length}
              attachment={composerAccessory}
              leadingAccessory={
                <View style={[styles.contextActions, !!contextAccessory && styles.photoActions]}>
                  <ChatContext
                    session={session}
                    busy={busy}
                    hasMessages={!!turns.length}
                    onNewChat={() => {
                      model.resetPreparation();
                      onNewChat();
                    }}
                  />
                  {contextAccessory}
                </View>
              }
            />
          </Animated.View>
        )}
        {!turns.length && (
          <TaskHeroStage style={heroStyle} pointerEvents={ready ? 'none' : 'box-none'}>
            <TaskHero
              title={heroTitle}
              description={heroDescription}
              setup={<ModelSetup model={model} status={session} />}
            />
          </TaskHeroStage>
        )}
      </View>
    </Animated.View>
  );
}

const { spacing, radius } = tokens;
const answerEntrance = FadeIn.duration(tokens.motion.chatDisclosureFadeDuration).reduceMotion(
  ReduceMotion.System
);
const composerEntrance = FadeIn.duration(tokens.motion.photoRevealDuration)
  .easing(Easing.out(Easing.cubic))
  .reduceMotion(ReduceMotion.System);
const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  content: { flex: 1, gap: spacing.md },
  scroll: { flex: 1, minHeight: 0 },
  messages: { flexGrow: 1, gap: spacing.xxl, paddingTop: spacing.xl, paddingBottom: spacing.xl },
  turn: { gap: spacing.md },
  question: {
    alignSelf: 'flex-end',
    maxWidth: '90%',
    borderRadius: radius.card,
    borderBottomRightRadius: radius.annotation,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  answer: {
    alignSelf: 'flex-start',
    width: '95%',
    borderRadius: radius.card,
    borderBottomLeftRadius: radius.annotation,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  imageQuestion: { width: '90%', gap: spacing.md },
  contextActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  photoActions: { flex: 1, justifyContent: 'space-between' },
});
