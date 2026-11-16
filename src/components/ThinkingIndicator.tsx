import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useActivityPulse } from '@/hooks/useActivityPulse';
import { tokens, useTheme } from '@/theme';

/** A single neutral pulse while waiting for output, stationary when Reduce Motion is enabled. */
export const ThinkingIndicator = memo(function ThinkingIndicator({
  accessibilityLabel = 'Generating response',
}: {
  accessibilityLabel?: string;
}) {
  const { colors } = useTheme();
  const pulse = useActivityPulse();
  return (
    <View
      style={styles.row}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ busy: true }}
    >
      <Animated.View style={[styles.dot, { backgroundColor: colors.thinkingIndicator }, pulse]} />
    </View>
  );
});

const { layout, radius } = tokens;
const styles = StyleSheet.create({
  row: { justifyContent: 'center', alignSelf: 'flex-start', height: layout.thinkingIndicatorSize },
  dot: { width: layout.thinkingDotSize, height: layout.thinkingDotSize, borderRadius: radius.pill },
});
