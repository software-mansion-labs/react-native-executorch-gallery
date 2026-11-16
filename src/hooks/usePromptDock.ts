import { useCallback, useEffect, useState } from 'react';
import { AccessibilityInfo, type LayoutChangeEvent } from 'react-native';

import { tokens } from '@/theme';

/** Measures the floating composer for scroll clearance and tracks the system's Reduce Transparency preference. */
export function usePromptDock(visible: boolean) {
  const [height, setHeight] = useState(0);
  const [reduceTransparency, setReduceTransparency] = useState(false);
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceTransparencyEnabled().then((enabled) => {
      if (mounted) setReduceTransparency(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener(
      'reduceTransparencyChanged',
      setReduceTransparency
    );
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);
  const onLayout = useCallback((event: LayoutChangeEvent) => {
    setHeight(event.nativeEvent.layout.height);
  }, []);
  return {
    onLayout,
    reduceTransparency,
    contentInset: { paddingBottom: visible ? height + tokens.spacing.lg : tokens.spacing.sm },
  };
}
