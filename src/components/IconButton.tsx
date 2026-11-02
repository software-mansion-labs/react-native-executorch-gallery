import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { StyleSheet, Pressable, type PressableProps } from 'react-native';

import { tokens, useTheme, type Theme } from '@/theme';

type IconButtonProps = PressableProps & {
  icon: ComponentProps<typeof Ionicons>['name'];
  accessibilityLabel: string;
  size?: keyof Theme['iconSize'];
  tone?: 'text' | 'muted' | 'danger';
  appearance?: Theme['scheme'];
  color?: string;
};

/** A labeled icon action with a consistent touch target and pressed feedback.
 * Accepts a named Ionicon, token-based size and tone, and native Pressable props. */
export function IconButton({
  icon,
  size = 'medium',
  tone = 'text',
  appearance,
  color,
  ...props
}: IconButtonProps) {
  const { colors, iconSize } = useTheme(appearance);

  return (
    <Pressable
      {...props}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        pressed && styles.pressed,
        props.disabled && styles.disabled,
      ]}
    >
      <Ionicons name={icon} size={iconSize[size]} color={color ?? colors[tone]} />
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
  disabled: { opacity: opacity.disabled },
});
