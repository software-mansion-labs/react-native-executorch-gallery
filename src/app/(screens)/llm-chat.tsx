import { useEffect, useMemo, useRef, useState } from 'react';
import { models, useLLMChatSession } from 'react-native-executorch';

import { ChatThinkingToggle } from '@/components/chat/ChatThinkingToggle';
import { ChatView } from '@/components/chat/ChatView';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { TaskScreen } from '@/components/TaskScreen';
import { useModelControls, type ModelControls } from '@/hooks/useModelControls';
import {
  CHAT_GENERATION,
  CHAT_MESSAGES,
  createChatTools,
  parseLfmToolCalls,
  splitLfmResponse,
} from '@/lib/chat/chat-tools';
import { updateLastTurn, type ChatTurn } from '@/lib/chat/chat-presentation';

const MODEL = models.llm.LFM3_1_7B.DEFAULT;

function ChatSession({ model, onNewChat }: { model: ModelControls; onNewChat: () => void }) {
  const [draft, setDraft] = useState('');
  const [thinking, setThinking] = useState(true);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [busy, setBusy] = useState(false);
  const active = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const toolOpts = useMemo(() => {
    const tools = createChatTools((name, detail, args) => {
      setTurns((items) =>
        updateLastTurn(items, (turn) => ({
          ...turn,
          responses: turn.responses.at(-1) ? [...turn.responses, ''] : turn.responses,
          tools: [...turn.tools, { name, detail, arguments: args }],
        }))
      );
    });
    return {
      tools,
      parseToolCalls: (text: string) => parseLfmToolCalls(text, tools, false),
      maxToolTurns: 4,
    };
  }, []);

  const session = useLLMChatSession(MODEL, {
    preventLoad: !model.loaded,
    initialMessages: CHAT_MESSAGES,
    generationConfig: CHAT_GENERATION,
    toolOpts,
  });

  const send = async (prompt = draft) => {
    const question = prompt.trim();
    if (!session.sendMessage || !session.isReady || active.current || !question) return;
    active.current = true;
    setDraft('');
    setBusy(true);
    setTurns((items) => [
      ...items,
      { question, responses: [''], pending: true, tools: [], plainResponse: !thinking },
    ]);
    try {
      const result = await session.sendMessage(
        question,
        (token) => {
          if (!mounted.current || !active.current) return;
          setTurns((items) =>
            updateLastTurn(items, (turn) => ({
              ...turn,
              responses: [...turn.responses.slice(0, -1), (turn.responses.at(-1) ?? '') + token],
            }))
          );
        },
        { enableThinking: thinking }
      );
      if (!mounted.current) return;
      if (result.finishReason === 'cancelled') {
        setTurns((items) => items.slice(0, -1));
        setDraft(question);
      } else {
        const answer = [...result.messages]
          .reverse()
          .find((message) => message.role === 'assistant' && !message.toolCalls?.length);
        const unfinished =
          typeof answer?.content !== 'string' || !splitLfmResponse(answer.content, thinking).answer;
        const reachedLimit = (result.stats.at(-1)?.numTokens ?? 0) >= CHAT_GENERATION.maxNewTokens;
        const error =
          result.finishReason === 'maxToolTurns'
            ? 'The tool limit was reached before the response finished.'
            : unfinished
              ? reachedLimit
                ? 'The model reached its response limit before producing an answer.'
                : 'The model stopped before producing an answer.'
              : undefined;
        setTurns((items) =>
          updateLastTurn(items, (turn) => ({
            ...turn,
            pending: false,
            error,
            responses:
              typeof answer?.content === 'string'
                ? [...turn.responses.slice(0, -1), answer.content]
                : turn.responses,
          }))
        );
      }
    } catch (cause) {
      if (mounted.current) {
        setTurns((items) =>
          updateLastTurn(items, (turn) => ({
            ...turn,
            pending: false,
            error: cause instanceof Error ? cause.message : String(cause),
          }))
        );
        setDraft(question);
      }
    } finally {
      active.current = false;
      if (mounted.current) setBusy(false);
    }
  };

  return (
    <TaskScreen title="Local chat" model={model} status={session} busy={busy} scrollable={false}>
      <ChatView
        draft={draft}
        onDraftChange={setDraft}
        turns={turns}
        busy={busy}
        onSend={send}
        onStop={() => session.stop?.()}
        session={session}
        model={model}
        onNewChat={onNewChat}
        contextAccessory={
          <ChatThinkingToggle enabled={thinking} onChange={setThinking} disabled={busy} />
        }
      />
    </TaskScreen>
  );
}

function ChatTask() {
  const model = useModelControls(MODEL.modelPath, { name: 'LFM3 1.7B' });
  const [conversation, setConversation] = useState(0);
  return (
    <ChatSession
      key={`${model.revision}:${conversation}`}
      model={model}
      onNewChat={() => setConversation((value) => value + 1)}
    />
  );
}

export default function ChatScreen() {
  return (
    <ScreenWrapper unmountOnBlur>
      <ChatTask />
    </ScreenWrapper>
  );
}
