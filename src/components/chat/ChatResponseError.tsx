import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { tokens, useTheme } from '@/theme';

/** Keeps a failed response and recovery action in the conversation, above the fixed composer. */
export function ChatResponseError({
  message,
  disabled,
  onEditPrompt,
}: {
  message: string;
  disabled: boolean;
  onEditPrompt: () => void;
}) {
  const { colors, iconSize } = useTheme();
  return (
    <View style={styles.root} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <View style={styles.heading}>
        <Ionicons name="alert-circle-outline" size={iconSize.small} color={colors.danger} />
        <AppText variant="secondary">Response unfinished</AppText>
      </View>
      <AppText variant="secondary" tone="muted">
        {message}
      </AppText>
      <Pressable
        onPress={onEditPrompt}
        disabled={disabled}
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.action,
          pressed && styles.pressed,
          disabled && styles.disabled,
        ]}
      >
        <AppText variant="secondary" tone="accent">
          Edit prompt
        </AppText>
      </Pressable>
    </View>
  );
}

const { spacing, layout, opacity } = tokens;
const styles = StyleSheet.create({
  root: { paddingTop: spacing.md, gap: spacing.sm },
  heading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  action: { minHeight: layout.touchTarget, justifyContent: 'center', alignSelf: 'flex-start' },
  pressed: { opacity: opacity.pressed },
  disabled: { opacity: opacity.disabled },
});
