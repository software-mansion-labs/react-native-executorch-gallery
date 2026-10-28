import { WIDGET_COLOR_NAMES } from '@/lib/widget-builder/widget-colors';
import type { llm } from 'react-native-executorch';
import { createSynchronizable } from 'react-native-worklets';

import {
  compileWidgetAutomaton,
  advanceWidgetGeneration,
  type GrammarState,
  type WidgetAutomaton,
  type WidgetGenerationPosition,
} from '@/lib/widget-builder/widget-automaton';
import { widgetTokenMask, type GrammarTokens } from '@/lib/widget-builder/widget-token-trie';
export type { GrammarTokens } from '@/lib/widget-builder/widget-token-trie';

export type AppGrammar = {
  states: GrammarState[];
  closures: number[][];
  start: number;
  end: number;
  automaton: WidgetAutomaton;
};
type Rule =
  | string
  | { sequence: Rule[] }
  | { choices: Rule[] }
  | { string: true }
  | { integer: true }
  | { number: true };
const sequence = (...rules: Rule[]): Rule => {
  'worklet';
  return { sequence: rules };
};
const choice = (...rules: Rule[]): Rule => {
  'worklet';
  return { choices: rules };
};
const text = (): Rule => {
  'worklet';
  return { string: true };
};
const integer = (): Rule => {
  'worklet';
  return { integer: true };
};
const array = (item: Rule, min: number, max: number): Rule => {
  'worklet';
  const tail = (remaining: number): Rule =>
    remaining === 0 ? ']' : choice(']', sequence(',', item, tail(remaining - 1)));
  const initial: Rule[] = [];
  for (let index = 0; index < min; index++) {
    if (index) initial.push(',');
    initial.push(item);
  }
  return sequence('[', ...initial, tail(max - min));
};

/** Compiles the widget structure into an automaton with unrestricted text and JSON boundary checks. */
export function createAppGrammar(): AppGrammar {
  'worklet';
  const finish = choice(
    '}',
    sequence(
      ',"accent":',
      choice('"primary"', '"secondary"', '"tertiary"'),
      choice('}', sequence(',"emphasis":', choice('true', 'false'), '}'))
    ),
    sequence(',"emphasis":', choice('true', 'false'), '}')
  );
  const control = choice(
    sequence(
      '{"type":',
      choice('"single-select"', '"multi-select"'),
      ',"label":',
      text(),
      ',"options":',
      array(text(), 2, 6),
      finish
    ),
    sequence('{"type":"checklist","label":', text(), ',"items":', array(text(), 1, 6), finish),
    ...['text', 'toggle', 'counter', 'rating', 'number-input'].map((type) =>
      sequence(`{"type":"${type}","label":`, text(), finish)
    ),
    sequence(
      '{"type":"goal-counter","label":',
      text(),
      ',"target":',
      integer(),
      choice(finish, sequence(',"step":', { number: true }, finish))
    ),
    sequence('{"type":"timer","label":', text(), ',"seconds":', integer(), finish)
  );
  const color = choice(...WIDGET_COLOR_NAMES.map((name) => JSON.stringify(name)));
  const document = sequence(
    '{"appearance":{"scheme":',
    choice('"light"', '"dark"'),
    ',"background":',
    color,
    ',"accents":',
    array(color, 3, 3),
    ',"layout":',
    choice('"stacked"', '"grid"'),
    ',"alignment":',
    choice('"left"', '"center"'),
    '}',
    ',"title":',
    text(),
    ',"description":',
    text(),
    ',"controls":',
    array(control, 1, 6),
    '}'
  );
  const states: GrammarState[] = [];
  const state = () => {
    states.push({ edges: [], epsilon: [] });
    return states.length - 1;
  };
  const edge = (from: number, to: number, min: number, max = min) =>
    states[from].edges.push({ min, max, to });
  const build = (rule: Rule, start: number, end: number) => {
    if (typeof rule === 'string') {
      let cursor = start;
      for (let index = 0; index < rule.length; index++) {
        const next = index === rule.length - 1 ? end : state();
        edge(cursor, next, rule.charCodeAt(index));
        cursor = next;
      }
    } else if ('sequence' in rule) {
      let cursor = start;
      rule.sequence.forEach((part, index) => {
        const next = index === rule.sequence.length - 1 ? end : state();
        build(part, cursor, next);
        cursor = next;
      });
    } else if ('choices' in rule) {
      rule.choices.forEach((part) => {
        const branch = state();
        states[start].epsilon.push(branch);
        build(part, branch, end);
      });
    } else if ('string' in rule) {
      const cursor = state();
      states[cursor].freeText = true;
      edge(start, cursor, 34);
      edge(cursor, end, 34);
    } else {
      // Step values accept up to three fractional digits. A zero whole part
      // must gain a nonzero fractional digit before the number can finish.
      const fraction = (from: number, positive: boolean) => {
        const dot = state();
        edge(from, dot, 46);
        let zero = positive ? -1 : dot;
        let nonzero = positive ? dot : -1;
        for (let digits = 0; digits < 3; digits++) {
          const nextNonzero = state();
          const nextZero = zero >= 0 && digits < 2 ? state() : -1;
          if (zero >= 0) {
            if (nextZero >= 0) edge(zero, nextZero, 48);
            edge(zero, nextNonzero, 49, 57);
          }
          if (nonzero >= 0) edge(nonzero, nextNonzero, 48, 57);
          states[nextNonzero].epsilon.push(end);
          zero = nextZero;
          nonzero = nextNonzero;
        }
      };
      if ('number' in rule) {
        const zero = state();
        edge(start, zero, 48);
        fraction(zero, false);
      }
      let cursor = state();
      edge(start, cursor, 49, 57);
      for (let digits = 1; digits <= 4; digits++) {
        states[cursor].epsilon.push(end);
        if ('number' in rule) fraction(cursor, true);
        if (digits === 4) break;
        const next = state();
        edge(cursor, next, 48, 57);
        cursor = next;
      }
    }
  };
  const start = state();
  const end = state();
  build(document, start, end);
  const closures = states.map((_, index) => {
    const result = [index];
    for (let cursor = 0; cursor < result.length; cursor++)
      for (const next of states[result[cursor]].epsilon)
        if (!result.includes(next)) result.push(next);
    return result;
  });
  return {
    states,
    closures,
    start,
    end,
    automaton: compileWidgetAutomaton(states, closures, start, end),
  };
}

