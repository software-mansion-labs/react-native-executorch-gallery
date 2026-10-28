import { Platform } from 'react-native';

/** Widget-specific geometry and the debug viewer's native monospace font. */
export const widgetAppearance = {
  fonts: { mono: Platform.select({ ios: 'Menlo', default: 'monospace' }) },
};
export const widgetLayout = { gridColumn: '40%' as const };
