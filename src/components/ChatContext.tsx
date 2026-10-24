import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { useLLMChatSession } from 'react-native-executorch';

import { AppText } from '@/components/AppText';
import { BottomSheet } from '@/components/BottomSheet';
import { useChatContext } from '@/hooks/useChatContext';
import { tokens } from '@/theme';

/** Quiet context disclosure; exact native token counts stay in the detail sheet. */
export function ChatContext({
  session,
  busy,
}: {
  session: ReturnType<typeof useLLMChatSession>;
  busy: boolean;
}) {
  const context = useChatContext(session, busy);
  const [visible, setVisible] = useState(false);
  return (
    <>
      <Pressable
        onPress={() => setVisible(true)}
        disabled={!context}
        accessibilityRole="button"
        accessibilityLabel="Conversation context"
        style={styles.button}
      >
        <AppText variant="caption" tone="muted">
          {context ? `Context · ${Math.round(context.usageRatio * 100)}% used` : 'Context'} ›
        </AppText>
      </Pressable>
      <BottomSheet title="Conversation context" visible={visible} onClose={() => setVisible(false)}>
        {context && (
          <View style={styles.details}>
            <AppText variant="secondary" tone="muted">
              Messages, replies and tool instructions share this space.
            </AppText>
            {[
              ['Used', context.pos],
              ['Available', context.remainingTokens],
              ['Capacity', context.maxContextLen],
            ].map(([label, count]) => (
              <View key={label} style={styles.row}>
                <AppText variant="secondary" tone="muted">
                  {label}
                </AppText>
                <AppText variant="secondary">{count.toLocaleString()} tokens</AppText>
              </View>
            ))}
          </View>
        )}
      </BottomSheet>
    </>
  );
}

const { spacing, layout } = tokens;
const styles = StyleSheet.create({
  button: { minHeight: layout.touchTarget, justifyContent: 'center', flexShrink: 1 },
  details: { gap: spacing.xl, paddingBottom: spacing.lg },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.lg },
});
