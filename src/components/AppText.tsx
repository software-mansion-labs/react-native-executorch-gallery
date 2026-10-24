import { StyleSheet, Text, type TextProps } from 'react-native';

import { tokens, useTheme, type Theme } from '@/theme';

type AppTextProps = TextProps & {
  variant?: keyof Theme['typography'];
  tone?: 'text' | 'muted' | 'accent';
};

/** Renders text using the shared font, typography variant, and semantic color.
 * Native Text props are forwarded, including accessibility and text scaling. */
export function AppText({ variant = 'body', tone = 'text', style, ...props }: AppTextProps) {
  const { colors, typography } = useTheme();

  return (
    <Text {...props} style={[styles.base, typography[variant], { color: colors[tone] }, style]} />
  );
}

const { fontFamily } = tokens;

const styles = StyleSheet.create({
  base: {
    fontFamily,
  },
});
