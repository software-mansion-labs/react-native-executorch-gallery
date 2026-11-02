import { useEffect } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeIn, ReduceMotion } from 'react-native-reanimated';

import { AppText } from '@/components/AppText';
import { CircularProgress } from '@/components/CircularProgress';
import { IconButton } from '@/components/IconButton';
import { ModelSetup } from '@/components/ModelSetup';
import type { ModelStatus } from '@/components/ModelSheet';
import { PromptInput } from '@/components/PromptInput';
import { SearchPhotoGrid } from '@/components/image-embeddings/SearchPhotoGrid';
import { TaskHero } from '@/components/TaskHero';
import { TaskHeroStage } from '@/components/TaskHeroStage';
import { useChatKeyboard } from '@/hooks/useChatKeyboard';
import { useKeyboardScroll } from '@/hooks/useKeyboardScroll';
import type { ModelControls } from '@/hooks/useModelControls';
import type { SearchPhoto, SearchResult } from '@/lib/image-embeddings/search-photos';
import { tokens, useTheme } from '@/theme';

const suggestions = [
  { label: 'Peaceful', prompt: 'Somewhere peaceful' },
  { label: 'Food', prompt: 'Something delicious to eat' },
  { label: 'City', prompt: 'Tall buildings in a busy city' },
];

/** A photo-first search collection: the closest image leads, with the remaining matches in a quiet grid. */
export function MultimodalSearchView({
  model,
  status,
  photos: collection,
  draft,
  onDraftChange,
  result,
  busy,
  onClear,
  onSearch,
}: {
  model: ModelControls;
  status: ModelStatus;
  photos: SearchPhoto[];
  draft: string;
  onDraftChange: (value: string) => void;
  result: SearchResult | null;
  busy: boolean;
  onClear: () => void;
  onSearch: () => Promise<void>;
}) {
  const { colors, iconSize } = useTheme();
  const { keyboardStyle, heroStyle } = useChatKeyboard();
  const ready = model.prepared && model.loaded && status.isReady;
  const photos = result?.photos ?? collection;
  const scroll = useKeyboardScroll();
  useEffect(() => {
    scroll.current?.scrollTo({ y: 0, animated: true });
  }, [result, scroll]);
  return (
    <Animated.View style={[styles.root, keyboardStyle]}>
      {ready && (
        <Animated.View entering={entrance} style={styles.collection}>
          <View style={styles.header}>
            <AppText variant="secondary" tone="muted" style={styles.heading} numberOfLines={1}>
              {busy
                ? 'Searching photos…'
                : result
                  ? `“${result.query}”`
                  : `${photos.length} photos to explore`}
            </AppText>
            {busy ? (
              <View style={styles.activity}>
                <CircularProgress
                  progress={100}
                  indeterminate
                  size={iconSize.medium}
                  color={colors.accent}
                  accessibilityLabel="Searching photos"
                />
              </View>
            ) : result ? (
              <IconButton
                icon="refresh-outline"
                accessibilityLabel="Show all photos"
                onPress={onClear}
              />
            ) : null}
          </View>
          <Animated.ScrollView
            ref={scroll}
            style={styles.scroll}
            contentContainerStyle={styles.grid}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            showsVerticalScrollIndicator={false}
          >
            <SearchPhotoGrid photos={photos} ranked={!!result} />
          </Animated.ScrollView>
          <PromptInput
            value={draft}
            onChangeText={onDraftChange}
            onSubmit={() => {
              Keyboard.dismiss();
              void onSearch();
            }}
            canSubmit={!!draft.trim() && !busy}
            disabled={busy}
            placeholder="Find a photo…"
            submitLabel="Search photos"
            suggestions={suggestions}
          />
        </Animated.View>
      )}
      {!ready && (
        <TaskHeroStage style={heroStyle} pointerEvents="box-none">
          <TaskHero
            title="Find more than a match"
            description="Search a collection of photos with words, right on your device."
            setup={<ModelSetup model={model} status={status} />}
          />
        </TaskHeroStage>
      )}
    </Animated.View>
  );
}
const { spacing, layout } = tokens;
const entrance = FadeIn.duration(tokens.motion.photoRevealDuration)
  .easing(Easing.out(Easing.cubic))
  .reduceMotion(ReduceMotion.System);
const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  collection: { flex: 1, gap: spacing.sm },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: layout.touchTarget,
  },
  heading: { flex: 1 },
  activity: {
    width: layout.touchTarget,
    height: layout.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { flex: 1, minHeight: 0 },
  grid: { paddingBottom: spacing.lg },
});