/** Advances a set of automaton states through a token's decoded ASCII text. */
export function advanceAppGrammar(
  grammar: AppGrammar,
  initial: readonly number[],
  text: string
): number[] {
  'worklet';
  let current = initial;
  for (let index = 0; index < text.length; index++) {
    const code = text.charCodeAt(index);
    const next: number[] = [];
    for (const state of current)
      for (const edge of grammar.states[state].edges) {
        if (code < edge.min || code > edge.max) continue;
        for (const target of grammar.closures[edge.to])
          if (!next.includes(target)) next.push(target);
      }
    if (!next.length) return [];
    current = next;
  }
  return [...current];
}

/**
 * Creates an incremental constraint cursor and a bounded cache of DFA-state masks.
 * Both stay on the existing runner runtime. Trie matching skips shared prefixes and
 * accepts whole plain-text subtrees; masks use the smaller allowed/banned representation.
 * Create a fresh callback for each sendMessage; histories within a generation are append-only.
 */
export function appBuilderConstraints(
  grammar: AppGrammar,
  tokens: GrammarTokens
): llm.SamplingConstraintsCallback {
  const automaton = grammar.automaton;
  const cursor = createSynchronizable({
    state: automaton.start,
    consumed: 0,
    lastToken: -1,
    escaped: false,
    unicodeRemaining: 0,
    quoted: false,
    spaced: false,
    last: 0,
  });
  const cache = createSynchronizable<{
    entries: { state: string; mask: llm.SamplingConstraints }[];
    bytes: number;
  }>({ entries: [], bytes: 0 });
  return ({ generatedTokens }) => {
    'worklet';
    const previous = cursor.getBlocking();
    const reusable =
      generatedTokens.length >= previous.consumed &&
      (previous.consumed === 0 || generatedTokens[previous.consumed - 1] === previous.lastToken);
    const consumed = reusable ? previous.consumed : 0;
    let position: WidgetGenerationPosition = reusable
      ? previous
      : { state: automaton.start, escaped: false, quoted: false, spaced: false, last: 0 };
    for (let index = consumed; index < generatedTokens.length; index++) {
      const piece = tokens.pieces[generatedTokens[index]];
      if (!piece) throw new Error('Unexpected token in app grammar.');
      position = advanceWidgetGeneration(automaton, position, piece);
      if (position.state < 0) throw new Error('No valid app continuation.');
    }
    if (!reusable || consumed !== generatedTokens.length)
      cursor.setBlocking({
        ...position,
        unicodeRemaining: position.unicodeRemaining ?? 0,
        consumed: generatedTokens.length,
        lastToken: generatedTokens[generatedTokens.length - 1] ?? -1,
      });
    // Text masks ban only invalid JSON continuations, never words, Unicode, or length.
    const state = `${position.state}:${position.escaped}:${position.unicodeRemaining ?? 0}:${position.quoted}:${position.spaced}:${position.last}`;
    const cached = cache.getBlocking();
    const entry = cached.entries.find((entry) => entry.state === state);
    if (entry) return entry.mask;
    const mask = widgetTokenMask(automaton, tokens, position.state, position);
    const bytes = (mask.allowedTokens ?? mask.bannedTokens)!.byteLength;
    // FIFO bounds memory without rewriting the cache on hits. Masks themselves never mutate.
    if (bytes <= 4 * 1024 * 1024) {
      const entries = [...cached.entries, { state, mask }];
      let total = cached.bytes + bytes;
      while (total > 4 * 1024 * 1024 || entries.length > 128) {
        const oldest = entries.shift()!;
        total -= (oldest.mask.allowedTokens ?? oldest.mask.bannedTokens)!.byteLength;
      }
      cache.setBlocking({ entries, bytes: total });
    }
    return mask;
  };
}
