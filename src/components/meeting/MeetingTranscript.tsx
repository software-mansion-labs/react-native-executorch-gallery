import { useRef } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { formatTime, speakerLabel } from '@/hooks/meeting/useMeetingSession';
import type { TranscriptTurn } from '@/lib/diarization/meeting';
import { tokens } from '@/theme';

/** Unframed speaker turns with a compact status, matching the speech transcript screen. */
export function MeetingTranscript({
  turns,
  listening,
  processing,
}: {
  turns: TranscriptTurn[];
  listening: boolean;
  processing: boolean;
}) {
  const scroll = useRef<ScrollView>(null);
  return (
    <View style={styles.root}>
      <ScrollView
        ref={scroll}
        contentContainerStyle={styles.page}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}
      >
        {!turns.length && (
          <AppText variant="readAlong" tone="muted">
            The conversation starts here
          </AppText>
        )}
        {turns.map((turn, index) => (
          <View key={index} style={styles.turn}>
            <View style={styles.heading}>
              <AppText variant="secondary" tone="accent" style={styles.speaker}>
                {speakerLabel(turn.speakers, turn.overlap)}
              </AppText>
              <AppText variant="caption" tone="muted">
                {formatTime(turn.start)}
              </AppText>
            </View>
            <AppText variant="title" selectable>
              {turn.text}
            </AppText>
          </View>
        ))}
      </ScrollView>
      <AppText
        variant="caption"
        tone="muted"
        accessibilityLiveRegion="polite"
        style={styles.status}
      >
        {processing
          ? 'Transcribing on device…'
          : listening
            ? 'Listening · Updates about every 10 seconds'
            : 'Session complete'}
      </AppText>
    </View>
  );
}
const { spacing } = tokens;
const styles = StyleSheet.create({
  root: { flex: 1 },
  page: { paddingTop: spacing.xl, paddingBottom: spacing.xl, gap: spacing.xl },
  turn: { gap: spacing.sm },
  heading: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.md },
  speaker: { flex: 1 },
  status: { textAlign: 'center', paddingTop: spacing.md },
});
