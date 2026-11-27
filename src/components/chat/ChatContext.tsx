import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { useLLMChatSession } from 'react-native-executorch';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { AppText } from '@/components/AppText';
import { BlueActionSurface } from '@/components/BlueActionSurface';
import { BottomSheet } from '@/components/BottomSheet';
import { ContextGauge } from '@/components/chat/ContextGauge';
import { useCardPressAnimation } from '@/hooks/useCardPressAnimation';
import { useChatContext } from '@/hooks/chat/useChatContext';
import { tokens, useTheme } from '@/theme';

/** A compact capacity indicator and a focused context sheet, driven by actual native token counts. */
export function ChatContext({
  session,
  busy,
  hasMessages,
  onNewChat,
}: {
  session: ReturnType<typeof useLLMChatSession>;
  busy: boolean;
  hasMessages: boolean;
  onNewChat: () => void;
}) {
  const { colors, scheme } = useTheme();
  const context = useChatContext(session, busy);
  const [visible, setVisible] = useState(false);
  const pill = useCardPressAnimation();
  const reset = useCardPressAnimation();
  const used = Math.max(0, Math.min(1, context?.usageRatio ?? 0));
  const progress = useSharedValue(used);
  useEffect(() => {
    progress.set(
      withTiming(used, {
        duration: tokens.motion.modelProgressDuration,
        reduceMotion: ReduceMotion.System,
      })
    );
  }, [used, progress]);
  const meterStyle = useAnimatedStyle(() => ({ width: `${progress.get() * 100}%` }));
  const resetDisabled = busy || !hasMessages;
  return (
    <>
      <AnimatedPressable
        onPress={() => setVisible(true)}
        disabled={!context}
        accessibilityRole="button"
        accessibilityLabel="Conversation context"
        accessibilityHint={
          context
            ? `${context.remainingTokens.toLocaleString()} of ${context.maxContextLen.toLocaleString()} tokens available. Opens context details.`
            : undefined
        }
        onPressIn={pill.onPressIn}
        onPressOut={pill.onPressOut}
        style={[styles.button, pill.animatedStyle]}
      >
        <View
          style={[
            styles.pill,
            { backgroundColor: colors.promptSurface, borderColor: colors.promptBorder },
          ]}
        >
          {context && <ContextGauge used={progress} />}
          <AppText style={styles.number}>
            {context ? `${Math.round((1 - used) * 100)}%` : '—'}
          </AppText>
        </View>
      </AnimatedPressable>
      <BottomSheet title="Conversation context" visible={visible} onClose={() => setVisible(false)}>
        {context && (
          <View style={styles.details}>
            <View style={styles.balance}>
              <AppText variant="hero" style={styles.number}>
                {context.remainingTokens} · {Math.round((1 - used) * 100)}%
              </AppText>
              <AppText variant="secondary" tone="muted">
                tokens available
              </AppText>
            </View>
            <View style={styles.usage}>
              <View
                style={[styles.track, { backgroundColor: colors.border }]}
                accessibilityRole="progressbar"
                accessibilityLabel="Context used"
                accessibilityValue={{ min: 0, max: context.maxContextLen, now: context.pos }}
              >
                <Animated.View style={[styles.fill, meterStyle]}>
                  <LinearGradient
                    colors={tokens.activityAccent[scheme]}
                    style={StyleSheet.absoluteFill}
                  />
                </Animated.View>
              </View>
              <AppText variant="caption" tone="muted" style={styles.number}>
                {context.pos} of {context.maxContextLen} used · {Math.round(used * 100)}%
              </AppText>
            </View>
            <AppText variant="secondary" tone="muted">
              Messages, replies and tool instructions share this space.
            </AppText>
            <AnimatedPressable
              accessibilityRole="button"
              accessibilityLabel="Start a new chat"
              accessibilityState={{ disabled: resetDisabled }}
              disabled={resetDisabled}
              onPress={() => {
                setVisible(false);
                onNewChat();
              }}
              onPressIn={reset.onPressIn}
              onPressOut={reset.onPressOut}
              style={[styles.reset, resetDisabled && styles.disabled, reset.animatedStyle]}
            >
              <BlueActionSurface scheme={scheme} />
              <AppText
                variant="secondary"
                numberOfLines={1}
                style={{ color: tokens.actionSurface[scheme].foreground }}
              >
                New chat
              </AppText>
            </AnimatedPressable>
          </View>
        )}
      </BottomSheet>
    </>
  );
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const { spacing, layout, radius, borderWidth, opacity } = tokens;
const styles = StyleSheet.create({
  button: {
    minWidth: layout.touchTarget,
    minHeight: layout.touchTarget,
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: borderWidth.hairline,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    minHeight: layout.compactPromptActionSize,
  },
  details: { gap: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.lg },
  balance: { gap: spacing.xs },
  number: { fontVariant: ['tabular-nums'] },
  usage: { gap: spacing.sm },
  track: { height: layout.contextMeterHeight, borderRadius: radius.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill, overflow: 'hidden' },
  reset: {
    minHeight: layout.touchTarget,
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: opacity.disabled },
});
