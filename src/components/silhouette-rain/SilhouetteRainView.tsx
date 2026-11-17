import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeIn, ReduceMotion } from 'react-native-reanimated';
import { AppText } from '@/components/AppText';
import { ModelSetup } from '@/components/ModelSetup';
import { PhotoActionButton } from '@/components/PhotoActionButton';
import { TaskHero } from '@/components/TaskHero';
import { TaskHeroStage } from '@/components/TaskHeroStage';
import type { useDemoClip } from '@/hooks/silhouette-rain/useDemoClip';
import type { useSilhouetteRain } from '@/hooks/silhouette-rain/useSilhouetteRain';
import type { ModelControls } from '@/hooks/useModelControls';
import { EffectChoices, SegmenterChoices } from '@/components/silhouette-rain/EffectChoices';
import { segmenterLabel, type SegmenterId } from '@/lib/silhouette-rain/segmenter';
import { tokens, useTheme } from '@/theme';

/** Camera-style floating controls, with setup shown only before a clip is selected. */
export function SilhouetteRainView({
  rain,
  model,
  demo,
  onModelChange,
}: {
  rain: ReturnType<typeof useSilhouetteRain>;
  model: ModelControls;
  demo: ReturnType<typeof useDemoClip>;
  onModelChange: (id: SegmenterId) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const { colors, iconSize } = useTheme('dark');
  const ready = rain.status.isReady && model.prepared && !model.deleting;
  const appearance = rain.hasClip ? 'dark' : undefined;
  return (
    <View style={styles.root}>
      {!rain.hasClip && (
        <SegmenterChoices
          value={rain.modelId}
          onChange={(id) => {
            void rain.waitForIdle().then(() => onModelChange(id));
          }}
          disabled={rain.playing || demo.loading}
          appearance={appearance}
        />
      )}
      {rain.hasClip && (
        <View style={styles.diagnostics}>
          <BlurView
            style={StyleSheet.absoluteFill}
            tint="dark"
            intensity={tokens.camera.chromeBlurIntensity}
          />
          <Pressable
            style={styles.diagnosticHeading}
            accessibilityRole="button"
            accessibilityLabel={
              expanded ? 'Collapse diagnostics' : 'Expand diagnostics and model comparison'
            }
            onPress={() => setExpanded((value) => !value)}
          >
            <AppText variant="caption" appearance="dark" testID="rain-diagnostics">
              {rain.renderStats.fps} animation FPS ·{' '}
              {rain.playing ? rain.stats.updateHz.toFixed(1) : '0.0'} masks/s
            </AppText>
            <Ionicons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={iconSize.small}
              color={colors.text}
            />
          </Pressable>
          <AppText variant="caption" appearance="dark">
            Frame {Math.round(rain.stats.frameMs)} ms · Segment {Math.round(rain.stats.inferenceMs)}{' '}
            ms ·{' '}
            {rain.playing && rain.renderStats.fresh
              ? `Age ${rain.renderStats.maskAgeMs} ms`
              : 'Mask inactive'}
          </AppText>
          {expanded && (
            <View style={styles.details}>
              <AppText variant="caption" appearance="dark">
                {segmenterLabel(rain.modelId)} · Total {Math.round(rain.stats.totalMs)} ms
              </AppText>
              <AppText variant="caption" appearance="dark">
                Collider {Math.round(rain.stats.colliderMs)} ms · {rain.renderStats.contacts}{' '}
                impacts/s · Recorded video
              </AppText>
              <AppText variant="caption" appearance="dark">
                {rain.playing ? 'Pause to compare segmenters' : 'Select a segmenter, then load it'}
              </AppText>
              <SegmenterChoices
                value={rain.modelId}
                onChange={(id) => {
                  void rain.waitForIdle().then(() => onModelChange(id));
                }}
                disabled={rain.playing || demo.loading}
                appearance="dark"
              />
              <Pressable
                accessibilityRole="checkbox"
                accessibilityLabel="Show segmentation mask"
                accessibilityState={{ checked: rain.showMask }}
                onPress={rain.toggleMask}
                style={styles.diagnosticHeading}
              >
                <AppText variant="caption" appearance="dark">
                  Show mask
                </AppText>
                <Ionicons
                  name={rain.showMask ? 'checkbox' : 'square-outline'}
                  size={iconSize.small}
                  color={colors.text}
                />
              </Pressable>
            </View>
          )}
        </View>
      )}
      <View style={styles.stage} />
      {ready && (
        <EffectChoices value={rain.effect} onChange={rain.setEffect} appearance={appearance} />
      )}
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
              label={
                rain.hasClip ? (rain.playing ? 'Pause effects' : 'Play effects') : 'Try demo video'
              }
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
            title="Shape the elements"
            description="Try the demo video or choose your own. Turn your outline into rain, snow, embers or molten lava."
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
  diagnosticHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: layout.touchTarget,
    gap: spacing.sm,
  },
  details: { gap: spacing.sm, paddingTop: spacing.sm },
  diagnostics: {
    width: '100%',
    overflow: 'hidden',
    borderRadius: radius.card,
    padding: spacing.md,
  },
  stage: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
  buttons: { flexDirection: 'row', justifyContent: 'center', gap: spacing.md },
  controls: {
    minHeight: layout.photoControlSize + spacing.sm * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
