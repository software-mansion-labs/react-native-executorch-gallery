import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeOut, ReduceMotion } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { AppText } from '@/components/AppText';
import { CircularProgress } from '@/components/CircularProgress';
import type { ModelStatus } from '@/components/ModelSheet';
import { useCardPressAnimation } from '@/hooks/useCardPressAnimation';
import type { ModelControls } from '@/hooks/useModelControls';
import { useModelSetup } from '@/hooks/useModelSetup';
import { tokens, useTheme } from '@/theme';

type ModelSetupProps = {
  model: ModelControls;
  status: ModelStatus;
  disabled?: boolean;
};

/** A compact setup action with separate download progress and preparation status. */
export function ModelSetup({ model, status, disabled }: ModelSetupProps) {
  const { colors } = useTheme();
  const { animatedStyle, onPressIn, onPressOut } = useCardPressAnimation();
  const { preparing, loading, ready, onExit } = useModelSetup(model, status);
  const preparationExit = useMemo(
    () =>
      FadeOut.duration(tokens.motion.modelLoadingFadeDuration)
        .easing(Easing.out(Easing.cubic))
        .reduceMotion(ReduceMotion.System)
        .withCallback((finished) => {
          'worklet';
          if (finished) scheduleOnRN(onExit);
        }),
    [onExit]
  );
  const progress = Math.max(
    0,
    Math.min(100, Number.isFinite(status.downloadProgress) ? status.downloadProgress : 0)
  );

  if (ready) return <View style={styles.area} />;

  if (loading) {
    return (
      <View style={styles.area}>
        <Animated.View
          style={styles.progressArea}
          entering={loadingEntrance}
          exiting={preparationExit}
        >
          <CircularProgress progress={progress} indeterminate={preparing} />
          <AppText variant="discoverySubtitle" tone="muted" accessibilityLiveRegion="polite">
            {preparing ? 'Preparing model…' : `Downloading · ${Math.round(progress)}%`}
          </AppText>
        </Animated.View>
      </View>
    );
  }

  const blocked = disabled || model.deleting || model.storedBytes === undefined;
  return (
    <View style={styles.area}>
      <Animated.View exiting={buttonExit}>
        <AnimatedPressable
          onPress={model.load}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          disabled={blocked}
          accessibilityRole="button"
          accessibilityLabel={
            model.downloadSizeLabel
              ? `Download model, approximately ${model.downloadSizeLabel}`
              : model.loadLabel
          }
          accessibilityState={{ disabled: !!blocked }}
          style={[
            styles.action,
            { backgroundColor: colors.accent },
            blocked && styles.disabled,
            animatedStyle,
          ]}
        >
          <AppText variant="taskLabel" style={{ color: colors.onAccent }}>
            {model.storedBytes === null ? 'Download' : model.loadLabel}
          </AppText>
          {model.downloadSizeLabel && (
            <AppText variant="taskLabel" style={{ color: colors.onAccent }}>
              {model.downloadSizeLabel}
            </AppText>
          )}
        </AnimatedPressable>
      </Animated.View>
    </View>
  );
}

const { spacing, layout, radius, opacity } = tokens;
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const loadingEntrance = FadeIn.duration(tokens.motion.modelSetupTransitionDuration)
  .easing(Easing.out(Easing.cubic))
  .reduceMotion(ReduceMotion.System);
const buttonExit = FadeOut.duration(tokens.motion.modelSetupTransitionDuration)
  .easing(Easing.out(Easing.cubic))
  .reduceMotion(ReduceMotion.System);
const styles = StyleSheet.create({
  area: {
    width: layout.modelSetupWidth,
    maxWidth: '100%',
    minHeight: layout.modelSetupHeight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  action: {
    minHeight: layout.modelActionHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
  },
  progressArea: { alignItems: 'center', gap: spacing.sm },
  disabled: { opacity: opacity.disabled },
});
