import { BlurView } from 'expo-blur';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeIn, ReduceMotion } from 'react-native-reanimated';
import { AppText } from '@/components/AppText';
import { ModelSetup } from '@/components/ModelSetup';
import { PhotoActionButton } from '@/components/PhotoActionButton';
import { TaskHero } from '@/components/TaskHero';
import { TaskHeroStage } from '@/components/TaskHeroStage';
import type { useSilhouetteRain } from '@/hooks/silhouette-rain/useSilhouetteRain';
import type { ModelControls } from '@/hooks/useModelControls';
import { tokens } from '@/theme';

/** Camera-style floating controls, with setup shown until the camera starts. */
export function SilhouetteRainView({
  rain,
  model,
}: {
  rain: ReturnType<typeof useSilhouetteRain>;
  model: ModelControls;
}) {
  const ready = rain.ready && model.prepared && !model.deleting;
  const appearance = rain.showCamera ? 'dark' : undefined;
  return (
    <View style={styles.root}>
      <View style={styles.stage}>
        {rain.showCamera && rain.isActive && (
          <View style={styles.diagnostics}>
            <BlurView
              style={StyleSheet.absoluteFill}
              tint="dark"
              intensity={tokens.camera.chromeBlurIntensity}
              pointerEvents="none"
            />
            <AppText variant="caption" appearance="dark" testID="rain-diagnostics">
              {rain.latency.toFixed(1)} ms
            </AppText>
          </View>
        )}
      </View>
      <View style={styles.controls}>
        {ready && (
          <Animated.View style={styles.buttons} entering={entrance}>
            <PhotoActionButton
              iconName={rain.isActive ? 'rainy' : 'rainy-outline'}
              label={rain.isActive ? 'Turn rain off' : 'Turn rain on'}
              appearance={appearance}
              primary
              disabled={!rain.device || model.deleting}
              onPress={() => void rain.toggleRain()}
            />
          </Animated.View>
        )}
      </View>
      {!rain.showCamera && (
        <TaskHeroStage pointerEvents={ready ? 'none' : 'box-none'}>
          <TaskHero
            title="A shelter in the rain"
            description={
              rain.device
                ? 'Start the camera and watch rain splash against your silhouette.'
                : 'This demo needs a device with a camera.'
            }
            setup={<ModelSetup model={model} status={rain.status} />}
          />
        </TaskHeroStage>
      )}
    </View>
  );
}
const { spacing, layout, radius } = tokens;
const entrance = FadeIn.duration(tokens.motion.photoRevealDuration)
  .easing(Easing.out(Easing.cubic))
  .reduceMotion(ReduceMotion.System);
const styles = StyleSheet.create({
  root: { flex: 1, gap: spacing.md },
  diagnostics: {
    alignItems: 'center',
    overflow: 'hidden',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  stage: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
  buttons: { flexDirection: 'row', justifyContent: 'center', gap: spacing.md },
  controls: {
    minHeight: layout.photoControlSize + spacing.sm * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
