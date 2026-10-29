import { useEffect, useState } from 'react';
import type { llm, useLLMChatSession } from 'react-native-executorch';

/** Reads actual native KV capacity on readiness and while streaming, without estimating tokens. */
export function useChatContext(session: ReturnType<typeof useLLMChatSession>, busy: boolean) {
  const [context, setContext] = useState<llm.LLMKVCacheState | null>(null);
  const getState = session.getKVCacheState;
  useEffect(() => {
    const read = () => {
      try {
        setContext(getState?.() ?? null);
      } catch {
        setContext(null);
      }
    };
    read();
    if (!busy) return;
    const timer = setInterval(read, 500);
    return () => clearInterval(timer);
  }, [getState, busy]);
  return context;
}
