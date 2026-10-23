import { useMemo } from 'react';
import { Platform, StyleSheet, useColorScheme } from 'react-native';

/** Gradient endpoints taken directly from assets/images/logo-hero.svg. */
export const brand = {
  blue: '#2A47FF',
  paleBlue: '#D0E2FF',
};

const palette = {
  light: {
    background: '#FAFAFA',
    surface: '#F0F0F2',
    border: '#E1E1E6',
    text: '#24252A',
    muted: '#686A73',
    accent: brand.blue,
  },
  dark: {
    background: '#101114',
    surface: '#1B1C20',
    border: '#2B2C31',
    text: '#F2F2F3',
    muted: '#A3A4AD',
    accent: brand.paleBlue,
  },
};

/** Shared design tokens. Add visual values here rather than in individual components. */
export const tokens = {
  spacing: {
    none: 0,
    xxs: 2,
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
    xxxl: 48,
  },
  radius: {
    card: 22,
    pill: 999,
  },
  borderWidth: {
    hairline: StyleSheet.hairlineWidth,
  },
  fontFamily: Platform.select({ ios: 'System', default: 'sans-serif' }),
  typography: {
    hero: {
      fontSize: 31,
      lineHeight: 39,
      fontWeight: '400' as const,
      letterSpacing: -0.9,
    },
    title: {
      fontSize: 16,
      lineHeight: 24,
      fontWeight: '500' as const,
    },
    body: {
      fontSize: 16,
      lineHeight: 24,
      fontWeight: '400' as const,
    },
    label: {
      fontSize: 14,
      lineHeight: 21,
      fontWeight: '400' as const,
    },
    input: {
      fontSize: 14,
      fontWeight: '400' as const,
    },
    caption: {
      fontSize: 12,
      lineHeight: 18,
      fontWeight: '400' as const,
    },
  },
  iconSize: {
    small: 18,
    medium: 22,
    large: 26,
  },
  layout: {
    touchTarget: 48,
    headerHeight: 64,
    contentMaxWidth: 560,
    homeMaxWidth: 420,
    logoWidth: 46,
    logoHeight: 59,
    taskRowMinHeight: 56,
  },
  motion: {
    logoShineDuration: 1600,
    logoShineFirstDelay: 4500,
    logoShineInterval: 12000,
    logoShineJitter: 5000,
  },
  logoShine: {
    colors: [
      'rgba(255, 255, 255, 0)',
      'rgba(255, 255, 255, 0.38)',
      'rgba(255, 255, 255, 0)',
    ] as const,
    start: { x: 0, y: 0 },
    end: { x: 1, y: 0.3 },
    travelStart: -46,
    travelEnd: 46,
  },
  opacity: {
    pressed: 0.65,
  },
};

export type Theme = typeof tokens & {
  colors: typeof palette.light;
  scheme: 'light' | 'dark';
};

/** Returns the central design tokens and palette for the current system appearance. */
export function useTheme(): Theme {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';

  return useMemo(() => ({ ...tokens, colors: palette[scheme], scheme }), [scheme]);
}
