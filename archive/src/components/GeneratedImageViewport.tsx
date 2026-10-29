import React, { useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
import { Canvas, Image as SkiaImage, type SkImage } from '@shopify/react-native-skia';

import { Icon } from '@/components/Icon';
import { borderWidth, radius, spacing, useTheme } from '@/theme';

export interface GeneratedImageViewportProps {
  /** The generated Skia image to display, or null when nothing has been generated yet. */
  image: SkImage | null;
}

/**
 * Viewport frame for a text-to-image result.
 *
 * Renders the same bordered, rounded container and placeholder layout used by
 * all other CV task screens (matching PhotoPicker). Shows the hardware-rendered
 * Skia image when generated, or an icon-badged placeholder prior to synthesis.
 * Tapping anywhere on the viewport dismisses the keyboard.
 *
 * @param props The generated Skia image, or null for the empty state.
 * @returns A pressable viewport card containing the image or placeholder.
 */
export function GeneratedImageViewport({ image }: GeneratedImageViewportProps) {
  const { colors } = useTheme();
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const { width: viewW, height: viewH } = viewportSize;

  return (
    <Pressable
      style={[
        styles.viewport,
        { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
      ]}
      onLayout={(e) => {
        const { width: w, height: h } = e.nativeEvent.layout;
        if (w > 0 && h > 0) {
          setViewportSize({ width: Math.round(w), height: Math.round(h) });
        }
      }}
      onPress={Keyboard.dismiss}
      accessible={false}
    >
      {image && viewW > 0 && viewH > 0 ? (
        <Canvas style={StyleSheet.absoluteFill}>
          <SkiaImage image={image} fit="contain" x={0} y={0} width={viewW} height={viewH} />
        </Canvas>
      ) : (
        <View style={styles.placeholderContainer}>
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Icon name="sparkle" size={28} color={colors.accent} strokeWidth={2} />
          </View>
          <Text style={[styles.placeholderTitle, { color: colors.text }]}>No Image Generated</Text>
          <Text style={[styles.placeholderSub, { color: colors.textDim }]}>
            Type a prompt and press send to synthesize an image on-device
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
});
