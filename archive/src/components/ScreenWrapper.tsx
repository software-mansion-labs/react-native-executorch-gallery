import { useIsFocused } from 'expo-router';
import { PropsWithChildren } from 'react';

/**
 * Wraps a screen to ensure that it completely unmounts when navigating away
 * or returning to the main menu. This immediately frees all underlying native
 * ExecuTorch model instances, JSI handles, and memory allocations.
 */
export function ScreenWrapper({ children }: PropsWithChildren) {
  const isFocused = useIsFocused();
  return isFocused ? <>{children}</> : null;
}
export default ScreenWrapper;
