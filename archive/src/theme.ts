import { useColorScheme } from 'react-native';

/**
 * Polished design tokens for ExecuTorch Gallery.
 * High-contrast, clean modern palette inspired by AI Edge / modern iOS design.
 */
const palette = {
  light: {
    bg: '#F8F9FF',
    surface: '#FFFFFF',
    surfaceSubtle: '#EEF0FF',
    surfaceAlt: '#E4E8FA',
    border: '#D8DEFA',
    borderSubtle: '#EEF0FF',
    text: '#001A72',
    textSecondary: '#33488E',
    textDim: '#6676AA',
    textMuted: '#919FCF',
    accent: '#2A47FF',
    onAccent: '#FFFFFF',
    accentSoft: '#EEF0FF',
    accentBorder: '#D0E2FF',
    danger: '#FF6259',
    dangerSoft: '#FAF2F2',
    success: '#57B495',
    successSoft: '#EFF6F0',
    warning: '#F59E0B',
    warningSoft: '#FAF5EF',
  },
  dark: {
    bg: '#0D1326',
    surface: '#151D38',
    surfaceSubtle: '#1C274A',
    surfaceAlt: '#23305B',
    border: '#2A3A6E',
    borderSubtle: '#1E2B52',
    text: '#EEF0FF',
    textSecondary: '#C1C6E5',
    textDim: '#919FCF',
    textMuted: '#6676AA',
    accent: '#4B6CF4',
    onAccent: '#FFFFFF',
    accentSoft: '#18244D',
    accentBorder: '#2E418A',
    danger: '#FF6259',
    dangerSoft: '#451A1A',
    success: '#3FC684',
    successSoft: '#0F3D2B',
    warning: '#FBBF24',
    warningSoft: '#3D2D0F',
  },
} as const;

/** Overlay background colors for cards and pills. */
export const overlay = {
  bg: 'rgba(10, 16, 32, 0.76)',
  bgStrong: 'rgba(10, 16, 32, 0.88)',
  border: 'rgba(255, 255, 255, 0.16)',
  borderStrong: 'rgba(255, 255, 255, 0.25)',
  textPrimary: '#FFFFFF',
  textSecondary: '#E2E8F0',
  textMuted: '#94A3B8',
  tint: '#4b6cf4',
  tintSoft: 'rgba(75, 108, 244, 0.25)',
  tintFaint: 'rgba(75, 108, 244, 0.08)',
} as const;
export const tints = {
  blue: '#4b6cf4',
  blueDark: '#7394ff',
  cyan: '#38acdd',
  cyanDark: '#6fcef5',
  green: '#57b495',
  greenDark: '#3fc684',
  red: '#ff6259',
  redDark: '#ff7774',
  orange: '#f97316',
  orangeDark: '#fb923c',
  purple: '#782aeb',
  purpleDark: '#b07eff',
  pink: '#ec4899',
  pinkDark: '#f472b6',
  neutral: '#0F172A',
  neutralDark: '#F8FAFC',
} as const;

/** Tinted background + text color pairs for PII entity categories. */
export const piiColors = [
  { bg: 'rgba(229, 72, 77, 0.16)', fg: '#E5484D' }, // red
  { bg: 'rgba(247, 107, 21, 0.16)', fg: '#F76B15' }, // orange
  { bg: 'rgba(245, 165, 36, 0.16)', fg: '#F5A524' }, // amber
  { bg: 'rgba(48, 164, 108, 0.16)', fg: '#30A46C' }, // green
  { bg: 'rgba(18, 165, 148, 0.16)', fg: '#12A594' }, // teal
  { bg: 'rgba(62, 99, 221, 0.16)', fg: '#3E63DD' }, // blue
  { bg: 'rgba(110, 86, 207, 0.16)', fg: '#6E56CF' }, // violet
  { bg: 'rgba(214, 64, 159, 0.16)', fg: '#D6409F' }, // pink
] as const;

/** Accent color for model-name capsules. */
export const modelTag = {
  light: {
    fg: '#4B6CF4',
    bg: 'rgba(75, 108, 244, 0.10)',
    border: 'rgba(75, 108, 244, 0.28)',
  },
  dark: {
    fg: '#7394FF',
    bg: 'rgba(115, 148, 255, 0.12)',
    border: 'rgba(115, 148, 255, 0.30)',
  },
} as const;

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 40,
} as const;

export const radius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 26,
  pill: 999,
} as const;

/** Uniform border width for surface cards, badges, rows, and overlay cards. */
export const borderWidth = 1;

export type ThemeColors = typeof palette.light;

export function useTheme() {
  const scheme: 'light' | 'dark' = useColorScheme() === 'dark' ? 'dark' : 'light';
  return { colors: palette[scheme], scheme, spacing, radius };
}
