import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeIn, ReduceMotion } from 'react-native-reanimated';

import { AppText } from '@/components/AppText';
import { useCardPressAnimation } from '@/hooks/useCardPressAnimation';
import { tokens, useTheme } from '@/theme';

type StyleTransferResultProps = {
  available: boolean;
  showOriginal: boolean;
  latency: number | null;
  onPressInOriginal: () => void;
  onPressOutOriginal: () => void;
};

/** Keeps comparison and timing below the photo, reserving the row before results arrive. */
export function StyleTransferResult({
  available,
  showOriginal,
  latency,
  onPressInOriginal,
  onPressOutOriginal,
}: StyleTransferResultProps) {
  const { colors } = useTheme();
  const { animatedStyle, onPressIn, onPressOut } = useCardPressAnimation();
  return (
    <View style={styles.area}>
      {available && (
        <Animated.View style={styles.row} entering={entrance}>
          <AnimatedPressable
            onPressIn={() => {
              onPressIn();
              onPressInOriginal();
            }}
            onPressOut={() => {
              onPressOut();
              onPressOutOriginal();
            }}
            accessibilityRole="button"
            accessibilityLabel={showOriginal ? 'Showing original' : 'Hold to compare with original'}
            accessibilityActions={[
              { name: 'showOriginal', label: 'Show original' },
              { name: 'showStyled', label: 'Show styled photo' },
            ]}
            onAccessibilityAction={({ nativeEvent }) => {
              if (nativeEvent.actionName === 'showOriginal') onPressInOriginal();
              if (nativeEvent.actionName === 'showStyled') onPressOutOriginal();
            }}
            style={[styles.button, { backgroundColor: colors.surface }, animatedStyle]}
          >
            <AppText variant="secondary" numberOfLines={1} style={styles.label}>
              {showOriginal ? 'Showing original' : 'Hold to compare'}
            </AppText>
          </AnimatedPressable>
          <AppText variant="caption" tone="muted" numberOfLines={1} style={styles.latency}>
            {latency != null ? `${latency} ms` : ' '}
          </AppText>
        </Animated.View>
      )}
    </View>
  );
}

const { spacing, layout, radius } = tokens;
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const entrance = FadeIn.duration(tokens.motion.photoRevealDuration)
  .easing(Easing.out(Easing.cubic))
  .reduceMotion(ReduceMotion.System);
const styles = StyleSheet.create({
  area: { minHeight: layout.touchTarget, justifyContent: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxxl,
  },
  button: {
    minHeight: layout.touchTarget,
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  label: { flexShrink: 1 },
  latency: { position: 'absolute', right: 0, textAlign: 'right' },
});
