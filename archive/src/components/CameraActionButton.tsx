import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { useTheme } from '@/theme';

export interface CameraActionButtonProps {
  /** Whether real-time camera streaming is actively running. */
  isActive: boolean;
  /** Whether the action button is enabled and ready to be tapped. */
  enabled: boolean;
  /** Callback fired when the user taps the circular button. */
  onPress: () => void;
  /** Size in points for the button diameter (default: 68). */
  size?: number;
}

/**
 * Centered circular floating action trigger for camera streaming task screens.
 *
 * Smoothly morphs between active stream (danger tint with square stop icon) and
 * idle ready state (accent tint with camera icon).
 *
 * @param props Streaming state, availability flag, and press handler.
 * @returns Centered circular camera stream toggle button.
 */
export function CameraActionButton({
  isActive,
  enabled,
  onPress,
  size = 68,
}: CameraActionButtonProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <Pressable
        onPress={onPress}
        disabled={!enabled}
        style={({ pressed }) => [
          styles.button,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: !enabled
              ? colors.surfaceSubtle
              : isActive
                ? colors.danger
                : colors.accent,
          },
          { opacity: pressed ? 0.85 : !enabled ? 0.5 : 1 },
        ]}
      >
        <Icon
          name={isActive ? 'stop' : 'videocam'}
          size={Math.round(size * 0.41)}
          color={!enabled ? colors.textMuted : colors.onAccent}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
});
