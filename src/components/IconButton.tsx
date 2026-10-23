import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { StyleSheet, Pressable, type PressableProps } from 'react-native';

import { tokens, useTheme } from '@/theme';

type IconButtonProps = PressableProps & {
  icon: ComponentProps<typeof Ionicons>['name'];
  accessibilityLabel: string;
};

/** A labeled icon action with a consistent touch target and pressed feedback.
 * Accepts a named Ionicon and native Pressable props. */
export function IconButton({ icon, ...props }: IconButtonProps) {
  const { colors, iconSize } = useTheme();

  return (
    <Pressable
      {...props}
      accessibilityRole="button"
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Ionicons name={icon} size={iconSize.medium} color={colors.text} />
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
