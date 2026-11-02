import { useRef } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, ReduceMotion, type SharedValue } from 'react-native-reanimated';

import { AppText } from '@/components/AppText';
import { SpeechWaveform } from '@/components/speech-to-text/SpeechWaveform';
import { tokens } from '@/theme';

/** Unframed transcript with a single, compact microphone status above the recording control. */
export function Transcript({
  committed,
  partial,
  listening,
  level,
}: {
  committed: string;
  partial: string;
  listening: boolean;
  level: SharedValue<number>;
}) {
  const scroll = useRef<ScrollView>(null);
  const hasText = !!committed || !!partial;
  return (
    <View style={styles.root}>
      <ScrollView
        ref={scroll}
        contentContainerStyle={styles.page}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}
      >
        <AppText variant="readAlong" selectable={hasText}>
          {hasText ? (
            <>
              {committed}
              {committed && partial ? ' ' : ''}
              <AppText variant="readAlong" tone="muted">
                {partial}
              </AppText>
            </>
          ) : (
            <AppText variant="readAlong" tone="muted">
              Speak naturally
            </AppText>
          )}
        </AppText>
      </ScrollView>
      <View style={styles.feedback}>
        {listening && (
          <Animated.View entering={entrance} exiting={exit} style={styles.status}>
            <SpeechWaveform level={level} />
            <AppText variant="caption" tone="muted">
              Listening
            </AppText>
          </Animated.View>
        )}
      </View>
    </View>
  );
}
const { spacing, layout, motion } = tokens;
const entrance = FadeIn.duration(motion.photoRevealDuration).reduceMotion(ReduceMotion.System);
const exit = FadeOut.duration(motion.photoRevealDuration).reduceMotion(ReduceMotion.System);
const styles = StyleSheet.create({
  root: { flex: 1 },
  page: { paddingTop: spacing.xxxl, paddingBottom: spacing.xl },
  feedback: {
    minHeight: layout.speechWaveformHeight + tokens.typography.caption.lineHeight + spacing.md,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  status: { alignItems: 'center', gap: spacing.sm },
});
