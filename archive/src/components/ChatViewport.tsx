import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { llm } from 'react-native-executorch';

import { radius, spacing, useTheme } from '@/theme';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  stats?: llm.LLMGenerationStats;
}

export interface ChatViewportProps {
  /** Full list of message turns. */
  messages: ChatMessage[];
  /** In-progress live streaming token response. */
  streamingText: string | null;
  /** Ref to the scroll view for auto-scrolling on token generation. */
  scrollRef?: React.RefObject<ScrollView | null>;
}

function EmptyChatGreeting() {
  const { colors } = useTheme();

  return (
    <View style={styles.emptyContainer}>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>How can I help you today?</Text>
      <Text style={[styles.emptySubtitle, { color: colors.textDim }]}>
        Powered by on-device LFM 2.5 (1.2B)
      </Text>
    </View>
  );
}

function UserBubble({ content }: { content: string }) {
  const { colors } = useTheme();

  return (
    <View style={styles.userRow}>
      <View
        style={[
          styles.bubble,
          styles.userBubble,
          {
            backgroundColor: colors.surfaceSubtle,
            borderBottomRightRadius: radius.xs,
          },
        ]}
      >
        <Text style={[styles.messageText, { color: colors.text }]} selectable>
          {content}
        </Text>
      </View>
    </View>
  );
}

function AssistantBubble({
  content,
  stats,
  isStreaming = false,
}: {
  content: string;
  stats?: llm.LLMGenerationStats;
  isStreaming?: boolean;
}) {
  const { colors } = useTheme();

  let statsLabel: string | null = null;
  if (stats) {
    statsLabel = `${stats.tokensPerSecond.toFixed(1)} tok/s · ${stats.prefill.durationMs.toFixed(0)} ms prefill · ${stats.numTokens} tokens`;
  }

  return (
    <View style={styles.assistantRow}>
      <View
        style={[
          styles.bubble,
          styles.assistantBubble,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderBottomLeftRadius: radius.xs,
          },
        ]}
      >
        <Text style={[styles.messageText, { color: colors.text }]} selectable>
          {content}
        </Text>

        {statsLabel ? (
          <Text style={[styles.statsText, { color: colors.textDim }]}>{statsLabel}</Text>
        ) : null}
      </View>
    </View>
  );
}

/**
 * Clean, borderless conversational chat viewport matching ChatGPT / Gemini aesthetic.
 *
 * Blends seamlessly with the screen background with no enclosing borders:
 * - User messages in rounded pills on the right.
 * - Assistant responses stream in natural typography on the left with generation stats.
 *
 * @param props Messages, streaming text chunk, and scroll ref.
 * @returns Clean conversational message stream.
 */
export function ChatViewport({ messages, streamingText, scrollRef }: ChatViewportProps) {
  const isEmpty = messages.length === 0 && streamingText === null;
  const isStreaming = streamingText !== null;

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef as any}
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, isEmpty && styles.emptyContent]}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => {
          // Use non-animated instant lock during token streaming to prevent bouncy rubberbanding
          scrollRef?.current?.scrollToEnd({ animated: !isStreaming });
        }}
      >
        {isEmpty ? (
          <EmptyChatGreeting />
        ) : (
          <View style={styles.bubbleList}>
            {messages.map((msg, index) =>
              msg.role === 'user' ? (
                <UserBubble key={index} content={msg.content} />
              ) : (
                <AssistantBubble key={index} content={msg.content} stats={msg.stats} />
              )
            )}

            {/* Live Streaming Assistant Output */}
            {typeof streamingText === 'string' && streamingText.length > 0 ? (
              <AssistantBubble content={streamingText} isStreaming />
            ) : null}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  emptyContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  bubbleList: {
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  bubbleRow: {
    flexDirection: 'row',
    width: '100%',
  },
  userRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    width: '100%',
  },
  assistantRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    width: '100%',
  },
  bubble: {
    maxWidth: '85%',
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.xl,
    gap: 4,
  },
  userBubble: {},
  assistantBubble: {
    borderWidth: 1,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '400',
  },
  statsText: {
    fontSize: 11,
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
});
