import { BlurView } from 'expo-blur';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeIn, ReduceMotion } from 'react-native-reanimated';
import { IconButton } from '@/components/IconButton';
import { AppText } from '@/components/AppText';
import { ModelSetup } from '@/components/ModelSetup';
import { PhotoActionButton } from '@/components/PhotoActionButton';
import { TaskHero } from '@/components/TaskHero';
import { TaskHeroStage } from '@/components/TaskHeroStage';
import type { useDemoClip } from '@/hooks/silhouette-rain/useDemoClip';
import type { useSilhouetteRain } from '@/hooks/silhouette-rain/useSilhouetteRain';
import type { ModelControls } from '@/hooks/useModelControls';
import { tokens } from '@/theme';

/** Camera-style floating controls, with setup shown only before a clip is selected. */
export function SilhouetteRainView({
  rain,
  model,
  demo,
}: {
  rain: ReturnType<typeof useSilhouetteRain>;
  model: ModelControls;
  demo: ReturnType<typeof useDemoClip>;
}) {
  const ready = rain.status.isReady && model.prepared && !model.deleting;
  const appearance = rain.hasClip ? 'dark' : undefined;
  return (
    <View style={styles.root}>
      <View style={styles.toolbar}>
        {rain.hasClip && (
          <IconButton
            icon={rain.effectEnabled ? 'rainy' : 'rainy-outline'}
            accessibilityLabel={rain.effectEnabled ? 'Turn rain off' : 'Turn rain on'}
            appearance={appearance}
            onPress={rain.toggleEffect}
          />
        )}
      </View>
      <View style={styles.stage}>
        {rain.hasClip && (
          <View style={styles.diagnostics}>
            <BlurView
              style={StyleSheet.absoluteFill}
              tint="dark"
              intensity={tokens.camera.chromeBlurIntensity}
              pointerEvents="none"
            />
            <AppText variant="caption" appearance="dark" testID="rain-diagnostics">
              {rain.effectEnabled
                ? `${rain.renderStats.fps} FPS · ${Math.round(rain.stats.inferenceMs)} ms`
                : 'Rain off'}
            </AppText>
          </View>
        )}
      </View>
      <View style={styles.controls}>
        {ready && (
          <Animated.View style={styles.buttons} entering={entrance}>
            <PhotoActionButton
              iconName="images-outline"
              label="Choose video"
              appearance={appearance}
              disabled={demo.loading}
              onPress={() => void rain.pickClip()}
            />
            <PhotoActionButton
              iconName={rain.playing ? 'pause' : 'play'}
              label={rain.hasClip ? (rain.playing ? 'Pause rain' : 'Play rain') : 'Try demo video'}
              appearance={appearance}
              primary
              disabled={demo.loading || (rain.hasClip && !rain.player)}
              loading={demo.loading}
              onPress={() => (rain.hasClip ? rain.togglePlayback() : void demo.load())}
            />
          </Animated.View>
        )}
      </View>
      {!rain.hasClip && (
        <TaskHeroStage pointerEvents={ready ? 'none' : 'box-none'}>
          <TaskHero
            title="A shelter in the rain"
            description="Try the demo video or choose your own. Watch raindrops splash and slide around your silhouette."
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
  toolbar: { flexDirection: 'row', justifyContent: 'flex-end', minHeight: layout.touchTarget },
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
