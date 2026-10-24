import { useState } from 'react';
import { models, useTextToImage } from 'react-native-executorch';

import { ImageGenerationView } from '@/components/ImageGenerationView';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { TaskScreen } from '@/components/TaskScreen';
import { useDisposableImage } from '@/hooks/useDisposableImage';
import { useModelControls } from '@/hooks/useModelControls';
import { useTaskState } from '@/hooks/useTaskState';
import { bufferToSkImage } from '@/lib/image';

const MODEL = models.textToImage.SDXS_512_DREAMSHAPER.DEFAULT;

function TextToImageTask() {
  const model = useModelControls(MODEL.modelPath, { name: 'SDXS DreamShaper' });
  const [prompt, setPrompt] = useTaskState('', model.revision);
  const [image, setImage] = useDisposableImage(model.revision);
  const [latency, setLatency] = useTaskState<number | null>(null, model.revision);
  const [error, setError] = useTaskState<string | null>(null, model.revision);
  const [busy, setBusy] = useState(false);

  const generator = useTextToImage(MODEL, { preventLoad: !model.loaded });

  const run = async () => {
    if (!prompt.trim() || !model.loaded || !generator.isReady || !generator.generate) return;
    if (busy || model.deleting) return;
    setBusy(true);
    setImage(null);
    setLatency(null);
    setError(null);
    try {
      const started = performance.now();
      const output = await generator.generate(prompt.trim());
      const nextImage = bufferToSkImage(output);
      if (!nextImage) throw new Error('Could not create an image from the generated output.');
      setImage(nextImage);
      setLatency(Math.round(performance.now() - started));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <TaskScreen
      title="Text to image"
      model={model}
      status={generator}
      error={error}
      busy={busy}
      scrollable={false}
    >
      <ImageGenerationView
        image={image}
        prompt={prompt}
        onPromptChange={setPrompt}
        onGenerate={run}
        busy={busy}
        latency={latency}
        model={model}
        status={generator}
      />
    </TaskScreen>
  );
}
export default function TextToImageScreen() {
  return (
    <ScreenWrapper unmountOnBlur>
      <TextToImageTask />
    </ScreenWrapper>
  );
}
