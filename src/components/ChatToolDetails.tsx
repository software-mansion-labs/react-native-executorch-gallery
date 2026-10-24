import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import type { ChatTurn } from '@/lib/chat-presentation';
import { tokens } from '@/theme';

function formatResult(text: string) {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}

/** Shows the exact invocation arguments and returned data within a tool disclosure. */
export function ChatToolDetails({ tool }: { tool: ChatTurn['tools'][number] }) {
  return (
    <View style={styles.sections}>
      <View style={styles.section}>
        <AppText variant="caption" tone="muted">
          Arguments
        </AppText>
        <AppText variant="secondary" tone="muted" selectable>
          {JSON.stringify(tool.arguments, null, 2)}
        </AppText>
      </View>
      <View style={styles.section}>
        <AppText variant="caption" tone="muted">
          Result
        </AppText>
        <AppText variant="secondary" tone="muted" selectable>
          {formatResult(tool.detail)}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sections: { gap: tokens.spacing.lg },
  section: { gap: tokens.spacing.xs },
});
