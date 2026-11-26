import { useMemo } from 'react';
import { Platform, StyleSheet, useColorScheme } from 'react-native';
import { interpolateColor } from 'react-native-reanimated';

import { useAppearance } from '@/hooks/useAppearance';
import { useThemeColors } from '@/hooks/useThemeColors';

// Gradient stops from assets/images/logo-hero.svg.
const logoGradient = ['#2A47FF', '#D0E2FF'] as const;
const gradientRange = [0, 1] as const;

function blendColor(from: string, to: string, strength: number) {
  return interpolateColor(strength, gradientRange, [from, to], 'RGB', { gamma: 1 });
}

/** Shades a point on the flame gradient toward navy for UI surfaces and strokes. */
function shadeLogoGradient(position: number, strength: number) {
  const color = blendColor(...logoGradient, position);
  return blendColor('#080E28', color, strength);
}

const palette = {
  light: {
    background: '#FAFAFA',
    surface: '#F0F0F2',
    promptSurface: '#F0F0F2',
    promptAccessory: '#E0E2EA',
    promptBorder: 'rgba(36, 37, 42, 0.10)',
    promptChip: '#E6EAF4',
    promptChipBorder: '#C8D0E1',
    promptDisabledAction: '#E0E0E4',
    border: '#E1E1E6',
    text: '#24252A',
    muted: '#686A73',
    accent: shadeLogoGradient(0.15, 0.62),
    readAlongHighlight: blendColor('#FAFAFA', logoGradient[0], 0.09),
    onAccent: '#FFFFFF',
    danger: '#B3261E',
    scrim: 'rgba(0, 0, 0, 0.4)',
  },
  dark: {
    background: '#101114',
    surface: '#1B1C20',
    promptSurface: '#28292E',
    promptAccessory: '#1B1C20',
    promptBorder: 'rgba(242, 242, 243, 0.12)',
    promptChip: blendColor('#28292E', logoGradient[1], 0.08),
    promptChipBorder: blendColor('#28292E', logoGradient[1], 0.18),
    promptDisabledAction: '#38393F',
    border: '#2B2C31',
    text: '#F2F2F3',
    muted: '#A3A4AD',
    accent: blendColor(...logoGradient, 0.82),
    readAlongHighlight: blendColor('#101114', logoGradient[0], 0.24),
    onAccent: '#162A49',
    danger: '#FFB4AB',
    scrim: 'rgba(0, 0, 0, 0.55)',
  },
};

const actionCharcoal = '#272628';
const actionPearl = '#E9EAF0';
const actionBlue = blendColor(...logoGradient, 0.24);
const lightActionFillBlue = blendColor(actionPearl, actionBlue, 0.32);
const lightActionRimBlue = blendColor(actionPearl, actionBlue, 0.49);
const darkActionFillBlue = blendColor(actionCharcoal, actionBlue, 0.37);
const darkActionRimBlue = blendColor(actionCharcoal, actionBlue, 0.52);

