import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

import { AppText } from '@/components/AppText';
import { MediaPreviewActivity } from '@/components/media-stories/MediaPreviewActivity';
import { FRAME_COUNT, mediaTimestamp, type MediaItem } from '@/lib/media-stories/media';
import { tokens, useTheme } from '@/theme';

function ClipPreview({ item }: { item: MediaItem }) {
  const [paused, setPaused] = useState(false);
  const [firstFrame, setFirstFrame] = useState(false);
  const { colors, iconSize } = useTheme();
  const player = useVideoPlayer(item.uri, (instance) => {
    instance.muted = true;
    instance.loop = true;
  });
  useEffect(() => {
    if (item.phase === 'reading') {
      player.pause();
      player.seekBy((item.frameTime ?? 0) - player.currentTime);
    } else if (paused) player.pause();
    else player.play();
  }, [player, paused, item.phase, item.frameTime]);
  return (
    <>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        nativeControls={false}
        onFirstFrameRender={() => setFirstFrame(true)}
      />
      {!firstFrame && (
        <Image
          source={{ uri: item.preview }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          pointerEvents="none"
        />
      )}
      <Pressable
        style={styles.playback}
        accessibilityRole="button"
        accessibilityLabel={paused ? 'Play clip' : 'Pause clip'}
        onPress={() => setPaused((value) => !value)}
        disabled={item.phase === 'reading'}
      >
        {paused && (
          <View style={[styles.playIcon, { backgroundColor: colors.surface }]}>
            <Ionicons name="play" color={colors.text} size={iconSize.medium} />
          </View>
        )}
      </Pressable>
    </>
  );
}

function MediaCard({
  item,
  selected,
  index,
  width,
  step,
  scrollX,
  onSelect,
}: {
  item: MediaItem;
  selected: boolean;
  index: number;
  width: number;
  step: number;
  scrollX: SharedValue<number>;
  onSelect: () => void;
}) {
  const { colors } = useTheme();
  const animation = useAnimatedStyle(() => {
    const distance = Math.min(1, Math.abs(scrollX.get() / step - index));
    return {
      transform: [{ scale: 1 - distance * (1 - tokens.media.inactiveScale) }],
      opacity: 1 - distance * (1 - tokens.media.inactiveOpacity),
    };
  });
  const count = item.frameCount ?? (item.kind === 'video' ? FRAME_COUNT : 1);
  const framesRead = item.phase === 'done' ? count : (item.framesRead ?? 0);
  const working = item.phase === 'reading' || item.phase === 'describing';
  return (
    <Animated.View
      style={[
        styles.card,
        {
          width,
        },
        animation,
      ]}
    >
      <View
        style={[
          styles.preview,
          { height: width / tokens.media.cardAspectRatio, backgroundColor: colors.surface },
        ]}
      >
        {selected && item.kind === 'video' ? (
          <ClipPreview item={item} />
        ) : (
          <Image
            source={{ uri: item.preview }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={tokens.motion.modelSetupTransitionDuration}
          />
        )}
        {selected && working && (
          <MediaPreviewActivity width={width} height={width / tokens.media.cardAspectRatio} />
        )}
        {!selected && (
          <Pressable
            style={StyleSheet.absoluteFill}
            accessibilityRole="button"
            accessibilityLabel={`View ${item.name}`}
            onPress={onSelect}
          />
        )}
      </View>
      <View style={styles.caption}>
        <AppText variant="secondary" tone="muted">
          {item.kind === 'video' ? mediaTimestamp(item.duration) : 'Photo'}
          {item.phase === 'reading' ? ` · ${framesRead}/${count} frames` : ''}
          {item.latency !== undefined ? ` · ${(item.latency / 1000).toFixed(1)} s` : ''}
        </AppText>
      </View>
    </Animated.View>
  );
}

/** A snapping, centered collection that keeps neighboring clips visible and autoplays only the active clip. */
export function MediaCarousel({
  items,
  selectedId,
  onSelect,
}: {
  items: MediaItem[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const [viewport, setViewport] = useState(0);
  const list = useRef<FlatList<MediaItem>>(null);
  const dragging = useRef(false);
  const scrollX = useSharedValue(0);
  const width =
    items.length === 1 ? viewport - tokens.spacing.xl * 2 : viewport * tokens.media.cardWidthRatio;
  const step = width + tokens.spacing.md;
  const selectedIndex = Math.max(
    0,
    items.findIndex((item) => item.id === selectedId)
  );
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollX.set(event.contentOffset.x);
  });
  useEffect(() => {
    if (viewport && !dragging.current)
      list.current?.scrollToOffset({ offset: selectedIndex * step, animated: true });
  }, [viewport, selectedIndex, step]);
  return (
    <View onLayout={(event) => setViewport(event.nativeEvent.layout.width)} style={styles.carousel}>
      {viewport > 0 && (
        <Animated.FlatList
          ref={list}
          horizontal
          data={items}
          keyExtractor={(item) => item.id}
          extraData={selectedId}
          showsHorizontalScrollIndicator={false}
          snapToInterval={step}
          decelerationRate="fast"
          disableIntervalMomentum
          contentContainerStyle={{ paddingHorizontal: (viewport - width) / 2 }}
          style={{
            height: width / tokens.media.cardAspectRatio + captionHeight,
          }}
          ItemSeparatorComponent={Separator}
          onScroll={onScroll}
          scrollEventThrottle={16}
          onScrollBeginDrag={() => {
            dragging.current = true;
          }}
          onScrollEndDrag={(event) => {
            const offset =
              event.nativeEvent.targetContentOffset?.x ?? event.nativeEvent.contentOffset.x;
            const index = Math.max(0, Math.min(items.length - 1, Math.round(offset / step)));
            if (items[index].id !== selectedId) onSelect(items[index].id);
          }}
          onMomentumScrollEnd={(event) => {
            dragging.current = false;
            const index = Math.max(
              0,
              Math.min(items.length - 1, Math.round(event.nativeEvent.contentOffset.x / step))
            );
            if (items[index].id !== selectedId) onSelect(items[index].id);
          }}
          getItemLayout={(_, index) => ({ length: step, offset: index * step, index })}
          renderItem={({ item, index }) => (
            <MediaCard
              item={item}
              selected={item.id === selectedId}
              index={index}
              width={width}
              step={step}
              scrollX={scrollX}
              onSelect={() => onSelect(item.id)}
            />
          )}
        />
      )}
    </View>
  );
}
function Separator() {
  return <View style={styles.separator} />;
}
const { spacing, radius } = tokens;
const captionHeight = tokens.typography.secondary.lineHeight + spacing.md * 2;
const styles = StyleSheet.create({
  carousel: { marginHorizontal: -spacing.xl, flexGrow: 0 },
  separator: { width: spacing.md },
  card: {
    alignSelf: 'flex-start',
  },
  preview: { overflow: 'hidden', borderRadius: radius.card },
  caption: { paddingVertical: spacing.md },
  playback: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  playIcon: { padding: spacing.md, borderRadius: radius.pill },
});
