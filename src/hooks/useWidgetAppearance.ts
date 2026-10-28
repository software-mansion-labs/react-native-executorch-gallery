import { DEFAULT_WIDGET_APPEARANCE, type WidgetAppearance } from '@/lib/app-builder';
import { widgetPalette, isWidgetColorChoice, type WidgetAccent } from '@/lib/widget-colors';
import { tokens, useTheme } from '@/theme';

/** Resolves named colors and per-control accents; loading placeholders follow the app theme. */
export function useWidgetAppearance(chosen?: WidgetAppearance, role: WidgetAccent = 'primary') {
  const palette = isWidgetColorChoice(chosen) ? widgetPalette(chosen) : undefined;
  const appearance = palette?.scheme;
  const theme = useTheme(appearance);
  const settings = chosen ?? DEFAULT_WIDGET_APPEARANCE;
  const accentIndex = { primary: 0, secondary: 1, tertiary: 2 }[role];
  const colors = {
    ...theme.colors,
    background: palette?.background ?? theme.colors.surface,
    text: palette?.foreground ?? theme.colors.text,
    muted: palette?.secondary ?? theme.colors.muted,
    accent: palette?.accents[accentIndex] ?? theme.colors.accent,
    onAccent: palette?.onAccent ?? theme.colors.onAccent,
  };
  const fontFamily = tokens.fontFamily;
  return {
    colors,
    appearance,
    fontFamily,
    gradient: palette ? ([palette.background, palette.gradientEnd] as const) : undefined,
    text: {
      body: { ...tokens.typography.body, fontFamily, color: colors.text },
      secondary: { ...tokens.typography.secondary, fontFamily, color: colors.muted },
      number: { ...tokens.typography.heading, fontFamily, color: colors.text },
      title: {
        ...tokens.typography.heading,
        fontFamily,
        color: colors.accent,
        textAlign: settings.alignment,
      },
    },
    controlRadius: tokens.radius.pill,
    card: {
      backgroundColor: colors.background,
      borderRadius: tokens.radius.card,
      gap: tokens.spacing.md,
      padding: tokens.spacing.md,
    },
  };
}
