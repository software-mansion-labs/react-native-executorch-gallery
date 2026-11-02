import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { AppText } from '@/components/AppText';
import { tokens, useTheme } from '@/theme';

/** Reflects actual FSMN speech events rather than animating a simulated microphone level. */
export function VoiceActivity({ speaking, listening }: { speaking: boolean; listening: boolean }) {
  const { colors, iconSize } = useTheme();
  const animation = useAnimatedStyle(() => ({
    transform: [
      { scale: withTiming(speaking ? 1 : 0.9, { duration: tokens.motion.photoRevealDuration }) },
    ],
    opacity: withTiming(speaking ? 1 : 0.5, { duration: tokens.motion.photoRevealDuration }),
  }));
  return (
    <View style={styles.root}>
      <Animated.View
        style={[
          styles.orb,
          { backgroundColor: speaking ? colors.accent : colors.surface },
          animation,
        ]}
      >
        <Ionicons
          name="mic-outline"
          size={iconSize.large}
          color={speaking ? colors.onAccent : colors.text}
        />
      </Animated.View>
      <AppText variant="hero" style={styles.label} accessibilityLiveRegion="polite">
        {!listening ? 'Session ended' : speaking ? 'Speech detected' : 'Listening…'}
      </AppText>
      <AppText variant="secondary" tone="muted">
        {!listening
          ? 'Tap the microphone to listen again'
          : speaking
            ? 'Your voice, recognized on device'
            : 'Speak to see the difference'}
      </AppText>
    </View>
  );
}
const { spacing, layout, radius } = tokens;
const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  orb: {
    width: layout.photoControlSize * 2,
    height: layout.photoControlSize * 2,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  label: { textAlign: 'center' },
});
