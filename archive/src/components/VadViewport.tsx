import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AudioMeterBars } from '@/components/AudioMeterBars';
import { borderWidth, radius, spacing, useTheme } from '@/theme';

export interface VadViewportProps {
  /** Whether the VAD audio capture stream is currently active. */
  isStreaming: boolean;
  /** Whether speech is currently detected by the model. */
  isSpeaking: boolean;
}

/**
 * Voice activity detection viewport displaying an elevated capsule card with
 * a header and a centered animated audio level meter.
 *
 * @param props Streaming state and speaking detection state.
 * @returns Centered VAD speech presence capsule.
 */
export function VadViewport({ isStreaming, isSpeaking }: VadViewportProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.capsule,
          {
            backgroundColor: colors.surface,
            borderColor: isSpeaking ? colors.accent : colors.border,
          },
        ]}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>
            {!isStreaming
              ? 'Voice Activity Detector'
              : isSpeaking
                ? 'Speech Detected'
                : 'Listening…'}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textDim }]}>
            {!isStreaming
              ? 'Press mic below to start VAD stream'
              : isSpeaking
                ? 'Active speech detected by model'
                : 'Silence'}
          </Text>
        </View>

        <View style={styles.meterContainer}>
          <AudioMeterBars
            active={isSpeaking}
            isListening={isStreaming}
            accentColor={colors.accent}
            idleColor={colors.border}
            barWidth={5}
            maxBarHeight={48}
            gap={6}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  capsule: {
    width: '100%',
    maxWidth: 340,
    borderRadius: radius.xl,
    borderWidth,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  header: {
    alignItems: 'center',
    gap: spacing.xxs,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  meterContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
  },
});
