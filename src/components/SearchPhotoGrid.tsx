import { useEffect, useState } from 'react';
import { PixelRatio, StyleSheet, View } from 'react-native';
import { Canvas, Group, Image, RoundedRect, useImage } from '@shopify/react-native-skia';
import {
  Easing,
  ReduceMotion,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import type { SearchPhoto } from '@/lib/search-photos';
import { tokens, useTheme } from '@/theme';

type PhotoBounds = { left: number; top: number; width: number; height: number };

/** Places the collection in two columns, or one large match above three columns, on physical pixels. */
export function searchPhotoBounds(width: number, count: number, ranked: boolean) {
  const round = PixelRatio.roundToNearestPixel;
  const gap = tokens.spacing.md;
  const columns = ranked ? 3 : 2;
  const size = (width - gap * (columns - 1)) / columns;
  const featuredHeight = round((width * 3) / 4);
  const frames: PhotoBounds[] = Array.from({ length: count }, (_, index) => {
    if (ranked && index === 0)
      return { left: 0, top: 0, width: round(width), height: featuredHeight };
    const position = ranked ? index - 1 : index;
    const left = (position % columns) * (size + gap);
    const top = (ranked ? featuredHeight + gap : 0) + Math.floor(position / columns) * (size + gap);
    return {
      left: round(left),
      top: round(top),
      width: round(left + size) - round(left),
      height: round(top + size) - round(top),
    };
  });
  return { frames, height: Math.max(0, ...frames.map((frame) => frame.top + frame.height)) };
}

function PhotoTile({
  photo,
  target,
  duration,
  index,
}: {
  photo: SearchPhoto;
  target: PhotoBounds;
  duration: number;
  index: number;
}) {
  const { colors } = useTheme();
  const image = useImage(photo.source);
  const bounds = useSharedValue(target);
  const opacity = useSharedValue(0);
  const { left, top, width, height } = target;
  useEffect(() => {
    bounds.set(
      withTiming(
        { left, top, width, height },
        {
          duration,
          easing: Easing.inOut(Easing.cubic),
          reduceMotion: ReduceMotion.System,
        }
      )
    );
  }, [bounds, left, top, width, height, duration]);
  useEffect(() => {
    if (!image) return;
    opacity.set(
      withTiming(1, {
        duration:
          tokens.motion.photoRevealDuration + index * tokens.motion.searchPhotoStaggerDuration,
        reduceMotion: ReduceMotion.System,
      })
    );
  }, [image, opacity, index]);
  const clip = useDerivedValue(() => ({
    rect: {
      x: bounds.get().left,
      y: bounds.get().top,
      width: bounds.get().width,
      height: bounds.get().height,
    },
    rx: tokens.radius.card,
    ry: tokens.radius.card,
  }));
  const x = useDerivedValue(() => bounds.get().left);
  const y = useDerivedValue(() => bounds.get().top);
  const imageWidth = useDerivedValue(() => bounds.get().width);
  const imageHeight = useDerivedValue(() => bounds.get().height);
  return (
    <Group clip={clip}>
      <RoundedRect rect={clip} color={colors.surface} />
      {image && (
        <Group opacity={opacity}>
          <Image image={image} fit="cover" x={x} y={y} width={imageWidth} height={imageHeight} />
        </Group>
      )}
    </Group>
  );
}

function MeasuredGrid({
  photos,
  width,
  ranked,
}: {
  photos: SearchPhoto[];
  width: number;
  ranked: boolean;
}) {
  const { frames } = searchPhotoBounds(width, photos.length, ranked);
  const [frontId, setFrontId] = useState(ranked ? photos[0]?.id : undefined);
  if (ranked && frontId !== photos[0]?.id) setFrontId(photos[0]?.id);
  const duration = ranked ? tokens.motion.searchReorderDuration : tokens.motion.searchResetDuration;
  // Keep the canvas and scroll extent stable; only texture geometry changes during a transition.
  const height = Math.max(
    searchPhotoBounds(width, photos.length, false).height,
    searchPhotoBounds(width, photos.length, true).height
  );
  const drawOrder = photos
    .map((photo, index) => ({ photo, index }))
    .sort((a, b) => Number(a.photo.id === frontId) - Number(b.photo.id === frontId));
  return (
    <View style={{ height }}>
      <Canvas style={StyleSheet.absoluteFill} accessible={false}>
        {drawOrder.map(({ photo, index }) => (
          <PhotoTile
            key={photo.id}
            photo={photo}
            target={frames[index]}
            duration={duration}
            index={index}
          />
        ))}
      </Canvas>
      {photos.map((photo, index) => (
        <View
          key={photo.id}
          style={[styles.accessibilityFrame, frames[index]]}
          pointerEvents="none"
          accessible
          accessibilityRole="image"
          accessibilityLabel={
            ranked && index === 0 ? `Closest match: ${photo.description}` : photo.description
          }
        />
      ))}
    </View>
  );
}

/** Keeps decoded Skia textures mounted, scaling and moving their crop rectangles entirely on the UI thread. */
export function SearchPhotoGrid({ photos, ranked }: { photos: SearchPhoto[]; ranked: boolean }) {
  const [width, setWidth] = useState(0);
  return (
    <View onLayout={({ nativeEvent: { layout } }) => setWidth(layout.width)}>
      {width > 0 && <MeasuredGrid photos={photos} width={width} ranked={ranked} />}
    </View>
  );
}

const styles = StyleSheet.create({
  accessibilityFrame: { position: 'absolute' },
});
