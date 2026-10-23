import { type ComponentProps, type ReactNode, useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Canvas, Image as SkiaImage, useImage, type SkImage } from '@shopify/react-native-skia';
import type { ImageBuffer } from 'react-native-executorch/cv';
import Animated, { Easing, FadeIn, ReduceMotion } from 'react-native-reanimated';

import { tokens, useTheme } from '@/theme';
import { AppText } from '@/components/AppText';
import { pickImage, skImageToBuffer } from '@/lib/image';

export interface PickedImage {
  /** Local file URI of the captured or selected image. */
  uri: string;
  /** ExecuTorch C++ compatible raw image buffer (RGB/RGBA planar/interleaved). */
  buffer: ImageBuffer;
  /** Width of the photo in source pixels. */
  width: number;
  /** Height of the photo in source pixels. */
  height: number;
}

export interface ViewportTransform {
  /** Scale factor mapping source-image pixels to displayed canvas pixels. */
  scale: number;
  /** Horizontal letterboxing offset in points. */
  offsetX: number;
  /** Vertical letterboxing offset in points. */
  offsetY: number;
}

export interface PhotoPickerProps {
  /** Callback triggered when a photo is selected, captured, or cleared. */
  onPick: (image: PickedImage | null) => void;
  /** Optional render function for task-specific overlays (boxes, masks, landmarks). */
  renderOverlay?: (transform: ViewportTransform) => ReactNode;
  /** Optional Skia Image overlay to render directly on the photo canvas (e.g. segmentation mask). */
  overlayImage?: SkImage | null;
  /** Opacity for the overlay image (default: 0.65). */
  overlayOpacity?: number;
  /** Target width in pixels to downscale images (pass `null` to preserve full original resolution). */
  targetWidth?: number | null;
  /** Whether the model is currently processing inference over the photo. */
  busy?: boolean;
  /** Whether a photo may be chosen or captured; gate on model readiness. */
  canPick?: boolean;
  /** Run action displayed after the gallery and camera controls. */
  onRun?: () => void;
  canRun?: boolean;
  running?: boolean;
  result?: string;
  latency?: number | null;
  /** Setup action shown before a photo is selected. */
  setupAction?: ReactNode;
}

/**
 * Responsive photo canvas and camera HUD supporting hardware-rendered image previews.
 *
 * Provides camera capture, gallery selection, aspect-fit letterbox computation,
 * and automated coordinate transformation for task overlays.
 *
 * @param props Component properties including `onPick`, `renderOverlay`, and `busy`.
 * @returns Responsive image viewport and selection action buttons.
 */
