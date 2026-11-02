import { useEffect, useRef, useState } from 'react';
import { models, useSpeechToText, WHISPER_SAMPLE_RATE_HZ } from 'react-native-executorch';
import { MicrophoneStage } from '@/components/audio/MicrophoneStage';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Transcript } from '@/components/speech-to-text/Transcript';
import { TaskScreen } from '@/components/TaskScreen';
import { useAudioRecorder } from '@/hooks/audio/useAudioRecorder';
import { useModelControls } from '@/hooks/useModelControls';
import { useTaskState } from '@/hooks/useTaskState';
import { useSpeechLevel } from '@/hooks/speech-to-text/useSpeechLevel';

const MODEL = models.speechToText.WHISPER.EN.TINY.DEFAULT;
const MODEL_PATHS = [MODEL.modelPath, MODEL.vadModel.modelPath];

function SpeechToTextTask() {
  const model = useModelControls(MODEL_PATHS, { name: 'Whisper Tiny · English' });
  const [committed, setCommitted] = useTaskState('', model.revision);
  const [partial, setPartial] = useTaskState('', model.revision);
  const [error, setError] = useTaskState<string | null>(null, model.revision);
  const [streaming, setStreaming] = useState(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const stt = useSpeechToText(MODEL, { preventLoad: !model.loaded });
  const recorder = useAudioRecorder(() => stt.streamStop?.(), setError);
  const { level, updateLevel } = useSpeechLevel(recorder.isRecording);

  const toggleRecording = async () => {
    if (recorder.isRecording) {
      await recorder.stopRecording();
      return;
    }
    if (!model.prepared || !stt.isReady || !stt.stream || !stt.streamInsert) return;
    if (recorder.starting || streaming) return;
    setError(null);
    setCommitted('');
    setPartial('');
    setStreaming(true);
    const consume = async () => {
      try {
        for await (const result of stt.stream!({ language: 'en' })) {
          if (!mounted.current) break;
          setCommitted(result.committed);
          setPartial(result.nonCommitted);
        }
      } catch (cause) {
        if (mounted.current) setError(cause instanceof Error ? cause.message : String(cause));
        await recorder.stopRecording();
      } finally {
        if (mounted.current) setStreaming(false);
      }
    };
    void consume();
    try {
      await recorder.startRecording(WHISPER_SAMPLE_RATE_HZ, (samples) => {
        updateLevel(samples);
        stt.streamInsert?.(samples);
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  };

  return (
    <TaskScreen
      title="Speech to text"
      model={model}
      status={stt}
      error={error}
      busy={streaming || recorder.starting || recorder.isRecording}
      scrollable={false}
    >
      <MicrophoneStage
        model={model}
        status={stt}
        title="Turn speech into words"
        description="Speak naturally and watch your words appear, right on your device."
        active={recorder.isRecording}
        starting={recorder.starting}
        finishing={streaming && !recorder.isRecording && !recorder.starting}
        hasResult={!!committed || !!partial}
        onToggle={toggleRecording}
      >
        <Transcript committed={committed} partial={partial} listening={streaming} level={level} />
      </MicrophoneStage>
    </TaskScreen>
  );
}
export default function SpeechToTextScreen() {
  return (
    <ScreenWrapper unmountOnBlur>
      <SpeechToTextTask />
    </ScreenWrapper>
  );
}
