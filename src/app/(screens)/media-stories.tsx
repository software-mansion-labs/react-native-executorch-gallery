import { models, useLLMChatSession } from 'react-native-executorch';

import { MediaStoriesView } from '@/components/media-stories/MediaStoriesView';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { TaskScreen } from '@/components/TaskScreen';
import { useMediaCollection } from '@/hooks/media-stories/useMediaCollection';
import { useMediaSessionConfig } from '@/hooks/media-stories/useMediaSessionConfig';
import { useModelControls, type ModelControls } from '@/hooks/useModelControls';
import { splitLfmResponse } from '@/lib/chat/chat-tools';
import { MEDIA_MESSAGES, mediaPrompt } from '@/lib/media-stories/media';

const MODEL = models.llm.LFM3_VL_2B.DEFAULT;

function MediaSession({ model }: { model: ModelControls }) {
  const prepared = useMediaSessionConfig(MODEL, model.loaded);
  const session = useLLMChatSession(prepared.config ?? MODEL, {
    preventLoad: !model.loaded || !prepared.config,
    initialMessages: MEDIA_MESSAGES,
    resetOnTurn: true,
    generationConfig: { enableThinking: false, temperature: 0.1, maxNewTokens: 256 },
  });
  const collection = useMediaCollection(async (item, frames, onToken) => {
    if (!session.sendMessage || !model.prepared || !session.isReady) return null;
    const result = await session.sendMessage(mediaPrompt(item, frames), onToken);
    if (result.finishReason === 'cancelled') return null;
    const answer = [...result.messages].reverse().find((message) => message.role === 'assistant');
    return typeof answer?.content === 'string'
      ? splitLfmResponse(answer.content, false).answer
      : '';
  }, session.stop);
  const status = { ...session, error: prepared.error || session.error };
  return (
    <TaskScreen
      title="Media stories"
      model={model}
      status={status}
      busy={collection.busy}
      error={collection.error}
      scrollable={false}
    >
      <MediaStoriesView model={model} status={status} collection={collection} />
    </TaskScreen>
  );
}

function MediaTask() {
  const model = useModelControls(MODEL.modelPath, { name: 'LFM3 VL 2B' });
  return <MediaSession key={model.revision} model={model} />;
}

export default function MediaStoriesScreen() {
  return (
    <ScreenWrapper unmountOnBlur>
      <MediaTask />
    </ScreenWrapper>
  );
}