/** Shared design tokens. Add visual values here rather than in individual components. */
export const tokens = {
  actionSurface: {
    light: {
      fill: [lightActionFillBlue, blendColor(actionPearl, actionBlue, 0.08), actionPearl],
      rim: [lightActionRimBlue, blendColor(actionPearl, shadeLogoGradient(0.5, 0.4), 0.15)],
      foreground: '#26326D',
    },
    dark: {
      fill: [darkActionFillBlue, blendColor(actionCharcoal, actionBlue, 0.08), actionCharcoal],
      rim: [darkActionRimBlue, blendColor(actionCharcoal, logoGradient[1], 0.16)],
      foreground: '#F2F5FF',
    },
    fillStops: [0, 0.47, 1],
  } as const,
  activityAccent: {
    light: [lightActionRimBlue, lightActionFillBlue] satisfies [string, string],
    dark: [darkActionRimBlue, darkActionFillBlue] satisfies [string, string],
  },
  activityForeground: { light: '#000000', dark: '#FFFFFF' },
  progressTrack: {
    light: [blendColor(actionPearl, actionBlue, 0.14), actionPearl],
    dark: [blendColor(actionCharcoal, logoGradient[1], 0.14), actionCharcoal],
  },
  prompt: {
    blurIntensity: 45,
    fadeMaskColors: [
      'rgba(0, 0, 0, 0)',
      'rgba(0, 0, 0, 0.12)',
      'rgba(0, 0, 0, 0.5)',
      'rgba(0, 0, 0, 0.88)',
      '#000000',
    ] as const,
    fadeMaskLocations: [0, 0.2, 0.45, 0.7, 1] as const,
  },
  camera: { chromeBlurIntensity: 60 },
  rain: {
    drop: '#32FF72',
    distant: '#00983D',
    highlight: '#B5FFD0',
    backdropRgb: [5, 13, 9] as const,
    personOpacity: 0.26,
    silhouetteFeather: 3,
    dropScale: 1.8,
    splashWidth: 1.6,
    sprayWidth: 8,
    sprayBlur: 4,
    sprayOpacity: 0.38,
  },
  media: {
    cardWidthRatio: 0.7,
    cardAspectRatio: 4 / 3,
    inactiveScale: 0.98,
    inactiveOpacity: 0.75,
    previewSheenDuration: 2600,
    previewSheenWidthRatio: 0.55,
    previewSheenOpacity: 0.45,
    previewSheenAngle: -18,
  },
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
    thin: 1,
  },
  fontFamily: Platform.select({ ios: 'System', default: 'sans-serif' }),
  typography: {
    readAlong: {
      fontSize: 24,
      lineHeight: 36,
      fontWeight: '400' as const,
    },
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
    speechActivitySize: 104,
    speechLevelGain: 10,
    inpaintingBrushSize: 28,
    liveDetectionStatusWidth: 176,
    depthFocusRadius: 14,
    depthFocusStroke: 2,
    depthFocusAmount: 0.45,
    classificationResultsHeight: 104,
    modelSetupWidth: 216,
    modelSetupHeight: 96,
    modelActionHeight: 52,
    modelProgressSize: 52,
    modelProgressStroke: 4,
    modelProgressCornerInset: 6,
    modelProgressSides: 6,
    promptMaxLines: 3,
    compactPromptActionSize: 36,
    chatPhotoHeight: 180,
    chatScrollThreshold: 96,
    contextGaugeStroke: 2,
    contextMeterHeight: 4,
    promptSuggestionHeight: 32,
    compactControlHeight: 40,
    thinkingDotSize: 5,
    thinkingIndicatorSize: 18,
  },
  motion: {
    speechLevelDuration: 220,
    widgetExpandedScale: 1.04,
    themeTransitionDuration: 240,
    chatDisclosureDuration: 240,
    chatDisclosureFadeDuration: 180,
    generatingPulseDuration: 1200,
    generatingPulseOpacity: 0.5,
    activityPulseOpacity: 0.15,
    photoRevealDuration: 240,
    searchReorderDuration: 420,
    searchResetDuration: 560,
    searchPhotoStaggerDuration: 45,
    modelSetupTransitionDuration: 200,
    detectionFadeDuration: 280,
    modelMinimumLoadingDuration: 1200,
    modelLoadingFadeDuration: 320,
    depthFocusHoldDuration: 600,
    depthEffectFadeDuration: 480,
    modelProgressDuration: 240,
    modelSpinnerDuration: 2000,
    sheetOpenDuration: 260,
    sheetCloseDuration: 200,
    logoShineDuration: 1600,
    logoShineFirstDelay: 6000,
    logoShineInterval: 6000,
    circularButtonPressedScale: 0.94,
    circularButtonPressedOpacity: 0.8,
    circularButtonPressDuration: 80,
    circularButtonReleaseDuration: 160,
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

/** Returns shared design tokens and the active palette, optionally pinning a section's appearance. */
export function useTheme(appearance?: Theme['scheme']): Theme {
  const { preference } = useAppearance();
  const systemScheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const appScheme = preference === 'system' ? systemScheme : preference;
  const scheme = appearance ?? appScheme;
  const animatedColors = useThemeColors(palette[appScheme], tokens.motion.themeTransitionDuration);
  const colors = appearance ? palette[appearance] : animatedColors;

  return useMemo(() => ({ ...tokens, colors, scheme }), [colors, scheme]);
}
