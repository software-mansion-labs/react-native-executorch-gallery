import { FSMN_VAD_SAMPLE_RATE_HZ, models, useVoiceActivityDetector } from 'react-native-executorch';
import { MicrophoneStage } from '@/components/audio/MicrophoneStage';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { TaskScreen } from '@/components/TaskScreen';
import { VoiceActivity } from '@/components/voice-activity-detection/VoiceActivity';
import { useAudioRecorder } from '@/hooks/audio/useAudioRecorder';
import { useModelControls } from '@/hooks/useModelControls';
import { useTaskState } from '@/hooks/useTaskState';

const MODEL = models.voiceActivityDetection.FSMN_VAD.DEFAULT;

function VoiceActivityDetectionTask() {
  const model = useModelControls(MODEL.modelPath, { name: 'FSMN-VAD' });
  const [speaking, setSpeaking] = useTaskState(false, model.revision);
  const [hasResult, setHasResult] = useTaskState(false, model.revision);
  const [error, setError] = useTaskState<string | null>(null, model.revision);

  const vad = useVoiceActivityDetector(MODEL, { preventLoad: !model.loaded });
  const recorder = useAudioRecorder(() => {
    vad.resetStream?.();
    setSpeaking(false);
  }, setError);

  const toggleRecording = async () => {
    if (recorder.isRecording) {
      await recorder.stopRecording();
      return;
    }
    if (!model.prepared || !vad.isReady || !vad.detectVoiceOnStream || recorder.starting) return;
    setError(null);
    setSpeaking(false);
    vad.resetStream?.();
    try {
      await recorder.startRecording(
        FSMN_VAD_SAMPLE_RATE_HZ,
        (samples) => {
          const event = vad.detectVoiceOnStream!(samples, { detectionMargin: 300 });
          if (event === 'speechStart') setSpeaking(true);
          else if (event === 'speechEnd') setSpeaking(false);
        },
        1600
      );
      setHasResult(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  };

  return (
    <TaskScreen
      title="Voice activity detection"
      model={model}
      status={vad}
      error={error}
      busy={recorder.isRecording || recorder.starting}
      scrollable={false}
    >
      <MicrophoneStage
        model={model}
        status={vad}
        title="Know when speech begins"
        description="Detect speech and silence as you talk, right on your device."
        active={recorder.isRecording}
        starting={recorder.starting}
        hasResult={hasResult}
        onToggle={toggleRecording}
      >
        <VoiceActivity speaking={speaking} listening={recorder.isRecording} />
      </MicrophoneStage>
    </TaskScreen>
  );
}
export default function VoiceActivityDetectionScreen() {
  return (
    <ScreenWrapper unmountOnBlur>
      <VoiceActivityDetectionTask />
    </ScreenWrapper>
  );
}
