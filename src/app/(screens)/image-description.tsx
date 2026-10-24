import { useState } from 'react';
import { models, useLLMChatSession } from 'react-native-executorch';

import { ChatImagePreview } from '@/components/ChatImagePreview';
import { ChatImageInput } from '@/components/ChatImageInput';
import { ChatView } from '@/components/ChatView';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { TaskScreen } from '@/components/TaskScreen';
import { usePhotoInput } from '@/hooks/usePhotoInput';
import { useImageChatState } from '@/hooks/useImageChatState';
import { useModelControls, type ModelControls } from '@/hooks/useModelControls';
import { CHAT_GENERATION } from '@/lib/chat-tools';

const MODEL = models.llm.LFM2_5_VL_450M.DEFAULT;
const INITIAL_MESSAGES = [
  {
    role: 'system',
    content:
      'You are a helpful multimodal assistant by Liquid AI. Describe what is visible in the image. Keep answers concise unless the user asks for detail. If a detail is unclear, say so.',
  },
] as const;

function ImageSession({ model, onNewChat }: { model: ModelControls; onNewChat: () => void }) {
  const session = useLLMChatSession(MODEL, {
    preventLoad: !model.loaded,
    initialMessages: INITIAL_MESSAGES,
    generationConfig: CHAT_GENERATION,
  });
  const chat = useImageChatState();
  const photo = usePhotoInput(chat.onPick, 800, chat.setError);
  const send = async (prompt = chat.draft) => {
    const question = prompt.trim();
    if (!session.sendMessage || !session.isReady || !chat.begin(question)) return;
    try {
      const result = await session.sendMessage(
        chat.image ? [{ kind: 'image', image: chat.image.buffer }, question] : question,
        chat.onToken
      );
      chat.complete(result);
    } catch (cause) {
      chat.fail(cause);
    } finally {
      chat.finish();
    }
  };
  return (
    <TaskScreen
      title="Image descriptions"
      model={model}
      status={session}
      busy={chat.busy}
      error={chat.error}
      scrollable={false}
    >
      <ChatView
        draft={chat.draft}
        onDraftChange={chat.setDraft}
        turns={chat.turns}
        busy={chat.busy}
        onSend={send}
        onStop={() => session.stop?.()}
        session={session}
        model={model}
        onNewChat={onNewChat}
        heroTitle="Every photo has a story."
        heroDescription="Choose a photo, then ask what’s in it."
        suggestions={[]}
        canSend={chat.canSend && !photo.picking}
        contextAccessory={
          <ChatImageInput
            onChoose={photo.choose}
            picking={photo.picking}
            disabled={!session.isReady || chat.busy}
          />
        }
        composerAccessory={
          chat.image && photo.image ? (
            <ChatImagePreview
              image={photo.image}
              onRemove={photo.clear}
              disabled={chat.busy || photo.picking}
            />
          ) : undefined
        }
      />
    </TaskScreen>
  );
}
function ImageTask() {
  const model = useModelControls(MODEL.modelPath, { name: 'LFM 2.5 VL 450M' });
  const [conversation, setConversation] = useState(0);
  return (
    <ImageSession
      key={`${model.revision}:${conversation}`}
      model={model}
      onNewChat={() => setConversation((value) => value + 1)}
    />
  );
}
export default function ImageDescriptionScreen() {
  return (
    <ScreenWrapper unmountOnBlur>
      <ImageTask />
    </ScreenWrapper>
  );
}
