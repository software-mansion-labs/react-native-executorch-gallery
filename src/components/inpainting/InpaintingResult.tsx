import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';

import { AppText } from '@/components/AppText';
import { IconButton } from '@/components/IconButton';
import { useCardPressAnimation } from '@/hooks/useCardPressAnimation';
import { tokens, useTheme } from '@/theme';

/** Reserves a stable toolbar for painting guidance, undo, and original/result comparison. */
export function InpaintingResult({
  hasImage,
  hasStrokes,
  available,
  latency,
  busy,
  onUndo,
  onCompare,
}: {
  hasImage: boolean;
  hasStrokes: boolean;
  available: boolean;
  latency: number | null;
  busy: boolean;
  onUndo: () => void;
  onCompare: (original: boolean) => void;
}) {
  const { colors } = useTheme();
  const press = useCardPressAnimation();
  return (
    <View style={styles.area}>
      {hasImage && (
        <Animated.View
          key={available ? 'result' : 'paint'}
          style={styles.row}
          entering={FadeIn.duration(tokens.motion.photoRevealDuration).reduceMotion(
            ReduceMotion.System
          )}
        >
          {available ? (
            <AnimatedPressable
              accessibilityRole="button"
              accessibilityLabel="Hold to compare with original"
              accessibilityActions={[
                { name: 'showOriginal', label: 'Show original' },
                { name: 'showResult', label: 'Show retouched photo' },
              ]}
              onAccessibilityAction={({ nativeEvent }) =>
                onCompare(nativeEvent.actionName === 'showOriginal')
              }
              onPressIn={() => {
                press.onPressIn();
                onCompare(true);
              }}
              onPressOut={() => {
                press.onPressOut();
                onCompare(false);
              }}
              style={[styles.compare, { backgroundColor: colors.surface }, press.animatedStyle]}
            >
              <AppText variant="secondary" numberOfLines={1}>
                Hold to compare
              </AppText>
            </AnimatedPressable>
          ) : (
            <AppText variant="secondary" tone="muted" style={styles.hint}>
              Paint over what to remove
            </AppText>
          )}
          {available && (
            <AppText variant="caption" tone="muted">
              {latency} ms
            </AppText>
          )}
          <IconButton
            icon="refresh-outline"
            accessibilityLabel="Undo brush stroke"
            onPress={onUndo}
            disabled={busy || !hasStrokes}
            tone="muted"
          />
        </Animated.View>
      )}
    </View>
  );
}
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const { spacing, layout, radius } = tokens;
const styles = StyleSheet.create({
  area: { minHeight: layout.touchTarget, justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  hint: { flex: 1 },
  compare: {
    flexShrink: 1,
    marginRight: 'auto',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    minHeight: layout.touchTarget,
    justifyContent: 'center',
  },
});
