import { useState } from 'react';
import { FSMN_VAD_SAMPLE_RATE_HZ, models, useVoiceActivityDetector } from 'react-native-executorch';

import { MicActionButton } from '@/components/MicActionButton';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { TaskScreen } from '@/components/TaskScreen';
import { VadViewport } from '@/components/VadViewport';

import { useAudioRecorder } from '@/hooks/useAudioRecorder';

import { deleteCachedFiles } from '@/lib/deleteCachedFiles';

const MODEL = models.voiceActivityDetection.FSMN_VAD.DEFAULT;

function VoiceActivityDetectionTask() {
  const [loaded, setLoaded] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const vad = useVoiceActivityDetector(MODEL, { preventLoad: !loaded });
  const recorder = useAudioRecorder();

  const toggleStreaming = async () => {
    if (recorder.isRecording) {
      await recorder.stopRecording();
      vad.resetStream?.();
      setIsSpeaking(false);
      return;
    }

    if (!vad.isReady || !vad.detectVoiceOnStream || !vad.resetStream) return;

    setError(null);
    setIsSpeaking(false);
    vad.resetStream();

    try {
      await recorder.startRecording(
        FSMN_VAD_SAMPLE_RATE_HZ,
        (samples) => {
          const event = vad.detectVoiceOnStream!(samples, { detectionMargin: 300 });
          if (event === 'speechStart') {
            setIsSpeaking(true);
          } else if (event === 'speechEnd') {
            setIsSpeaking(false);
          }
        },
        1600
      );
    } catch (err: any) {
      setError(err?.message ?? String(err));
      await recorder.stopRecording();
      vad.resetStream?.();
      setIsSpeaking(false);
    }
  };

  return (
    <TaskScreen
      title="Voice Activity Detection"
      subtitle="FSMN-VAD · Real-time"
      status={{
        ...vad,
        error: error || (vad.error ? vad.error.message : null),
      }}
      onLoadModel={!loaded ? () => setLoaded(true) : undefined}
      busy={recorder.isRecording}
      onRun={() => undefined}
      canRun={false}
      onDeleteModel={async () => {
        await recorder.stopRecording();
        vad.resetStream?.();
        setIsSpeaking(false);
        await deleteCachedFiles(vad.resource);
        setLoaded(false);
      }}
      footer={
        <MicActionButton
          isRecording={recorder.isRecording}
          enabled={vad.isReady}
          onPress={toggleStreaming}
        />
      }
    >
      <VadViewport isStreaming={recorder.isRecording} isSpeaking={isSpeaking} />
    </TaskScreen>
  );
}

export default function VoiceActivityDetectionScreen() {
  return (
    <ScreenWrapper>
      <VoiceActivityDetectionTask />
    </ScreenWrapper>
  );
}
