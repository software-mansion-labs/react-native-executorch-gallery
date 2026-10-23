import { useMemo } from 'react';
import { Platform, StyleSheet, useColorScheme } from 'react-native';

import { useAppearance } from '@/hooks/useAppearance';
import { useThemeColors } from '@/hooks/useThemeColors';

const palette = {
  light: {
    background: '#FAFAFA',
    surface: '#F0F0F2',
    border: '#E1E1E6',
    text: '#24252A',
    muted: '#686A73',
    accent: '#365B9B',
    onAccent: '#FFFFFF',
    danger: '#B3261E',
    scrim: 'rgba(0, 0, 0, 0.4)',
  },
  dark: {
    background: '#101114',
    surface: '#1B1C20',
    border: '#2B2C31',
    text: '#F2F2F3',
    muted: '#A3A4AD',
    accent: '#A7BDED',
    onAccent: '#162A49',
    danger: '#FFB4AB',
    scrim: 'rgba(0, 0, 0, 0.55)',
  },
};

/** Shared design tokens. Add visual values here rather than in individual components. */
export const tokens = {
  annotation: {
    text: '#FFFFFF',
    colors: [
      { stroke: '#2A47FF', fill: 'rgba(42, 71, 255, 0.55)' },
      { stroke: '#D946EF', fill: 'rgba(217, 70, 239, 0.55)' },
      { stroke: '#10B981', fill: 'rgba(16, 185, 129, 0.55)' },
      { stroke: '#F59E0B', fill: 'rgba(245, 158, 11, 0.55)' },
      { stroke: '#8B5CF6', fill: 'rgba(139, 92, 246, 0.55)' },
      { stroke: '#EA580C', fill: 'rgba(234, 88, 12, 0.55)' },
      { stroke: '#0284C7', fill: 'rgba(2, 132, 199, 0.55)' },
      { stroke: '#E11D48', fill: 'rgba(225, 29, 72, 0.55)' },
    ],
  },
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
    annotation: 4,
    card: 22,
    sheet: 28,
    pill: 999,
  },
  borderWidth: {
    hairline: StyleSheet.hairlineWidth,
  },
  fontFamily: Platform.select({ ios: 'System', default: 'sans-serif' }),
  typography: {
    settingsBody: {
      fontSize: 15,
      lineHeight: 22,
      fontWeight: '400' as const,
    },
    settingsSection: {
      fontSize: 13,
      lineHeight: 19,
      fontWeight: '400' as const,
    },
    heading: {
      fontSize: 20,
      lineHeight: 26,
      fontWeight: '500' as const,
    },
    hero: {
      fontSize: 30,
      lineHeight: 38,
      fontWeight: '400' as const,
      letterSpacing: -0.9,
    },
    title: {
      fontSize: 17,
      lineHeight: 26,
      fontWeight: '500' as const,
    },
    pageTitle: {
      fontSize: 18,
      lineHeight: 26,
      fontWeight: '500' as const,
    },
    discoveryTitle: {
      fontSize: 18,
      lineHeight: 28,
      fontWeight: '500' as const,
    },
    discoverySubtitle: {
      fontSize: 15,
      lineHeight: 24,
      fontWeight: '400' as const,
    },
    taskLabel: {
      fontSize: 18,
      lineHeight: 26,
      fontWeight: '400' as const,
    },
    body: {
      fontSize: 16,
      lineHeight: 24,
      fontWeight: '400' as const,
    },
    label: {
      fontSize: 15,
      lineHeight: 22,
      fontWeight: '400' as const,
    },
    secondary: {
      fontSize: 15,
      lineHeight: 22,
      fontWeight: '400' as const,
    },
    input: {
      fontSize: 18,
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
    homeHeaderHeight: 56,
    sheetMaxHeight: '85%' as const,
    contentMaxWidth: 560,
    homeMaxWidth: 420,
    homeCardMinHeight: 96,
    logoWidth: 56,
    logoHeight: 71,
    taskRowMinHeight: 64,
    photoMinHeight: 240,
    photoControlSize: 64,
    modelSetupWidth: 216,
    modelSetupHeight: 96,
    modelActionHeight: 52,
    modelProgressSize: 52,
    modelProgressStroke: 4,
    modelProgressCornerInset: 10,
  },
  motion: {
    themeTransitionDuration: 240,
    photoRevealDuration: 240,
    modelSetupTransitionDuration: 200,
    detectionFadeDuration: 280,
    modelMinimumLoadingDuration: 1200,
    modelLoadingFadeDuration: 320,
    modelProgressDuration: 240,
    modelSpinnerDuration: 2000,
    sheetOpenDuration: 260,
    sheetCloseDuration: 200,
    logoShineDuration: 1600,
    logoShineFirstDelay: 6000,
    logoShineInterval: 6000,
    cardRestScale: 1,
    cardPressedScale: 0.98,
    cardPressDuration: 100,
    cardReleaseSpring: {
      damping: 28,
      stiffness: 380,
      mass: 0.8,
      overshootClamping: true,
    },
  },
  heroWipe: {
    featherWidth: 32,
    transparentColor: 'transparent',
    start: { x: 0, y: 0 },
    end: { x: 1, y: 0 },
  },
  logoShine: {
    colors: [
      'rgba(255, 255, 255, 0)',
      'rgba(255, 255, 255, 0.38)',
      'rgba(255, 255, 255, 0)',
    ] as const,
    start: { x: 0, y: 0 },
    end: { x: 1, y: 0.3 },
    travelStart: -56,
    travelEnd: 56,
  },
  opacity: {
    hidden: 0,
    subtle: 0.75,
    pressed: 0.65,
    disabled: 0.4,
  },
};

export type Theme = typeof tokens & {
  colors: typeof palette.light;
  scheme: 'light' | 'dark';
};

/** Returns the central design tokens and palette for the current system appearance. */
export function useTheme(): Theme {
  const { preference } = useAppearance();
  const systemScheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const scheme = preference === 'system' ? systemScheme : preference;
  const colors = useThemeColors(palette[scheme], tokens.motion.themeTransitionDuration);

  return useMemo(() => ({ ...tokens, colors, scheme }), [colors, scheme]);
}
