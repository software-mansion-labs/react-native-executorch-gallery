import { Stack } from 'expo-router';

import { useTheme } from '@/theme';

/** Groups the task demos under their own stack without changing their public URLs. */
export default function ScreensLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}
    />
  );
}
