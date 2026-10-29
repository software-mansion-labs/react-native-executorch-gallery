import React, { ReactNode, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Canvas, Image as SkiaImage, useImage, type SkImage } from '@shopify/react-native-skia';
import type { ImageBuffer } from 'react-native-executorch/cv';

import { borderWidth, radius, spacing, useTheme } from '@/theme';
import { pickImage, skImageToBuffer } from '@/lib/image';
import { Icon, type IconName } from '@/components/Icon';

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
      {/* Dynamic Viewfinder Frame */}
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
            backgroundColor: colors.surfaceSubtle,
            borderColor: colors.border,
          },
        ]}
      >
        {image && viewW > 0 && viewH > 0 ? (
          <>
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
          </>
        ) : (
          <View style={styles.placeholderContainer}>
            <View
              style={[
                styles.iconCircle,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Icon name="camera" size={28} color={colors.accent} strokeWidth={2} />
            </View>
            <Text style={[styles.placeholderTitle, { color: colors.text }]}>No Image Selected</Text>
            <Text style={[styles.placeholderSub, { color: colors.textDim }]}>
              Take a photo or choose an image from your library
            </Text>
          </View>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.buttons}>
        <PickButton
          iconName="camera"
          label="Take Photo"
          variant="secondary"
          onPress={() => choose('camera')}
        />
        <PickButton
          iconName="photo"
          label="Photo Gallery"
          variant="secondary"
          onPress={() => choose('library')}
        />
      </View>
    </View>
  );
}

function PickButton({
  iconName,
  label,
  variant,
  onPress,
}: {
  iconName: IconName;
  label: string;
  variant: 'primary' | 'secondary';
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const isPrimary = variant === 'primary';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.pickButton,
        isPrimary
          ? {
              backgroundColor: colors.accentSoft,
              borderColor: colors.accentBorder,
              shadowColor: colors.accent,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 4,
              elevation: 1,
            }
          : {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
        {
          opacity: pressed ? 0.8 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}
    >
      <Icon
        name={iconName}
        size={17}
        color={isPrimary ? colors.accent : colors.textSecondary}
        strokeWidth={2.2}
      />
      <Text style={[styles.pickLabel, { color: isPrimary ? colors.accent : colors.text }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: spacing.md,
    minHeight: 0,
  },
  viewport: {
    flex: 1,
    borderRadius: radius.lg,
    borderWidth,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 220,
  },
  placeholderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.xs + 2,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  placeholderTitle: {
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  placeholderSub: {
    fontSize: 12,
    textAlign: 'center',
    maxWidth: 240,
    lineHeight: 16,
  },
  buttons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  pickButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs + 2,
    paddingVertical: spacing.sm + 1,
    borderRadius: radius.md,
    borderWidth,
  },
  pickLabel: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
});
