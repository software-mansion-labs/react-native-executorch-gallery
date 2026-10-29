import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { borderWidth, radius, spacing, overlay } from '@/theme';

export interface StyleTransferOverlayProps {
  /** Whether the user is actively pressing the compare toggle to view the original. */
  showOriginal: boolean;
  /** Callback triggered when user presses down on the compare pill. */
  onPressInOriginal: () => void;
  /** Callback triggered when user releases the compare pill. */
  onPressOutOriginal: () => void;
}

/**
 * "Hold for original" comparison control for the style transfer viewport.
 *
 * The styled image itself is drawn by {@link PhotoPicker} inside the primary
 * canvas, so this overlay stays a plain view and adds no second Skia surface.
 *
 * @param props Compare state and press handlers.
 * @returns Floating comparison pill.
 */
export function StyleTransferOverlay({
  showOriginal,
  onPressInOriginal,
  onPressOutOriginal,
}: StyleTransferOverlayProps) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Pressable
        onPressIn={onPressInOriginal}
        onPressOut={onPressOutOriginal}
        style={styles.comparePill}
      >
        <Text style={styles.compareText}>
          {showOriginal ? 'Viewing original' : 'Hold for original'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  comparePill: {
    position: 'absolute',
    bottom: spacing.md,
    alignSelf: 'center',
    backgroundColor: overlay.bg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth,
    borderColor: overlay.border,
  },
  compareText: {
    color: overlay.textSecondary,
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
});
