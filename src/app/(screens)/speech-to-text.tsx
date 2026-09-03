import { useState } from 'react';
import { models, useSpeechToText, WHISPER_SAMPLE_RATE_HZ } from 'react-native-executorch';

import { MicActionButton } from '@/components/MicActionButton';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { SpeechTranscriptionViewport } from '@/components/SpeechTranscriptionViewport';
import { TaskScreen } from '@/components/TaskScreen';

import { useAudioRecorder } from '@/hooks/useAudioRecorder';

import { deleteCachedFiles } from '@/lib/deleteCachedFiles';

const MODEL = models.speechToText.WHISPER.EN.TINY.DEFAULT;

function SpeechToTextTask() {
  const [loaded, setLoaded] = useState(false);
  const [committedText, setCommittedText] = useState('');
  const [nonCommittedText, setNonCommittedText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const recorder = useAudioRecorder();
  const stt = useSpeechToText(MODEL, { preventLoad: !loaded });

  const toggleRecording = async () => {
    if (recorder.isRecording) {
      await recorder.stopRecording();
      stt.streamStop?.();
      return;
    }

    if (!stt.isReady || !stt.stream || !stt.streamInsert) return;

    setError(null);
    setCommittedText('');
    setNonCommittedText('');

    try {
      (async () => {
        try {
          const textStream = stt.stream!({ language: 'en' });
          for await (const result of textStream) {
            setCommittedText(result.committed);
            setNonCommittedText(result.nonCommitted);
          }
        } catch (err: any) {
          setError(err?.message ?? String(err));
        }
      })();

      await recorder.startRecording(WHISPER_SAMPLE_RATE_HZ, (samples) => {
        stt.streamInsert?.(samples);
      });
    } catch (err: any) {
      setError(err?.message ?? String(err));
      await recorder.stopRecording();
      stt.streamStop?.();
    }
  };

  return (
    <TaskScreen
      title="Speech to Text"
      subtitle="Whisper Tiny (EN)"
      status={{
        ...stt,
        error: error || (stt.error ? stt.error.message : null),
      }}
      onLoadModel={!loaded ? () => setLoaded(true) : undefined}
      busy={recorder.isRecording}
      onRun={() => undefined}
      canRun={false}
      onDeleteModel={async () => {
        await recorder.stopRecording();
        stt.streamStop?.();
        await deleteCachedFiles(stt.resource);
        setLoaded(false);
      }}
      footer={
        <MicActionButton
          isRecording={recorder.isRecording}
          enabled={stt.isReady}
          onPress={toggleRecording}
        />
      }
    >
      <SpeechTranscriptionViewport
        isRecording={recorder.isRecording}
        committedText={committedText}
        nonCommittedText={nonCommittedText}
      />
    </TaskScreen>
  );
}

export default function SpeechToTextScreen() {
  return (
    <ScreenWrapper>
      <SpeechToTextTask />
    </ScreenWrapper>
  );
}
