import { LinearGradient } from 'expo-linear-gradient';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useActivityPulse } from '@/hooks/useActivityPulse';
import { tokens, useTheme } from '@/theme';

/** A single pulse while waiting for output, stationary when Reduce Motion is enabled. */
export const ThinkingIndicator = memo(function ThinkingIndicator({
  accessibilityLabel = 'Generating response',
}: {
  accessibilityLabel?: string;
}) {
  const { scheme } = useTheme();
  const pulse = useActivityPulse();
  return (
    <View
      style={styles.row}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ busy: true }}
    >
      <Animated.View style={[styles.dot, pulse]}>
        <LinearGradient colors={tokens.activityAccent[scheme]} style={styles.gradient} />
      </Animated.View>
    </View>
  );
});

const { layout, radius } = tokens;
const styles = StyleSheet.create({
  row: { justifyContent: 'center', alignSelf: 'flex-start', height: layout.thinkingIndicatorSize },
  dot: { width: layout.thinkingDotSize, height: layout.thinkingDotSize, borderRadius: radius.pill },
  gradient: { ...StyleSheet.absoluteFill, borderRadius: radius.pill },
});
