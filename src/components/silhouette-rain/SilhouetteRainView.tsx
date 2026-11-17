import { BlurView } from 'expo-blur';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeIn, ReduceMotion } from 'react-native-reanimated';
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
      <View style={styles.stage}>
        {rain.hasClip && (
          <View style={styles.badge}>
            <BlurView
              style={StyleSheet.absoluteFill}
              tint="dark"
              intensity={tokens.camera.chromeBlurIntensity}
            />
            <AppText variant="caption" appearance="dark">
              {rain.collisions ? 'Rain follows your outline' : 'Rain passes through'} · Recorded
              video
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
            {rain.hasClip && (
              <PhotoActionButton
                iconName={rain.collisions ? 'umbrella' : 'umbrella-outline'}
                label={rain.collisions ? 'Turn collisions off' : 'Turn collisions on'}
                appearance={appearance}
                disabled={demo.loading}
                onPress={rain.toggleCollisions}
              />
            )}
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
            title="Make it rain"
            description="Try the demo video, or choose your own. Your silhouette becomes an umbrella."
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
  root: { flex: 1, gap: spacing.lg },
  stage: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
  badge: {
    borderRadius: radius.pill,
    overflow: 'hidden',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  buttons: { flexDirection: 'row', justifyContent: 'center', gap: spacing.md },
  controls: {
    minHeight: layout.photoControlSize + spacing.sm * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
