import { useEffect, useState } from 'react';
import { nlp, wrapAsync } from 'react-native-executorch';

import { widgetByteDecoder, widgetTokenBytes } from '@/lib/widget-builder/widget-token-bytes';
import { createGrammarTokens } from '@/lib/widget-builder/widget-token-trie';
import {
  createAppGrammar,
  type AppGrammar,
  type GrammarTokens,
} from '@/lib/widget-builder/app-builder-grammar';

/** Reads token pieces on the library's background runtime, preserving partial UTF-8 tokens while excluding special markers. */
const prepareTokens = wrapAsync((path: string): { grammar: AppGrammar; tokens: GrammarTokens } => {
  'worklet';
  const tokenizer = nlp.loadTokenizer(path);
  try {
    const pieces: string[] = [];
    const size = tokenizer.getVocabSize();
    const decoder = widgetByteDecoder();
    for (let id = 0; id < size; id++) {
      pieces.push(widgetTokenBytes(tokenizer.idToToken(id), decoder));
    }
    // LFM3 1.7B has 128,000 output logits, including unused IDs beyond tokenizer entries.
    // https://huggingface.co/LiquidAI/LFM3-1.7B/blob/main/config.json
    return { grammar: createAppGrammar(), tokens: createGrammarTokens(pieces, 128_000) };
  } finally {
    tokenizer.dispose();
  }
});

/**
 * Compiles the compact DFA and tokenizer trie once per local tokenizer path.
 * Returns the grammar, verified token pieces, readiness, and preparation errors.
 * Compilation and token enumeration stay off the React Native thread and the temporary tokenizer is freed.
 */
export function useAppBuilderGrammar(path?: string) {
  const [prepared, setPrepared] = useState<{
    path: string;
    grammar?: AppGrammar;
    tokens?: GrammarTokens;
    error?: string;
  }>();
  useEffect(() => {
    if (!path) return;
    let cancelled = false;
    void prepareTokens(path)
      .then((prepared) => {
        if (!cancelled) setPrepared({ path, ...prepared });
      })
      .catch((cause: unknown) => {
        if (!cancelled)
          setPrepared({ path, error: cause instanceof Error ? cause.message : String(cause) });
      });
    return () => {
      cancelled = true;
    };
  }, [path]);
  const current = prepared?.path === path ? prepared : undefined;
  return { grammar: current?.grammar, tokens: current?.tokens, error: current?.error };
}
