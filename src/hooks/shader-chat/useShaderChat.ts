import { useEffect, useRef, useState } from 'react';
import { models, useLLMChatSession } from 'react-native-executorch';

import type { ModelControls } from '@/hooks/useModelControls';
import { useShaderGrammar } from '@/hooks/shader-chat/useShaderGrammar';
import { useShaderSessionConfig } from '@/hooks/shader-chat/useShaderSessionConfig';
import {
  SHADER_MESSAGES,
  SHADER_STOP,
  parseShaderConfig,
  type ShaderConfig,
} from '@/lib/shader-chat/shader-config';
import { appBuilderConstraints } from '@/lib/widget-builder/app-builder-grammar';
import type { ChatTurn } from '@/lib/chat/chat-presentation';

export const SHADER_MODEL = models.llm.LFM3_1_7B.DEFAULT;
export type ShaderTurn = ChatTurn & { effect?: ShaderConfig; source?: string };

/**
 * Runs serialized, grammar-constrained parameter generation and keeps prior effects on errors or stop.
 * @param model Explicit download/storage controls for the selected LFM3 export.
 * @returns Conversation turns, composer state, generation/stop session, readiness and errors.
 */
export function useShaderChat(model: ModelControls) {
  const [draft, setDraft] = useState('');
  const [turns, setTurns] = useState<ShaderTurn[]>([]);
  const [busy, setBusy] = useState(false);
  const active = useRef(false);
  const mounted = useRef(true);
  const lastEffect = useRef<ShaderConfig | null>(null);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const configuration = useShaderSessionConfig(SHADER_MODEL, model.loaded);
  const session = useLLMChatSession(configuration.config ?? SHADER_MODEL, {
    preventLoad: !model.loaded || !configuration.config,
    resetOnTurn: true,
    initialMessages: SHADER_MESSAGES,
    stopRegex: SHADER_STOP,
  });
  const grammar = useShaderGrammar(session.resource?.tokenizerPath);
  const status = { ...session, error: configuration.error ?? session.error };
  const canRun = model.prepared && session.isReady && !!grammar?.tokens && !model.deleting;
  const send = async (input = draft) => {
    const prompt = input.trim();
    if (
      !canRun ||
      active.current ||
      !session.sendMessage ||
      !grammar?.grammar ||
      !grammar.tokens ||
      !prompt
    )
      return;
    active.current = true;
    setBusy(true);
    setDraft('');
    const update = (patch: Partial<ShaderTurn>) => {
      if (mounted.current)
        setTurns((items) =>
          items.map((turn, index) => (index === items.length - 1 ? { ...turn, ...patch } : turn))
        );
    };
    setTurns((items) => [
      ...items,
      { question: prompt, responses: [''], pending: true, tools: [], plainResponse: true },
    ]);
    try {
      const previous = lastEffect.current
        ? `Previous settings: ${JSON.stringify(lastEffect.current)}\n`
        : '';
      const result = await session.sendMessage(`${previous}Request: ${prompt}`, undefined, {
        enableThinking: false,
        temperature: 0.1,
        topP: 1,
        topK: 50,
        minP: 0,
        repetitionPenalty: 1,
        maxNewTokens: 192,
        constraints: appBuilderConstraints(grammar.grammar, grammar.tokens),
      });
      if (!mounted.current) return;
      if (result.finishReason === 'cancelled') {
        setTurns((items) => items.slice(0, -1));
        setDraft(prompt);
        return;
      }
      const source = result.messages.findLast((message) => message.role === 'assistant')?.content;
      if (typeof source !== 'string') throw new Error('No effect settings were generated.');
      const effect = parseShaderConfig(source);
      lastEffect.current = effect;
      update({
        pending: false,
        source,
        effect,
        responses: [
          `**${effect.effect}** · ${effect.palette}\n\n${effect.speed === 0 ? 'Still' : `${effect.speed}× speed`} · scale ${effect.scale} · ${Math.round(effect.intensity * 100)}% contrast`,
        ],
      });
    } catch (error) {
      update({ pending: false, error: error instanceof Error ? error.message : String(error) });
      if (mounted.current) setDraft(prompt);
    } finally {
      active.current = false;
      if (mounted.current) setBusy(false);
    }
  };
  return { draft, setDraft, turns, busy, send, session, status, canRun, error: grammar?.error };
}
