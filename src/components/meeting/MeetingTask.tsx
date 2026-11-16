import { ModelSetup } from '@/components/ModelSetup';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { MicrophoneStage } from '@/components/audio/MicrophoneStage';
import { PhotoActionButton } from '@/components/PhotoActionButton';
import { TaskScreen } from '@/components/TaskScreen';
import { MeetingTranscript } from './MeetingTranscript';
import { useMeetingSession } from '@/hooks/meeting/useMeetingSession';
import { tokens } from '@/theme';

/** Private meeting transcription using Gallery's shared microphone and model controls. */
export function MeetingTask() {
  const session = useMeetingSession();
  const { recorder, model, status, turns } = session;
  const busy =
    recorder.isRecording || recorder.starting || session.processing || session.localModel.importing;
  return (
    <TaskScreen
      title="Meeting transcript"
      model={model}
      status={status}
      error={session.error}
      busy={busy}
      scrollable={false}
    >
      <MicrophoneStage
        model={model}
        status={status}
        setup={
          session.localModel.missing !== 0 ? (
            <ModelSetup
              model={model}
              status={status}
              disabled={session.localModel.importing || session.localModel.missing === undefined}
              label={session.localModel.importing ? 'Importing…' : 'Import models'}
              onPress={() => void session.localModel.importModels()}
            />
          ) : undefined
        }
        title="Keep the conversation"
        description={
          session.localModel.missing
            ? `Import the meeting models to begin (${session.localModel.missing} files remaining).`
            : session.supportsMicrophone
              ? 'Record a conversation or choose a recording up to five minutes. Words and speaker labels stay on your device.'
              : 'Choose a recording up to five minutes. Words and speaker labels stay on your device.'
        }
        startLabel={session.supportsMicrophone ? 'Start transcription' : 'Choose recording'}
        startIcon={session.supportsMicrophone ? 'mic-outline' : 'document-outline'}
        stopLabel="Stop transcription"
        active={recorder.isRecording}
        starting={recorder.starting}
        finishing={session.processing && !recorder.isRecording}
        hasResult={turns.length > 0}
        onToggle={session.toggle}
      >
        <MeetingTranscript
          turns={turns}
          listening={recorder.isRecording}
          processing={session.processing}
        />
      </MicrophoneStage>
      <View style={styles.footer}>
        {session.supportsMicrophone &&
          model.prepared &&
          status.isReady &&
          !recorder.isRecording && (
            <PhotoActionButton
              iconName="document-outline"
              label="Choose recording"
              disabled={busy}
              onPress={() => void session.importRecording()}
              size="small"
            />
          )}
        {(!!turns.length || session.processing) && (
          <View style={styles.actions}>
            <PhotoActionButton
              iconName={session.copied ? 'checkmark' : 'copy-outline'}
              label={session.copied ? 'Transcript copied' : 'Copy transcript'}
              disabled={busy}
              onPress={() => void session.copy()}
              size="small"
            />
            <PhotoActionButton
              iconName="trash-outline"
              label={session.processing ? 'Cancel transcription' : 'Clear session'}
              disabled={false}
              onPress={session.clear}
              size="small"
            />
          </View>
        )}
        <AppText variant="caption" tone="muted" style={styles.note}>
          {session.copied
            ? 'Text copied to clipboard'
            : recorder.isRecording || turns.length
              ? session.recordingName
                ? `${session.recordingName} · Processed locally`
                : 'No audio saved · Labels and words may be imperfect'
              : session.supportsMicrophone
                ? 'No audio saved · Let everyone know before starting'
                : 'Recordings stay local'}
        </AppText>
      </View>
    </TaskScreen>
  );
}
const styles = StyleSheet.create({
  footer: { alignItems: 'center', gap: tokens.spacing.md, paddingTop: tokens.spacing.lg },
  actions: { flexDirection: 'row', gap: tokens.spacing.md },
  note: { textAlign: 'center' },
});
