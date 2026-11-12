import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';

import { ModelSetup } from '@/components/ModelSetup';
import type { ModelStatus } from '@/components/ModelSheet';
import { PhotoActionButton } from '@/components/PhotoActionButton';
import { TaskHero } from '@/components/TaskHero';
import { TaskHeroStage } from '@/components/TaskHeroStage';
import type { ModelControls } from '@/hooks/useModelControls';
import { tokens } from '@/theme';

/** Shared model preparation, hero anchor, and microphone control for live speech demos. */
export function MicrophoneStage({
  model,
  status,
  title,
  description,
  active,
  starting,
  finishing = false,
  hasResult,
  startLabel = 'Start recording',
  stopLabel = 'Stop recording',
  onToggle,
  children,
}: {
  model: ModelControls;
  status: ModelStatus;
  title: string;
  description: string;
  active: boolean;
  starting: boolean;
  finishing?: boolean;
  hasResult: boolean;
  startLabel?: string;
  stopLabel?: string;
  onToggle: () => Promise<void>;
  children: ReactNode;
}) {
  const ready = model.loaded && model.prepared && status.isReady && !model.deleting;
  return (
    <View style={styles.root}>
      <View style={styles.content}>
        {ready && (active || hasResult) && (
          <Animated.View entering={entrance} style={styles.content}>
            {children}
          </Animated.View>
        )}
      </View>
      {(!ready || (!active && !hasResult)) && (
        <TaskHeroStage>
          <TaskHero
            title={title}
            description={description}
            setup={!model.prepared ? <ModelSetup model={model} status={status} /> : undefined}
          />
        </TaskHeroStage>
      )}
      {ready && (
        <Animated.View entering={entrance} style={styles.controls}>
          <PhotoActionButton
            iconName={active ? 'stop' : 'mic-outline'}
            label={active ? stopLabel : startLabel}
            primary
            disabled={starting || finishing}
            loading={starting || finishing}
            onPress={() => {
              void onToggle();
            }}
          />
        </Animated.View>
      )}
    </View>
  );
}
const entrance = FadeIn.duration(tokens.motion.photoRevealDuration).reduceMotion(
  ReduceMotion.System
);
const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flex: 1 },
  controls: { alignItems: 'center', paddingTop: tokens.spacing.lg },
});
