import type { llm } from 'react-native-executorch';
import {
  advanceWidgetGeneration,
  type WidgetGenerationPosition,
  type WidgetAutomaton,
} from '@/lib/widget-automaton';

export type GrammarTokens = {
  pieces: string[];
  vocabularySize?: number;
  invalid: Int32Array;
  trie: {
    first: Int32Array;
    sibling: Int32Array;
    code: Uint8Array;
    start: Int32Array;
    terminalEnd: Int32Array;
    end: Int32Array;
    plain: Uint8Array;
    maxSuffix: Uint16Array;
    ids: Int32Array;
  };
};

/** Indexes decoded tokens by shared prefixes, including contiguous subtree ranges for bulk acceptance. */
export function createGrammarTokens(pieces: string[], vocabularySize?: number): GrammarTokens {
  'worklet';
  if (vocabularySize !== undefined && vocabularySize < pieces.length)
    throw new Error('Model vocabulary is smaller than its tokenizer.');
  const first = [-1],
    sibling = [-1],
    code = [0];
  const terminals: number[][] = [[]];
  const invalid: number[] = [];
  for (let id = 0; id < (vocabularySize ?? pieces.length); id++) {
    const piece = pieces[id];
    if (!piece || !/^[\x09\x0a\x0d\x20-\xff]+$/.test(piece) || /^<\|.*\|>$/.test(piece)) {
      invalid.push(id);
      continue;
    }
    let node = 0;
    for (let index = 0; index < piece.length; index++) {
      const character = piece.charCodeAt(index);
      let child = first[node];
      while (child >= 0 && code[child] !== character) child = sibling[child];
      if (child < 0) {
        child = first.length;
        first.push(-1);
        sibling.push(first[node]);
        code.push(character);
        terminals.push([]);
        first[node] = child;
      }
      node = child;
    }
    terminals[node].push(id);
  }
  const count = first.length;
  const start = new Int32Array(count),
    terminalEnd = new Int32Array(count),
    end = new Int32Array(count);
  const plain = new Uint8Array(count).fill(1),
    maxSuffix = new Uint16Array(count);
  // Children are always allocated after parents, so suffix properties can be computed backwards.
  for (let node = count - 1; node >= 0; node--)
    for (let child = first[node]; child >= 0; child = sibling[child]) {
      maxSuffix[node] = Math.max(maxSuffix[node], 1 + maxSuffix[child]);
      if (!plain[child] || code[child] < 32 || code[child] === 34 || code[child] === 92)
        plain[node] = 0;
    }
  const ids: number[] = [];
  const stack = [0];
  while (stack.length) {
    const entry = stack.pop()!;
    if (entry < 0) {
      end[~entry] = ids.length;
      continue;
    }
    start[entry] = ids.length;
    ids.push(...terminals[entry]);
    terminalEnd[entry] = ids.length;
    stack.push(~entry);
    const children: number[] = [];
    for (let child = first[entry]; child >= 0; child = sibling[child]) children.push(child);
    for (let index = children.length - 1; index >= 0; index--) stack.push(children[index]);
  }
  return {
    pieces,
    vocabularySize,
    invalid: Int32Array.from(invalid),
    trie: {
      first: Int32Array.from(first),
      sibling: Int32Array.from(sibling),
      code: Uint8Array.from(code),
      start,
      terminalEnd,
      end,
      plain,
      maxSuffix,
      ids: Int32Array.from(ids),
    },
  };
}

/** Walks shared token prefixes once against the structural scanner and returns the smaller mask. */
export function widgetTokenMask(
  automaton: WidgetAutomaton,
  tokens: GrammarTokens,
  state: number,
  position: WidgetGenerationPosition = {
    state,
    escaped: false,
    quoted: false,
    spaced: false,
    last: 0,
  }
): llm.SamplingConstraints {
  'worklet';
  const trie = tokens.trie;
  const ranges: { start: number; end: number }[] = [];
  const nodes = [0],
    positions = [position];
  let allowedCount = 0;
  while (nodes.length) {
    const node = nodes.pop()!;
    const current = positions.pop()!;
    // Ordinary text (including UTF-8 byte fragments) cannot leave a string. Skip whole
    // vocabulary subtrees; inspect only escapes and tokens that cross the closing quote.
    if (
      automaton.freeText[current.state] &&
      !current.escaped &&
      !current.unicodeRemaining &&
      trie.plain[node]
    ) {
      ranges.push({ start: trie.start[node], end: trie.end[node] });
      allowedCount += trie.end[node] - trie.start[node];
      continue;
    }
    const start = trie.start[node],
      end = trie.terminalEnd[node];
    if (end > start) {
      ranges.push({ start, end });
      allowedCount += end - start;
    }
    for (let child = trie.first[node]; child >= 0; child = trie.sibling[child]) {
      const next = advanceWidgetGeneration(
        automaton,
        current,
        String.fromCharCode(trie.code[child])
      );
      if (next.state >= 0) {
        nodes.push(child);
        positions.push(next);
      }
    }
  }
  if (!allowedCount) throw new Error('No valid app continuation.');
  ranges.sort((a, b) => a.start - b.start);
  const vocabularySize = tokens.vocabularySize ?? tokens.pieces.length;
  const text = automaton.freeText[state] && !position.escaped && !position.unicodeRemaining;
  const banned = text || allowedCount > vocabularySize / 2;
  const mask = new Int32Array(banned ? vocabularySize - allowedCount : allowedCount);
  let offset = 0;
  if (banned) {
    mask.set(tokens.invalid);
    offset = tokens.invalid.length;
    let cursor = 0;
    for (const range of ranges) {
      for (; cursor < range.start; cursor++) mask[offset++] = trie.ids[cursor];
      cursor = range.end;
    }
    for (; cursor < trie.ids.length; cursor++) mask[offset++] = trie.ids[cursor];
  } else {
    for (const range of ranges)
      for (let index = range.start; index < range.end; index++) mask[offset++] = trie.ids[index];
  }
  return banned ? { bannedTokens: mask } : { allowedTokens: mask };
}
