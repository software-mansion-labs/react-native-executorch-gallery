import { useEffect, useState } from 'react';
import { nlp, wrapAsync } from 'react-native-executorch';

import { createShaderGrammar } from '@/lib/shader-chat/shader-grammar';
import type { AppGrammar, GrammarTokens } from '@/lib/widget-builder/app-builder-grammar';
import { widgetByteDecoder, widgetTokenBytes } from '@/lib/widget-builder/widget-token-bytes';
import { createGrammarTokens } from '@/lib/widget-builder/widget-token-trie';

const prepare = wrapAsync((path: string) => {
  'worklet';
  const tokenizer = nlp.loadTokenizer(path);
  try {
    const decoder = widgetByteDecoder();
    const pieces: string[] = [];
    for (let id = 0; id < tokenizer.getVocabSize(); id++)
      pieces.push(widgetTokenBytes(tokenizer.idToToken(id), decoder));
    // LFM3 1.7B has 128,000 output logits, including unused tokenizer IDs.
    return { grammar: createShaderGrammar(), tokens: createGrammarTokens(pieces, 128_000) };
  } finally {
    tokenizer.dispose();
  }
});

/**
 * Prepares the effect grammar and LFM3 token trie off the RN thread, ignoring stale loads.
 * @param path Local tokenizer path after explicit model setup, or undefined before loading.
 * @returns The prepared grammar/token trie or an error for the current path.
 */
export function useShaderGrammar(path?: string) {
  const [prepared, setPrepared] = useState<{
    path: string;
    grammar?: AppGrammar;
    tokens?: GrammarTokens;
    error?: string;
  }>();
  useEffect(() => {
    if (!path) return;
    let active = true;
    void prepare(path).then(
      (result) => {
        if (active) setPrepared({ path, ...result });
      },
      (error: unknown) => {
        if (active) setPrepared({ path, error: String(error) });
      }
    );
    return () => {
      active = false;
    };
  }, [path]);
  return prepared?.path === path ? prepared : undefined;
}
