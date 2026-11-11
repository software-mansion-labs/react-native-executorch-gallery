import { useEffect, useRef, useState } from 'react';
import { useLLMChatSession, type llm } from 'react-native-executorch';

import type { ModelControls } from '@/hooks/useModelControls';
import { useShaderGrammar } from '@/hooks/shader-chat/useShaderGrammar';
import { useShaderSessionConfig } from '@/hooks/shader-chat/useShaderSessionConfig';
import { SHADER_MODEL } from '@/hooks/shader-chat/useShaderChat';
import { treeConstraints } from '@/lib/shader-chat/tree-constraints';
import {
  TREE_SYSTEM,
  parseShaderTree,
  compileShaderTree,
  lowerShaderTree,
  type ShaderTree,
} from '@/lib/shader-chat/shader-tree';
import { describeShaderGraph } from '@/lib/shader-chat/shader-graph';
import type { ChatTurn } from '@/lib/chat/chat-presentation';

const messages: readonly llm.ChatMessage[] = [{ role: 'system', content: TREE_SYSTEM }];
type GraphTurn = ChatTurn & { graph?: ShaderTree; source?: string };

/**
 * Generates experimental typed programs with a bounded parser and the existing native sampler.
 * @param model Explicit load/storage controls for LFM3, reset by the parent on model revision.
 * @returns Chat state, model/session status, guarded generation and parameter preparation errors.
 */
export function useShaderTreeChat(model: ModelControls) {
  const [draft, setDraft] = useState('');
  const [turns, setTurns] = useState<GraphTurn[]>([]);
  const [busy, setBusy] = useState(false);
  const active = useRef(false);
  const mounted = useRef(true);
  const previousGraph = useRef<ShaderTree | undefined>(undefined);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const configuration = useShaderSessionConfig(SHADER_MODEL, model.loaded, messages);
  const session = useLLMChatSession(configuration.config ?? SHADER_MODEL, {
    preventLoad: !model.loaded || !configuration.config,
    resetOnTurn: true,
    initialMessages: messages,
    stopRegex: /^\{"color":[\s\S]*\}\s*$/,
  });
  const grammar = useShaderGrammar(session.resource?.tokenizerPath);
  const status = { ...session, error: configuration.error ?? session.error };
  const canRun = model.prepared && session.isReady && !!grammar?.tokens && !model.deleting;
  const send = async (input = draft) => {
    const prompt = input.trim();
    if (!canRun || active.current || !session.sendMessage || !grammar?.tokens || !prompt) return;
    active.current = true;
    setBusy(true);
    setDraft('');
    const update = (patch: Partial<GraphTurn>) => {
      if (mounted.current)
        setTurns((items) =>
          items.map((turn, i) => (i === items.length - 1 ? { ...turn, ...patch } : turn))
        );
    };
    setTurns((items) => [
      ...items,
      { question: prompt, responses: [''], pending: true, tools: [], plainResponse: true },
    ]);
    try {
      const context = previousGraph.current
        ? `Previous graph: ${JSON.stringify(previousGraph.current)}\n`
        : '';
      const result = await session.sendMessage(`${context}Request: ${prompt}`, undefined, {
        enableThinking: false,
        temperature: 0.1,
        topP: 1,
        topK: 50,
        minP: 0,
        repetitionPenalty: 1,
        maxNewTokens: 768,
        constraints: treeConstraints(grammar.tokens),
      });
      if (!mounted.current) return;
      if (result.finishReason === 'cancelled') {
        setTurns((items) => items.slice(0, -1));
        setDraft(prompt);
        return;
      }
      const source = result.messages.findLast((message) => message.role === 'assistant')?.content;
      if (typeof source !== 'string') throw new Error('No shader graph was generated.');
      const graph = parseShaderTree(source);
      compileShaderTree(graph);
      const info = describeShaderGraph(lowerShaderTree(graph));
      previousGraph.current = graph;
      update({
        pending: false,
        graph,
        source,
        responses: [
          `**Generated shader**\n\n${info.used} connected operations · ${info.animated ? 'Animated' : 'Still'}${info.used < 4 ? '\n\nThe model produced a very simple output. Try another request.' : ''}`,
        ],
      });
    } catch (cause) {
      update({ pending: false, error: cause instanceof Error ? cause.message : String(cause) });
      if (mounted.current) setDraft(prompt);
    } finally {
      active.current = false;
      if (mounted.current) setBusy(false);
    }
  };
  return { draft, setDraft, turns, busy, send, session, status, canRun, error: grammar?.error };
}
