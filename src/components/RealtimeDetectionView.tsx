import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeIn, ReduceMotion } from 'react-native-reanimated';

import { AppText } from '@/components/AppText';
import { PhotoActionButton } from '@/components/PhotoActionButton';
import {
  RealtimeDetectionViewport,
  type RealtimeDetectionViewportProps,
} from '@/components/RealtimeDetectionViewport';
import { TaskHero } from '@/components/TaskHero';
import { TaskHeroStage } from '@/components/TaskHeroStage';
import { tokens } from '@/theme';

/** Presents the legacy camera viewport with the gallery's shared hero and circular controls. */
export function RealtimeDetectionView({
  ready,
  isActive,
  latency,
  setup,
  onToggle,
  ...viewport
}: RealtimeDetectionViewportProps & {
  ready: boolean;
  isActive: boolean;
  latency: number | null;
  setup: ReactNode;
  onToggle: () => Promise<void>;
}) {
  const showCamera = ready && !!viewport.device && viewport.hasPermission;
  return (
    <View style={styles.root}>
      <View style={styles.stage}>
        {showCamera && (
          <Animated.View style={styles.camera} entering={entrance}>
            <RealtimeDetectionViewport {...viewport} />
          </Animated.View>
        )}
        <View style={styles.result}>
          <AppText variant="secondary" style={styles.resultLabel} numberOfLines={1}>
            {isActive && latency !== null
              ? `${viewport.detections.length} ${viewport.detections.length === 1 ? 'object' : 'objects'} found`
              : ' '}
          </AppText>
          <AppText variant="caption" tone="muted" numberOfLines={1}>
            {isActive && latency !== null ? `${latency} ms` : ' '}
          </AppText>
        </View>
      </View>
      <View style={styles.controls}>
        {ready && (
          <Animated.View entering={entrance}>
            <PhotoActionButton
              iconName={isActive ? 'stop' : 'videocam-outline'}
              label={isActive ? 'Stop live detection' : 'Start live detection'}
              primary
              disabled={!viewport.device}
              onPress={() => void onToggle()}
            />
          </Animated.View>
        )}
      </View>
      {!showCamera && (
        <TaskHeroStage pointerEvents={ready ? 'none' : 'box-none'}>
          <TaskHero
            title="See what’s around you"
            description={
              ready && !viewport.device
                ? 'Live detection needs a device with a camera.'
                : 'Point your camera and discover the objects around you.'
            }
            setup={setup}
          />
        </TaskHeroStage>
      )}
    </View>
  );
}

const { spacing, layout } = tokens;
const entrance = FadeIn.duration(tokens.motion.photoRevealDuration)
  .easing(Easing.out(Easing.cubic))
  .reduceMotion(ReduceMotion.System);
const styles = StyleSheet.create({
  root: { flex: 1, gap: spacing.lg },
  stage: { flex: 1, gap: spacing.lg },
  camera: { flex: 1 },
  result: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  resultLabel: { flex: 1 },
  controls: {
    minHeight: layout.photoControlSize + spacing.sm * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
