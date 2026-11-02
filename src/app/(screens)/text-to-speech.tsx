import { models, useTextToSpeech } from 'react-native-executorch';

import { ScreenWrapper } from '@/components/ScreenWrapper';
import { TaskScreen } from '@/components/TaskScreen';
import { TextToSpeechView } from '@/components/text-to-speech/TextToSpeechView';
import { useModelControls } from '@/hooks/useModelControls';
import { useSpeechPlayback } from '@/hooks/text-to-speech/useSpeechPlayback';
import { useTaskState } from '@/hooks/useTaskState';

const MODEL = models.textToSpeech.KOKORO.EN_US.DEFAULT;
const MODEL_PATHS = Object.values(MODEL.modelPaths);

function TextToSpeechTask() {
  const model = useModelControls(MODEL_PATHS, { name: 'Kokoro · English' });
  const [input, setInput] = useTaskState('', model.revision);
  const [error, setError] = useTaskState<string | null>(null, model.revision);

  const tts = useTextToSpeech(MODEL, { preventLoad: !model.loaded });
  const playback = useSpeechPlayback(tts.synthesizeStop, model.revision);

  const run = async () => {
    if (!input.trim() || !model.loaded || !tts.isReady || !tts.synthesize) return;
    if (playback.busy || model.deleting) return;
    setError(null);
    try {
      const text = input;
      const chunks = tts.synthesize(text, { voice: 'af_heart' });
      setInput('');
      await playback.play(text, chunks);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  };

  const replay = async () => {
    setError(null);
    try {
      await playback.replay();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  };

  return (
    <TaskScreen
      title="Text to speech"
      model={model}
      status={tts}
      error={error}
      busy={playback.busy}
      scrollable={false}
    >
      <TextToSpeechView
        input={input}
        onInputChange={setInput}
        onRun={run}
        onReplay={replay}
        playback={playback}
        model={model}
        status={tts}
      />
    </TaskScreen>
  );
}

export default function TextToSpeechScreen() {
  return (
    <ScreenWrapper unmountOnBlur>
      <TextToSpeechTask />
    </ScreenWrapper>
  );
}
