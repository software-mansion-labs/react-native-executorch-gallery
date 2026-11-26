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
    <View style={[styles.root, { borderColor: colors.border }]}>
      <View style={styles.notice}>
        <Ionicons
          name="alert-circle-outline"
          style={styles.icon}
          size={iconSize.small}
          color={colors.danger}
          accessible={false}
        />
        <View style={styles.message} accessibilityRole="alert" accessibilityLiveRegion="polite">
          <AppText variant="title">Response unfinished</AppText>
          <AppText variant="secondary" tone="muted">
            {message}
          </AppText>
        </View>
      </View>
      <Pressable
        onPress={onEditPrompt}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        style={({ pressed }) => [
          styles.action,
          pressed && styles.pressed,
          disabled && styles.disabled,
        ]}
      >
        <View
          style={[styles.capsule, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <AppText variant="label">Edit prompt</AppText>
        </View>
      </Pressable>
    </View>
  );
}

const { spacing, layout, opacity, borderWidth, radius } = tokens;
const styles = StyleSheet.create({
  root: {
    marginTop: spacing.md,
    paddingStart: spacing.md,
    borderStartWidth: borderWidth.thin,
  },
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  icon: { marginTop: spacing.xs },
  message: { flex: 1, gap: spacing.xxs },
  action: {
    justifyContent: 'center',
    alignSelf: 'flex-start',
    minHeight: layout.touchTarget,
  },
  capsule: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: borderWidth.thin,
  },
  pressed: { opacity: opacity.pressed },
  disabled: { opacity: opacity.disabled },
});
