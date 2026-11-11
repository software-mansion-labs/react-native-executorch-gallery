import type { AppGrammar } from '@/lib/widget-builder/app-builder-grammar';
import { compileWidgetAutomaton, type GrammarState } from '@/lib/widget-builder/widget-automaton';
import { EFFECT_CHOICES } from '@/lib/shader-chat/shader-config';

/** Compiles fixed JSON keys and bounded alternatives, reusing Gallery's token-mask automaton. */
export function createShaderGrammar(): AppGrammar {
  'worklet';
  const states: GrammarState[] = [];
  const state = () => {
    states.push({ edges: [], epsilon: [] });
    return states.length - 1;
  };
  const literal = (from: number, text: string, end: number) => {
    let cursor = from;
    for (let i = 0; i < text.length; i++) {
      const next = i === text.length - 1 ? end : state();
      states[cursor].edges.push({ min: text.charCodeAt(i), max: text.charCodeAt(i), to: next });
      cursor = next;
    }
  };
  const start = state();
  let cursor = start;
  const keys = Object.keys(EFFECT_CHOICES) as (keyof typeof EFFECT_CHOICES)[];
  keys.forEach((key, index) => {
    const valuesStart = state();
    literal(cursor, `${index ? ',' : '{'}${JSON.stringify(key)}:`, valuesStart);
    const valuesEnd = state();
    for (const value of EFFECT_CHOICES[key]) literal(valuesStart, JSON.stringify(value), valuesEnd);
    cursor = valuesEnd;
  });
  const end = state();
  literal(cursor, '}', end);
  const closures = states.map((_, index) => [index]);
  return {
    states,
    closures,
    start,
    end,
    automaton: compileWidgetAutomaton(states, closures, start, end),
  };
}