export function PhotoPicker({
  onPick,
  renderOverlay,
  overlayImage,
  overlayOpacity = 0.65,
  targetWidth = 800,
  busy = false,
  canPick = true,
  onRun,
  canRun = false,
  running = false,
  result,
  latency,
  setupAction,
}: PhotoPickerProps) {
  const { colors } = useTheme();
  const [uri, setUri] = useState<string | null>(null);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const image = useImage(uri, () => onPick(null));

  const choose = async (source: 'library' | 'camera') => {
    const widthToUse = targetWidth === null ? undefined : targetWidth;
    const picked = await pickImage(source, widthToUse);
    if (!picked) return;
    onPick(null);
    setUri(picked);
  };

  useEffect(() => {
    if (!image || !uri) return;
    onPick({ uri, buffer: skImageToBuffer(image), width: image.width(), height: image.height() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [image, uri]);

  const { width: viewW, height: viewH } = viewportSize;
  const iw = image?.width() ?? 0;
  const ih = image?.height() ?? 0;

  let transform: ViewportTransform = { scale: 1, offsetX: 0, offsetY: 0 };
  if (image && iw > 0 && ih > 0 && viewW > 0 && viewH > 0) {
    const scale = Math.min(viewW / iw, viewH / ih);
    transform = {
      scale,
      offsetX: (viewW - iw * scale) / 2,
      offsetY: (viewH - ih * scale) / 2,
    };
  }

  return (
    <View style={styles.container}>
      <View style={styles.stage}>
        <View
          onLayout={(e) => {
            const { width: w, height: h } = e.nativeEvent.layout;
            if (w > 0 && h > 0) {
              setViewportSize({ width: Math.round(w), height: Math.round(h) });
            }
          }}
          style={[
            styles.viewport,
            {
              backgroundColor: image ? colors.surface : colors.background,
            },
          ]}
        >
          {image && viewW > 0 && viewH > 0 ? (
            <Animated.View key={uri} style={StyleSheet.absoluteFill} entering={photoEntrance}>
              <Canvas style={StyleSheet.absoluteFill}>
                <SkiaImage image={image} fit="contain" x={0} y={0} width={viewW} height={viewH} />
                {overlayImage && (
                  <SkiaImage
                    image={overlayImage}
                    fit="contain"
                    x={0}
                    y={0}
                    width={viewW}
                    height={viewH}
                    opacity={overlayOpacity}
                  />
                )}
              </Canvas>
              {renderOverlay?.(transform)}
            </Animated.View>
          ) : null}
        </View>

        <Animated.View
          key={result ?? 'empty'}
          style={styles.result}
          accessibilityLiveRegion="polite"
          entering={result != null ? resultEntrance : undefined}
        >
          <AppText variant="secondary" numberOfLines={1} style={styles.resultLabel}>
            {result ?? ' '}
          </AppText>
          <AppText variant="caption" tone="muted" numberOfLines={1}>
            {latency != null ? `${latency} ms` : ' '}
          </AppText>
        </Animated.View>
        {!image && (
          <View style={styles.placeholderContainer}>
            <View style={styles.placeholderCopy}>
              <AppText variant="hero" numberOfLines={1} adjustsFontSizeToFit>
                Find objects in a photo.
              </AppText>
              <AppText
                variant="discoverySubtitle"
                tone="muted"
                style={styles.placeholderDescription}
              >
                See what’s in your photo, with labels and boxes around each object.
              </AppText>
              <View style={styles.placeholderSetup}>{setupAction}</View>
            </View>
          </View>
        )}
      </View>
      <View style={styles.buttons}>
        <PickButton
          iconName="images-outline"
          label="Choose photo"
          disabled={busy || !canPick}
          onPress={() => choose('library')}
        />
        <PickButton
          iconName="camera-outline"
          label="Take photo"
          disabled={busy || !canPick}
          onPress={() => choose('camera')}
        />
        {onRun && (
          <PickButton
            iconName="scan-outline"
            label={running ? 'Running inference' : 'Run inference'}
            onPress={onRun}
            disabled={!canRun || busy}
            loading={running}
            primary
          />
        )}
      </View>
    </View>
  );
}

function PickButton({
  iconName,
  label,
  disabled,
  onPress,
  loading,
  primary,
}: {
  iconName: ComponentProps<typeof Ionicons>['name'];
  label: string;
  disabled: boolean;
  onPress: () => void;
  loading?: boolean;
  primary?: boolean;
}) {
  const { colors, iconSize } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, busy: !!loading }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.pickButton,
        { backgroundColor: primary ? colors.accent : colors.surface },
        pressed && styles.pressed,
        disabled && !loading && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.onAccent} />
      ) : (
        <Ionicons
          name={iconName}
          size={iconSize.large}
          color={primary ? colors.onAccent : colors.text}
        />
      )}
    </Pressable>
  );
}

const { spacing, radius, layout, opacity } = tokens;
const photoEntrance = FadeIn.duration(tokens.motion.photoRevealDuration)
  .easing(Easing.out(Easing.cubic))
  .reduceMotion(ReduceMotion.System);
const resultEntrance = FadeIn.duration(tokens.motion.detectionFadeDuration)
  .easing(Easing.out(Easing.cubic))
  .reduceMotion(ReduceMotion.System);
const styles = StyleSheet.create({
  container: { flex: 1, gap: spacing.lg, minHeight: 0 },
  stage: { flex: 1, gap: spacing.lg, minHeight: 0 },
  viewport: {
    flex: 1,
    borderRadius: radius.card,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: layout.photoMinHeight,
  },
  placeholderContainer: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.xl,
  },
  placeholderDescription: { textAlign: 'center', paddingHorizontal: spacing.xl },
  placeholderCopy: { width: '100%', alignItems: 'center', gap: spacing.xl },
  placeholderSetup: {
    position: 'absolute',
    top: '100%',
    width: '100%',
    alignItems: 'center',
    paddingTop: spacing.xl,
  },
  result: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  resultLabel: { flex: 1 },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  pickButton: {
    width: layout.photoControlSize,
    height: layout.photoControlSize,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  pressed: { opacity: opacity.pressed },
  disabled: { opacity: opacity.disabled },
});
