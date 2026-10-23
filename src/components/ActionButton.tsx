import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { AppText } from '@/components/AppText';
import { tokens, useTheme } from '@/theme';

type ActionButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
  secondary?: boolean;
};

/** A labeled task action with accessible disabled and working states. */
export function ActionButton({ label, onPress, disabled, busy, secondary }: ActionButtonProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled || !!busy, busy: !!busy }}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: secondary ? colors.surface : colors.accent },
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      {busy && <ActivityIndicator color={secondary ? colors.text : colors.onAccent} />}
      <AppText variant="label" style={{ color: secondary ? colors.text : colors.onAccent }}>
        {label}
      </AppText>
    </Pressable>
  );
}

const { spacing, radius, layout, opacity } = tokens;
const styles = StyleSheet.create({
  button: {
    minHeight: layout.touchTarget,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pressed: { opacity: opacity.pressed },
  disabled: { opacity: opacity.disabled },
});
