import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';

import { AppText } from '@/components/AppText';
import { MediaCarousel } from '@/components/media-stories/MediaCarousel';
import { ModelSetup } from '@/components/ModelSetup';
import type { ModelStatus } from '@/components/ModelSheet';
import { PhotoActionButton } from '@/components/PhotoActionButton';
import { TaskHero } from '@/components/TaskHero';
import { TaskHeroStage } from '@/components/TaskHeroStage';
import { ThinkingIndicator } from '@/components/ThinkingIndicator';
import { useCardPressAnimation } from '@/hooks/useCardPressAnimation';
import type { MediaCollection } from '@/hooks/media-stories/useMediaCollection';
import type { ModelControls } from '@/hooks/useModelControls';
import { mediaStorySections } from '@/lib/media-stories/media';
import { tokens, useTheme } from '@/theme';

function SampleClipButton({ disabled, onPress }: { disabled: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  const press = useCardPressAnimation();
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel="Try sample clip"
      disabled={disabled}
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      style={[styles.sampleButton, { backgroundColor: colors.surface }, press.animatedStyle]}
    >
      <AppText variant="secondary" numberOfLines={1} style={styles.sampleLabel}>
        Try example
      </AppText>
    </AnimatedPressable>
  );
}

/** Uses the gallery's plain surfaces, result typography, and circular task actions around the media carousel. */
export function MediaStoriesView({
  model,
  status,
  collection,
}: {
  model: ModelControls;
  status: ModelStatus;
  collection: MediaCollection;
}) {
  const { colors } = useTheme();
  const { items, selected, busy, picking } = collection;
  const ready = model.loaded && model.prepared && status.isReady;
  const completed = items.filter((item) => item.phase === 'done').length;
  const active = items.find((item) => item.phase === 'reading' || item.phase === 'describing');
  const pending = items.some((item) => item.phase !== 'done');
  const story = mediaStorySections(selected?.description ?? '');
  return (
    <View style={styles.root}>
      {(!selected || !ready) && (
        <TaskHeroStage>
          <TaskHero
            title="A story in every frame"
            description="Choose a clip or try the example. See its story unfold, right on your device."
            setup={<ModelSetup model={model} status={status} />}
          />
        </TaskHeroStage>
      )}
      {ready && selected && (
        <Animated.View entering={entrance} style={styles.workspace}>
          <View style={styles.status}>
            <AppText variant="secondary" tone="muted">
              {active?.phase === 'reading'
                ? 'Reading frames…'
                : busy
                  ? 'Describing…'
                  : completed === items.length
                    ? items.length === 1
                      ? 'Clip analyzed'
                      : 'Collection analyzed'
                    : 'Ready to analyze'}
            </AppText>
            {items.length > 1 && (
              <AppText variant="secondary" tone="muted" style={styles.count}>
                {completed} / {items.length}
              </AppText>
            )}
          </View>
          <MediaCarousel items={items} selectedId={selected.id} onSelect={collection.select} />
          <View
            style={[
              styles.result,
              {
                backgroundColor:
                  story.summary || selected.error || active?.id === selected.id
                    ? colors.surface
                    : colors.background,
              },
            ]}
          >
            <ScrollView
              key={selected.id}
              style={styles.resultScroll}
              contentContainerStyle={styles.resultContent}
              showsVerticalScrollIndicator={false}
            >
              <Animated.View entering={entrance} style={styles.story}>
                {story.summary ? (
                  <AppText variant="body">{story.summary}</AppText>
                ) : selected.error ? (
                  <AppText variant="body" style={{ color: colors.danger }}>
                    {selected.error}
                  </AppText>
                ) : null}
                {story.moments.length > 0 && (
                  <View style={styles.moments}>
                    <AppText variant="secondary" tone="muted">
                      Moments
                    </AppText>
                    {story.moments.map((moment, index) => (
                      <Animated.View key={index} entering={entrance} style={styles.moment}>
                        <AppText variant="caption" tone="muted" style={styles.timestamp}>
                          {moment.time}
                        </AppText>
                        <AppText variant="secondary" style={styles.observation}>
                          {moment.text}
                        </AppText>
                      </Animated.View>
                    ))}
                  </View>
                )}
              </Animated.View>
            </ScrollView>
            {active?.id === selected.id && (
              <View style={styles.activity}>
                <View style={styles.activityDots}>
                  <ThinkingIndicator accessibilityLabel="Analyzing media" />
                </View>
              </View>
            )}
          </View>
        </Animated.View>
      )}
      {(!selected || !ready) && <View style={styles.spacer} pointerEvents="none" />}
      {ready && (
        <Animated.View entering={entrance} style={styles.dock}>
          {!selected && <SampleClipButton disabled={picking} onPress={collection.samples} />}
          <View style={styles.controls}>
            <PhotoActionButton
              iconName="images-outline"
              label="Choose photos and videos"
              disabled={busy || picking}
              loading={picking}
              onPress={() => {
                void collection.choose();
              }}
            />
            <PhotoActionButton
              iconName={busy ? 'stop' : 'arrow-up'}
              label={busy ? 'Stop analyzing' : 'Analyze collection'}
              primary
              disabled={!busy && (!selected || !pending || picking)}
              onPress={() => {
                if (busy) collection.stop();
                else void collection.run();
              }}
            />
          </View>
        </Animated.View>
      )}
    </View>
  );
}
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const { spacing, radius, layout, motion } = tokens;
const entrance = FadeIn.duration(motion.photoRevealDuration).reduceMotion(ReduceMotion.System);
const styles = StyleSheet.create({
  root: { flex: 1 },
  workspace: { flex: 1, gap: spacing.lg },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  count: { fontVariant: ['tabular-nums'] },
  result: { flex: 1, borderRadius: radius.card, overflow: 'hidden' },
  resultScroll: { flex: 1 },
  activity: {
    minHeight: tokens.typography.body.lineHeight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  activityDots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  resultContent: { padding: spacing.xl },
  story: { gap: spacing.xl },
  moments: { gap: spacing.lg },
  moment: { flexDirection: 'row', gap: spacing.md, alignItems: 'baseline' },
  timestamp: { fontVariant: ['tabular-nums'], minWidth: layout.touchTarget },
  observation: { flex: 1 },
  dock: { alignItems: 'center', gap: spacing.lg, paddingTop: spacing.lg },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  sampleButton: {
    flexShrink: 1,
    minHeight: layout.touchTarget,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  sampleLabel: { flexShrink: 1 },
  spacer: { flex: 1 },
});
