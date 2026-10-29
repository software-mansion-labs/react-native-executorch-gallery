import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { useTheme } from '@/theme';

export interface MicActionButtonProps {
  /** Whether recording/capturing is currently active. */
  isRecording: boolean;
  /** Whether the action button is enabled and ready to be tapped. */
  enabled: boolean;
  /** Callback fired when the user taps the circular button. */
  onPress: () => void;
  /** Size in points for the button diameter (default: 68). */
  size?: number;
}

/**
 * Centered circular floating microphone action trigger for audio input screens.
 *
 * Smoothly morphs between recording (danger tint with square stop icon) and
 * ready state (accent tint with mic icon).
 *
 * @param props Recording state, availability flag, and press handler.
 * @returns Centered circular microphone button component.
 */
export function MicActionButton({
  isRecording,
  enabled,
  onPress,
  size = 68,
}: MicActionButtonProps) {
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
              : isRecording
                ? colors.danger
                : colors.accent,
          },
          { opacity: pressed ? 0.85 : !enabled ? 0.5 : 1 },
        ]}
      >
        <Icon
          name={isRecording ? 'stop' : 'mic'}
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
