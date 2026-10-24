import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { KeyboardProvider } from 'react-native-keyboard-controller';

import { useTheme } from '@/theme';

export default function RootLayout() {
  const { colors, scheme } = useTheme();

  return (
    <KeyboardProvider>
      <Stack
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}
      />
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
    </KeyboardProvider>
  );
}
