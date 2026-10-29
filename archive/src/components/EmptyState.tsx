import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { spacing, useTheme } from '@/theme';

export interface EmptyStateProps {
  /** Short primary hint, e.g. "Nothing to show yet". */
  title: string;
  /** Longer secondary explanation. */
  message: string;
}

/**
 * A subtle centered placeholder shown before a task has produced output.
 *
 * @param props A heading and a supporting line.
 * @returns A centered empty-state block.
 */
export function EmptyState({ title, message }: EmptyStateProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.textSecondary }]}>{title}</Text>
      <Text style={[styles.message, { color: colors.textMuted }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  message: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    maxWidth: 280,
  },
});
