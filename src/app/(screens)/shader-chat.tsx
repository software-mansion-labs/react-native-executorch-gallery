import { useState } from 'react';

import { ChatView } from '@/components/chat/ChatView';
import { ShaderPreview } from '@/components/shader-chat/ShaderPreview';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { TaskScreen } from '@/components/TaskScreen';
import { useModelControls, type ModelControls } from '@/hooks/useModelControls';
import { SHADER_MODEL, useShaderChat } from '@/hooks/shader-chat/useShaderChat';

const suggestions = [
  { label: 'Ocean ripples', prompt: 'Slow circular ripples in ocean colors.' },
  { label: 'Pink waves', prompt: 'Dense pink and purple wave interference, moving quickly.' },
  { label: 'Checkerboard', prompt: 'A still black and white 8 by 8 checkerboard.' },
];

function ShaderChatSession({ model, onNewChat }: { model: ModelControls; onNewChat: () => void }) {
  const chat = useShaderChat(model);
  const latest = chat.turns.findLastIndex((turn) => !!turn.effect);
  return (
    <TaskScreen
      title="Shader chat"
      model={model}
      status={chat.status}
      busy={chat.busy}
      error={chat.error}
      scrollable={false}
    >
      <ChatView
        draft={chat.draft}
        onDraftChange={chat.setDraft}
        turns={chat.turns}
        busy={chat.busy}
        onSend={chat.send}
        onStop={() => chat.session.stop?.()}
        session={chat.status}
        model={model}
        onNewChat={onNewChat}
        canSend={chat.canRun}
        heroTitle="Make something move"
        heroDescription="Describe a pattern. Adjust its colors, rhythm, and motion."
        suggestions={suggestions}
        renderAnswerAccessory={(_, index) => {
          const turn = chat.turns[index];
          return index === latest && turn.effect && turn.source ? (
            <ShaderPreview config={turn.effect} source={turn.source} />
          ) : null;
        }}
      />
    </TaskScreen>
  );
}

function ShaderChatTask() {
  const model = useModelControls(SHADER_MODEL.modelPath, { name: 'LFM3 1.7B' });
  const [conversation, setConversation] = useState(0);
  return (
    <ShaderChatSession
      key={`${model.revision}:${conversation}`}
      model={model}
      onNewChat={() => setConversation((value) => value + 1)}
    />
  );
}

export default function ShaderChatScreen() {
  return (
    <ScreenWrapper unmountOnBlur>
      <ShaderChatTask />
    </ScreenWrapper>
  );
}
