import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AudioMeterBars } from '@/components/AudioMeterBars';
import { radius, spacing, useTheme } from '@/theme';

export interface SpeechTranscriptionViewportProps {
  /** Whether microphone streaming is currently active. */
  isRecording: boolean;
  /** Finalized committed text transcript. */
  committedText: string;
  /** Live in-progress non-committed speech chunk. */
  nonCommittedText: string;
}

/**
 * Minimalist speech-to-text transcript card with animated audio meter.
 *
 * @param props Recording state and transcription texts.
 * @returns Clean scrolling transcript viewport with animated meter.
 */
export function SpeechTranscriptionViewport({
  isRecording,
  committedText,
  nonCommittedText,
}: SpeechTranscriptionViewportProps) {
  const { colors } = useTheme();
  const hasText = !!committedText || !!nonCommittedText;

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.transcriptCard,
          {
            backgroundColor: colors.surface,
            borderColor: isRecording ? colors.accent : colors.border,
          },
        ]}
      >
        {/* Animated Audio Meter Bar */}
        <AudioMeterBars
          active={isRecording}
          accentColor={colors.accent}
          idleColor={colors.border}
        />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {hasText ? (
            <Text style={[styles.text, { color: colors.text }]}>
              {committedText}
              {nonCommittedText ? (
                <Text style={[styles.liveText, { color: colors.textSecondary }]}>
                  {committedText ? ' ' : ''}
                  {nonCommittedText}
                </Text>
              ) : null}
            </Text>
          ) : (
            <Text style={[styles.placeholder, { color: colors.textMuted }]}>
              Press mic to record
            </Text>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  transcriptCard: {
    flex: 1,
    width: '100%',
    maxWidth: 360,
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.md,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  text: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '300',
  },
  liveText: {
    fontStyle: 'italic',
    fontWeight: '300',
  },
  placeholder: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400',
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});
