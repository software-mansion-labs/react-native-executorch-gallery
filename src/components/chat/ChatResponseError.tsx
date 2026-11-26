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
    <View style={[styles.root, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.icon, { backgroundColor: colors.warningSurface }]}>
        <Ionicons
          name="alert-circle-outline"
          size={iconSize.small}
          color={colors.warning}
          accessible={false}
        />
      </View>
      <View style={styles.content}>
        <View style={styles.message} accessibilityRole="alert" accessibilityLiveRegion="polite">
          <AppText variant="title">Response unfinished</AppText>
          <AppText variant="secondary" tone="muted">
            {message}
          </AppText>
        </View>
        <Pressable
          onPress={onEditPrompt}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityState={{ disabled }}
          style={({ pressed }) => [
            styles.action,
            { backgroundColor: colors.background, borderColor: colors.border },
            pressed && styles.pressed,
            disabled && styles.disabled,
          ]}
        >
          <Ionicons
            name="pencil-outline"
            size={iconSize.small}
            color={colors.accent}
            accessible={false}
          />
          <AppText variant="label" tone="accent">
            Edit prompt
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}

const { spacing, layout, opacity, radius, borderWidth } = tokens;
const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.md,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: borderWidth.hairline,
    borderRadius: radius.card,
  },
  icon: { borderRadius: radius.pill, padding: spacing.xs },
  content: { flex: 1, gap: spacing.md },
  message: { gap: spacing.xxs },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    minHeight: layout.touchTarget,
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: borderWidth.hairline,
  },
  pressed: { opacity: opacity.pressed },
  disabled: { opacity: opacity.disabled },
});
