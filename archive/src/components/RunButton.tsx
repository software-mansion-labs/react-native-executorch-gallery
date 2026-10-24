import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { borderWidth, radius, spacing, useTheme } from '@/theme';

export interface RunButtonProps {
  /** Whether the task can currently be run. */
  canRun: boolean;
  /** Whether the task is actively processing. */
  busy: boolean;
  /** Triggered when the button is pressed. */
  onPress: () => void;
  /** Button label. */
  label: string;
}

/**
 * Primary action button used in the task footer.
 *
 * Shows a spinner while the task runs and a scan badge when it can be run,
 * with pressure feedback. The accent/disabled states are driven by `canRun`
 * and `busy`.
 *
 * @param props Run state and label.
 * @returns A full-width primary action button.
 */
export function RunButton({ canRun, busy, onPress, label }: RunButtonProps) {
  const { colors } = useTheme();
  const enabled = canRun || busy;

  return (
    <Pressable
      onPress={onPress}
      disabled={!canRun || busy}
      style={({ pressed }) => [
        styles.runButton,
        enabled
          ? {
              backgroundColor: colors.accent,
              borderColor: colors.accentBorder,
              shadowColor: colors.accent,
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.25,
              shadowRadius: 8,
              elevation: 4,
              opacity: busy ? 0.95 : pressed ? 0.85 : 1,
            }
          : {
              backgroundColor: colors.surfaceSubtle,
              borderColor: colors.border,
              opacity: 1,
            },
        { transform: [{ scale: pressed && canRun && !busy ? 0.98 : 1 }] },
      ]}
    >
      {busy ? (
        <View style={styles.inner}>
          <ActivityIndicator size="small" color={colors.onAccent} />
          <Text style={[styles.label, { color: colors.onAccent }]}>Executing on-device…</Text>
        </View>
      ) : (
        <View style={styles.inner}>
          {canRun ? (
            <View style={styles.iconBadge}>
              <Icon name="scan" size={16} color={colors.onAccent} strokeWidth={2} />
            </View>
          ) : null}
          <Text style={[styles.label, { color: canRun ? colors.onAccent : colors.textMuted }]}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  runButton: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs + 2,
    height: 48,
  },
  iconBadge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
});
