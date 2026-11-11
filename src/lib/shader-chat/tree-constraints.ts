import type { llm } from 'react-native-executorch';
import { createSynchronizable } from 'react-native-worklets';

import { advanceTree, initialTreeCursor } from '@/lib/shader-chat/shader-tree';
import type { GrammarTokens } from '@/lib/widget-builder/widget-token-trie';

/** Masks whole tokens through the typed expression parser, including expressions spanning token boundaries. */
export function treeConstraints(tokens: GrammarTokens): llm.SamplingConstraintsCallback {
  const cursor = createSynchronizable({ state: initialTreeCursor(), consumed: 0, lastToken: -1 });
  const cache = createSynchronizable<{ key: string; ids: Int32Array }[]>([]);
  return ({ generatedTokens }) => {
    'worklet';
    const previous = cursor.getBlocking();
    const reusable =
      generatedTokens.length >= previous.consumed &&
      (!previous.consumed || generatedTokens[previous.consumed - 1] === previous.lastToken);
    let state = reusable ? previous.state : initialTreeCursor();
    for (let i = reusable ? previous.consumed : 0; i < generatedTokens.length; i++) {
      const piece = tokens.pieces[generatedTokens[i]];
      if (!piece) throw new Error('Unknown expression token.');
      const next = advanceTree(state, piece);
      if (!next) throw new Error('Invalid typed expression continuation.');
      state = next;
    }
    cursor.setBlocking({
      state,
      consumed: generatedTokens.length,
      lastToken: generatedTokens[generatedTokens.length - 1] ?? -1,
    });
    const key = JSON.stringify(state);
    const entries = cache.getBlocking();
    const hit = entries.find((entry) => entry.key === key);
    if (hit) return { allowedTokens: hit.ids };
    const { trie } = tokens;
    const ids: number[] = [];
    const stack = [{ node: 0, state }];
    while (stack.length) {
      const current = stack.pop()!;
      for (let i = trie.start[current.node]; i < trie.terminalEnd[current.node]; i++)
        ids.push(trie.ids[i]);
      for (let child = trie.first[current.node]; child >= 0; child = trie.sibling[child]) {
        const next = advanceTree(current.state, String.fromCharCode(trie.code[child]));
        if (next) stack.push({ node: child, state: next });
      }
    }
    if (!ids.length) throw new Error('No valid expression continuation.');
    const allowed = Int32Array.from(ids);
    cache.setBlocking([...entries.slice(-63), { key, ids: allowed }]);
    return { allowedTokens: allowed };
  };
}
