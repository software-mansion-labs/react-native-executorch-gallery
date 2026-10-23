import { useState } from 'react';
import { KOKORO_SAMPLE_RATE, models, useTextToSpeech } from 'react-native-executorch';

import { AudioWaveformVisualizer } from '@/components/AudioWaveformVisualizer';
import { PromptInput } from '@/components/PromptInput';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { TaskScreen } from '@/components/TaskScreen';

import { useAudioPlayer } from '@/hooks/useAudioPlayer';

import { deleteCachedFiles } from '@/lib/deleteCachedFiles';

const SUGGESTIONS = [
  'ExecuTorch brings fast PyTorch AI models directly to your mobile device.',
  'Kokoro synthesizes natural, expressive speech on-device in real-time.',
  'The weather today is warm and sunny with a clear blue sky.',
];

const MODEL = models.textToSpeech.KOKORO.EN_US.DEFAULT;

function TextToSpeechTask() {
  const [loaded, setLoaded] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [ttfa, setTtfa] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const player = useAudioPlayer(KOKORO_SAMPLE_RATE);
  const tts = useTextToSpeech(MODEL, { preventLoad: !loaded });

  const handleStop = () => {
    tts.synthesizeStop?.();
    player.stop();
    setBusy(false);
  };

  const run = async () => {
    if (busy || player.isPlaying || !prompt.trim() || !tts.synthesize) return;
    setBusy(true);
    setTtfa(null);
    setError(null);
    try {
      const t0 = Date.now();
      const chunks = tts.synthesize(prompt, { voice: 'af_heart' });
      await player.playStream(chunks, () => setTtfa(Date.now() - t0));
    } catch (err: any) {
      setError(err?.message ?? String(err));
    } finally {
      setBusy(false);
    }
  };

  const isExecuting = busy || player.isPlaying;

  return (
    <TaskScreen
      title="Text to Speech"
      subtitle="Kokoro 82M · English"
      status={{
        ...tts,
        error: error || (tts.error ? tts.error.message : null),
      }}
      onLoadModel={!loaded ? () => setLoaded(true) : undefined}
      busy={isExecuting}
      onRun={() => undefined}
      canRun={false}
      onDeleteModel={async () => {
        handleStop();
        await deleteCachedFiles(tts.resource);
        setLoaded(false);
      }}
      meta={ttfa != null ? `TTFA ${ttfa} ms` : undefined}
      footer={
        <PromptInput
          value={prompt}
          onChangeText={setPrompt}
          onSubmit={run}
          disabled={busy && !player.isPlaying}
          isExecuting={busy && !player.isPlaying}
          isPlaying={player.isPlaying}
          onStop={handleStop}
          canSubmit={!!prompt.trim() && tts.isReady && !isExecuting}
          suggestions={SUGGESTIONS}
          placeholder="Enter text to synthesize into speech…"
        />
      }
    >
      <AudioWaveformVisualizer active={player.isPlaying} />
    </TaskScreen>
  );
}

export default function TextToSpeechScreen() {
  return (
    <ScreenWrapper>
      <TextToSpeechTask />
    </ScreenWrapper>
  );
}
