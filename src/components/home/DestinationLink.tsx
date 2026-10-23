import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { ComponentProps } from 'react';
import { StyleSheet, Pressable, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { tokens, useTheme } from '@/theme';

type DestinationLinkProps = {
  title: string;
  subtitle: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  query: string;
};

/** A home discovery card. Opens the task list with its query prefilled.
 * The title, subtitle, and named icon describe the destination. */
export function DestinationLink({ title, subtitle, icon, query }: DestinationLinkProps) {
  const { colors, iconSize } = useTheme();

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/tasks', params: { query } })}
      accessibilityRole="link"
      accessibilityLabel={`${title}. ${subtitle}`}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.surface },
        pressed && styles.pressed,
      ]}
    >
      <Ionicons name={icon} size={iconSize.large} color={colors.muted} />
      <View style={styles.copy}>
        <AppText variant="title">{title}</AppText>
        <AppText variant="caption" tone="muted">
          {subtitle}
        </AppText>
      </View>
    </Pressable>
  );
}

const { spacing, radius, opacity } = tokens;

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.card,
  },
  copy: {
    flex: 1,
    gap: spacing.xxs,
  },
  pressed: {
    opacity: opacity.pressed,
  },
});
