import { useState } from 'react';

import { ChatView } from '@/components/chat/ChatView';
import { ShaderPreview } from '@/components/shader-chat/ShaderPreview';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { TaskScreen } from '@/components/TaskScreen';
import { useModelControls, type ModelControls } from '@/hooks/useModelControls';
import { SHADER_MODEL } from '@/hooks/shader-chat/useShaderChat';
import { useShaderTreeChat } from '@/hooks/shader-chat/useShaderTreeChat';

const suggestions = [
  {
    label: 'Neon portal',
    prompt:
      'Create an animated neon portal: purple and cyan luminous circular rings around a dark center, with a turbulent halo. Make it feel energetic and dimensional.',
  },
  {
    label: 'Lava',
    prompt:
      'Create slowly drifting molten lava: orange and yellow organic islands with soft glowing edges against nearly black cracks. Make the shapes irregular, not straight stripes.',
  },
  {
    label: 'Aurora',
    prompt:
      'Create a flowing green and cyan aurora: layered luminous ribbons over a dark sky, moving gently. Give it vertical structure and organic variation.',
  },
];

function GraphSession({ model, onNewChat }: { model: ModelControls; onNewChat: () => void }) {
  const chat = useShaderTreeChat(model);
  const latest = chat.turns.findLastIndex((turn) => !!turn.graph);
  return (
    <TaskScreen
      title="Shader lab"
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
        heroTitle="Compose a shader"
        heroDescription="Shapes, noise, masks, and color. An experiment in generating small programs."
        suggestions={suggestions}
        renderAnswerAccessory={(_, index) => {
          const turn = chat.turns[index];
          return index === latest && turn.graph && turn.source ? (
            <ShaderPreview config={turn.graph} source={turn.source} />
          ) : null;
        }}
      />
    </TaskScreen>
  );
}

function GraphTask() {
  const model = useModelControls(SHADER_MODEL.modelPath, { name: 'LFM3 1.7B' });
  const [conversation, setConversation] = useState(0);
  return (
    <GraphSession
      key={`${model.revision}:${conversation}`}
      model={model}
      onNewChat={() => setConversation((n) => n + 1)}
    />
  );
}

export default function ShaderLabScreen() {
  return (
    <ScreenWrapper unmountOnBlur>
      <GraphTask />
    </ScreenWrapper>
  );
}
