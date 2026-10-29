import type { ReactNode } from 'react';
import { BlurView } from 'expo-blur';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeIn, ReduceMotion } from 'react-native-reanimated';

import { AppText } from '@/components/AppText';
import { PhotoActionButton } from '@/components/PhotoActionButton';
import { TaskHero } from '@/components/TaskHero';
import { TaskHeroStage } from '@/components/TaskHeroStage';
import { tokens } from '@/theme';

/** Floating detection status and controls over the full-screen camera, with the shared setup hero. */
export function RealtimeDetectionView({
  ready,
  isActive,
  latency,
  setup,
  onToggle,
  showCamera,
  hasCamera,
  detectionCount,
}: {
  ready: boolean;
  showCamera: boolean;
  hasCamera: boolean;
  detectionCount: number;
  isActive: boolean;
  latency: number | null;
  setup: ReactNode;
  onToggle: () => Promise<void>;
}) {
  const appearance = showCamera ? 'dark' : undefined;
  return (
    <View style={styles.root}>
      <View style={styles.stage}>
        {isActive && latency !== null && (
          <View style={styles.result}>
            <BlurView
              style={StyleSheet.absoluteFill}
              tint="dark"
              intensity={tokens.camera.chromeBlurIntensity}
              pointerEvents="none"
            />
            <AppText
              variant="secondary"
              appearance={appearance}
              numberOfLines={1}
              style={styles.number}
            >
              {detectionCount} {detectionCount === 1 ? 'object' : 'objects'} found
            </AppText>
            <AppText
              variant="caption"
              tone="muted"
              appearance={appearance}
              numberOfLines={1}
              style={styles.number}
            >
              {latency} ms
            </AppText>
          </View>
        )}
      </View>
      <View style={styles.controls}>
        {ready && (
          <Animated.View entering={entrance}>
            <PhotoActionButton
              iconName={isActive ? 'stop' : 'videocam-outline'}
              label={isActive ? 'Stop live detection' : 'Start live detection'}
              primary
              appearance={appearance}
              disabled={!hasCamera}
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
              ready && !hasCamera
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

const { spacing, layout, radius } = tokens;
const entrance = FadeIn.duration(tokens.motion.photoRevealDuration)
  .easing(Easing.out(Easing.cubic))
  .reduceMotion(ReduceMotion.System);
const styles = StyleSheet.create({
  root: { flex: 1, gap: spacing.lg },
  stage: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
  result: {
    width: layout.liveDetectionStatusWidth,
    alignItems: 'center',
    borderRadius: radius.pill,
    overflow: 'hidden',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  number: { fontVariant: ['tabular-nums'] },
  controls: {
    minHeight: layout.photoControlSize + spacing.sm * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
