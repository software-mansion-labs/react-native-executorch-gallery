import { ScrollView, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { MicrophoneStage } from '@/components/audio/MicrophoneStage';
import { PhotoActionButton } from '@/components/PhotoActionButton';
import { TaskScreen } from '@/components/TaskScreen';
import { formatTime, speakerLabel, useMeetingSession } from '@/hooks/meeting/useMeetingSession';
import { tokens, useTheme } from '@/theme';

/** Shared presentation for speaker activity and speaker-labelled meeting text. */
export function MeetingTask({ transcribe }: { transcribe: boolean }) {
  const session = useMeetingSession(transcribe);
  const { colors } = useTheme();
  const { recorder, model, status, turns } = session;
  const busy = recorder.isRecording || recorder.starting || session.processing;
  return (
    <TaskScreen
      title={transcribe ? 'Meeting transcript' : 'Speaker diarization'}
      model={model}
      status={status}
      error={session.error}
      busy={busy}
      scrollable={false}
    >
      <AppText variant="secondary" tone="muted">
        Audio is processed on device and discarded. No audio files are saved. Everyone should know
        the microphone is active.
      </AppText>
      <MicrophoneStage
        model={model}
        status={status}
        title={transcribe ? 'Keep the words, skip the recording' : 'See who spoke when'}
        description={
          transcribe
            ? 'Local English transcription with up to four anonymous speaker labels. Updates arrive in roughly 10-second batches.'
            : 'Track up to four speakers locally. Speaker numbers belong to this session, not to known people.'
        }
        startLabel={transcribe ? 'Start transcription' : 'Start speaker detection'}
        stopLabel={transcribe ? 'Stop transcription' : 'Stop speaker detection'}
        active={recorder.isRecording}
        starting={recorder.starting}
        finishing={session.processing && !recorder.isRecording}
        hasResult={turns.length > 0}
        onToggle={session.toggle}
      >
        <ScrollView contentContainerStyle={styles.turns}>
          <AppText variant="secondary" tone="muted" accessibilityLiveRegion="polite">
            {session.processing
              ? 'Processing on device…'
              : recorder.isRecording
                ? 'Listening…'
                : 'Session stopped'}
          </AppText>
          {turns.map((turn, i) => (
            <View key={i} style={[styles.turn, { backgroundColor: colors.surface }]}>
              <AppText variant="secondary" tone="accent">
                {formatTime(turn.start)}–{formatTime(turn.end)} ·{' '}
                {speakerLabel(turn.speakers, turn.overlap)}
              </AppText>
              {transcribe && <AppText selectable>{turn.text}</AppText>}
            </View>
          ))}
          <AppText variant="secondary" tone="muted">
            Speaker labels and words can be wrong. Overlapping voices share one transcript; short or
            uncertain turns may be missed. Sentences can split between batches.
          </AppText>
        </ScrollView>
      </MicrophoneStage>
      {!!turns.length && (
        <View style={styles.actions}>
          {transcribe && (
            <PhotoActionButton
              iconName="copy-outline"
              label={session.copied ? 'Transcript copied' : 'Copy transcript'}
              disabled={busy}
              onPress={() => void session.copy()}
              size="small"
            />
          )}
          <PhotoActionButton
            iconName="trash-outline"
            label="Clear session"
            disabled={false}
            onPress={session.clear}
            size="small"
          />
          <AppText variant="secondary" tone="muted">
            {session.copied
              ? 'Copied to clipboard'
              : 'Only text can leave this session when you copy it.'}
          </AppText>
        </View>
      )}
    </TaskScreen>
  );
}
const styles = StyleSheet.create({
  turns: { gap: tokens.spacing.md, paddingVertical: tokens.spacing.lg },
  turn: { gap: tokens.spacing.sm, padding: tokens.spacing.lg, borderRadius: tokens.radius.card },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.md,
    paddingTop: tokens.spacing.md,
    flexWrap: 'wrap',
  },
});
