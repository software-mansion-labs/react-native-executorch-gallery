import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { StyleSheet, Pressable, type PressableProps } from 'react-native';

import { tokens, useTheme, type Theme } from '@/theme';

type IconButtonProps = PressableProps & {
  icon: ComponentProps<typeof Ionicons>['name'];
  accessibilityLabel: string;
  size?: keyof Theme['iconSize'];
  tone?: 'text' | 'muted';
};

/** A labeled icon action with a consistent touch target and pressed feedback.
 * Accepts a named Ionicon, token-based size and tone, and native Pressable props. */
export function IconButton({ icon, size = 'medium', tone = 'text', ...props }: IconButtonProps) {
  const { colors, iconSize } = useTheme();

  return (
    <Pressable
      {...props}
      accessibilityRole="button"
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Ionicons name={icon} size={iconSize[size]} color={colors[tone]} />
    </Pressable>
  );
}

const { layout, opacity } = tokens;

const styles = StyleSheet.create({
  button: {
    width: layout.touchTarget,
    height: layout.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: opacity.pressed,
  },
});
