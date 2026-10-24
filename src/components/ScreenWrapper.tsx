import { StyleSheet } from 'react-native';
import type { PropsWithChildren } from 'react';
import { useIsFocused } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';

type ScreenWrapperProps = PropsWithChildren<{
  unmountOnBlur?: boolean;
  edgeToEdge?: boolean;
}>;

/** Provides safe-area layout and optionally unmounts task content on blur to release native models. */
export function ScreenWrapper({
  children,
  unmountOnBlur = false,
  edgeToEdge = false,
}: ScreenWrapperProps) {
  const { colors } = useTheme();
  const isFocused = useIsFocused();

  return (
    <SafeAreaView
      edges={edgeToEdge ? [] : undefined}
      style={[styles.screen, { backgroundColor: colors.background }]}
    >
      {!unmountOnBlur || isFocused ? children : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
});
