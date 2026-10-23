import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { KeyboardProvider } from 'react-native-keyboard-controller';

export default function RootLayout() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const bg = scheme === 'dark' ? '#0B0D12' : '#F6F7F9';
  const text = scheme === 'dark' ? '#F4F6FA' : '#0B0D12';

  return (
    <KeyboardProvider>
      <Stack
        screenOptions={{
          headerShadowVisible: false,
          headerStyle: { backgroundColor: bg },
          headerTintColor: text,
          contentStyle: { backgroundColor: bg },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
    </KeyboardProvider>
  );
}
