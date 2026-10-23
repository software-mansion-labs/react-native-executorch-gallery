import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AppearanceProvider } from '@/providers/AppearanceProvider';
import { useTheme } from '@/theme';

function RootNavigation() {
  const { colors, scheme } = useTheme();

  return (
    <>
      <Stack
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}
      />
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
    </>
  );
}

export default function RootLayout() {
  return (
    <AppearanceProvider>
      <RootNavigation />
    </AppearanceProvider>
  );
}
