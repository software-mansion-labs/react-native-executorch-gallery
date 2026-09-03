import { useRef, useState } from 'react';
import { ScrollView } from 'react-native';
import { models, useLLMChatSession } from 'react-native-executorch';

import { ChatViewport, type ChatMessage } from '@/components/ChatViewport';
import { PromptInput } from '@/components/PromptInput';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { TaskScreen } from '@/components/TaskScreen';

import { deleteCachedFiles } from '@/lib/deleteCachedFiles';

const SUGGESTIONS = [
  'Explain on-device AI in one sentence.',
  'Why is the sky blue?',
  'Write a short haiku about coding.',
];

const SYSTEM_PROMPT =
  'You are a helpful on-device LLM assistant running in React Native ExecuTorch';

const MODEL = models.llm.LFM2_5_1_2B.XNNPACK_8DA4W;

function LlmChatTask() {
  const [loaded, setLoaded] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView | null>(null);

  const llm = useLLMChatSession(MODEL, {
    initialMessages: [{ role: 'system', content: SYSTEM_PROMPT }],
    generationConfig: { temperature: 0.2, maxNewTokens: 512, echo: false },
    preventLoad: !loaded,
  });

  const isPrefilling = streamingText === '';
  const hasReceivedTokens = typeof streamingText === 'string' && streamingText.length > 0;
  const isGenerating = streamingText !== null;

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || !llm.isReady || !llm.sendMessage || isGenerating) return;

    const userMessage: ChatMessage = { role: 'user', content: trimmed };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setStreamingText('');
    setError(null);

    try {
      const result = await llm.sendMessage(trimmed, (token) => {
        setStreamingText((prev) => (prev !== null ? prev + token : token));
      });

      const content = result.messages.findLast((m) => m.role === 'assistant')?.content as string;
      const stats = result.stats[result.stats.length - 1];
      setMessages((prev) => [...prev, { role: 'assistant', content, stats }]);
    } catch (err: any) {
      setError(err?.message ?? String(err));
    } finally {
      setStreamingText(null);
    }
  };

  return (
    <TaskScreen
      title="LLM Chat"
      subtitle="LFM 2.5 1.2B · CPU"
      status={{
        ...llm,
        error: error ? new Error(error) : llm.error,
      }}
      onLoadModel={!loaded ? () => setLoaded(true) : undefined}
      canRun={false}
      busy={isGenerating}
      onRun={() => undefined}
      onDeleteModel={async () => {
        llm.stop?.();
        await deleteCachedFiles(llm.resource);
        setLoaded(false);
        setMessages([]);
        setStreamingText(null);
      }}
      footer={
        <PromptInput
          value={input}
          onChangeText={setInput}
          onSubmit={sendMessage}
          placeholder="Ask LFM anything…"
          suggestions={SUGGESTIONS}
          disabled={!llm.isReady}
          canSubmit={!!input.trim() && llm.isReady && !isGenerating}
          isExecuting={isPrefilling}
          isPlaying={hasReceivedTokens}
          onStop={() => llm.stop?.()}
        />
      }
    >
      <ChatViewport messages={messages} streamingText={streamingText} scrollRef={scrollRef} />
    </TaskScreen>
  );
}

export default function LlmChatScreen() {
  return (
    <ScreenWrapper>
      <LlmChatTask />
    </ScreenWrapper>
  );
}
