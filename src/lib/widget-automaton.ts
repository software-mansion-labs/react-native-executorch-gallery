export type GrammarState = {
  edges: { min: number; max: number; to: number }[];
  epsilon: number[];
  freeText?: boolean;
};
export type WidgetAutomaton = {
  start: number;
  next: Int32Array;
  textCapacity: Uint16Array;
  freeText: Uint8Array;
  classes: Uint8Array;
  stride: number;
};

/** Determinizes the acyclic bounded grammar, then merges states with identical future transitions. */
export function compileWidgetAutomaton(
  states: GrammarState[],
  closures: number[][],
  start: number,
  end: number
): WidgetAutomaton {
  'worklet';
  // Bytes with identical edge membership share one column; UTF-8 does not require a 256-column table.
  const boundaries = new Set([0, 256]);
  for (const state of states)
    for (const edge of state.edges) {
      boundaries.add(edge.min);
      boundaries.add(edge.max + 1);
    }
  const points = [...boundaries].sort((a, b) => a - b);
  const stride = points.length - 1;
  const classes = new Uint8Array(256);
  for (let slot = 0; slot < stride; slot++)
    for (let byte = points[slot]; byte < points[slot + 1]; byte++) classes[byte] = slot;
  const subsets = [closures[start]];
  const lookup = new Map<string, number>([
    [[...closures[start]].sort((a, b) => a - b).join(','), 0],
  ]);
  const rows: Int32Array[] = [];
  const accepting: boolean[] = [];
  const free: boolean[] = [];
  for (let index = 0; index < subsets.length; index++) {
    const row = new Int32Array(stride).fill(-1);
    const outgoing: Set<number>[] = [];
    for (const state of subsets[index])
      for (const edge of states[state].edges) {
        for (let code = classes[edge.min]; code <= classes[edge.max]; code++) {
          const targets = outgoing[code] ?? (outgoing[code] = new Set());
          for (const target of closures[edge.to]) targets.add(target);
        }
      }
    for (let code = 0; code < stride; code++) {
      if (!outgoing[code]) continue;
      const targets = [...outgoing[code]].sort((a, b) => a - b);
      const key = targets.join(',');
      let next = lookup.get(key);
      if (next === undefined) {
        next = subsets.length;
        lookup.set(key, next);
        subsets.push(targets);
      }
      row[code] = next;
    }
    rows.push(row);
    accepting.push(subsets[index].includes(end));
    free.push(subsets[index].some((state) => states[state].freeText));
  }
  // Minimize bottom-up: this grammar is bounded, so every transition eventually reaches a leaf.
  const parents: number[][] = rows.map(() => []);
  const pending = rows.map((row, parent) => {
    const children = new Set([...row].filter((child) => child >= 0));
    for (const child of children) parents[child].push(parent);
    return children.size;
  });
  const queue = pending.flatMap((count, index) => (count ? [] : [index]));
  const canonical = new Int32Array(rows.length).fill(-1);
  const signatures = new Map<string, number>();
  const minimal: Int32Array[] = [];
  const minimalFree: number[] = [];
  for (let offset = 0; offset < queue.length; offset++) {
    const state = queue[offset];
    const row = rows[state].map((child) => (child < 0 ? -1 : canonical[child]));
    const key = `${accepting[state] ? 1 : 0}:${free[state] ? 1 : 0}:${row.join(',')}`;
    let id = signatures.get(key);
    if (id === undefined) {
      id = minimal.length;
      signatures.set(key, id);
      minimal.push(row);
      minimalFree.push(free[state] ? 1 : 0);
    }
    canonical[state] = id;
    for (const parent of parents[state]) if (--pending[parent] === 0) queue.push(parent);
  }
  if (queue.length !== rows.length) throw new Error('Widget grammar must be acyclic.');
  const next = new Int32Array(minimal.length * stride);
  const textCapacity = new Uint16Array(minimal.length);
  for (let state = 0; state < minimal.length; state++) {
    next.set(minimal[state], state * stride);
    const target = minimal[state][classes[32]];
    if (target < 0) continue;
    let plain = true;
    for (let code = 33; code <= 126; code++) {
      if (code !== 34 && code !== 92 && minimal[state][classes[code]] !== target) {
        plain = false;
        break;
      }
    }
    if (plain) textCapacity[state] = 1 + textCapacity[target];
  }
  return {
    start: canonical[0],
    next,
    textCapacity,
    freeText: Uint8Array.from(minimalFree),
    classes,
    stride,
  };
}

/** Advances only accepted token text through the compact deterministic transition table. */
export function advanceWidgetAutomaton(
  automaton: WidgetAutomaton,
  state: number,
  piece: string
): number {
  'worklet';
  for (let index = 0; index < piece.length; index++) {
    const code = piece.charCodeAt(index);
    if (code >= 256 || state < 0) return -1;
    state = automaton.next[state * automaton.stride + automaton.classes[code]];
  }
  return state;
}

export type WidgetGenerationPosition = {
  state: number;
  escaped: boolean;
  unicodeRemaining?: number;
  quoted: boolean;
  spaced: boolean;
  last: number;
};
/** Tracks opaque JSON text and lexical whitespace while constraining only structural bytes. */
export function advanceWidgetGeneration(
  automaton: WidgetAutomaton,
  position: WidgetGenerationPosition,
  piece: string
): WidgetGenerationPosition {
  'worklet';
  let { state, escaped, quoted, spaced, last, unicodeRemaining = 0 } = position;
  for (let index = 0; index < piece.length; index++) {
    const code = piece.charCodeAt(index);
    if (automaton.freeText[state]) {
      if (code < 32 || code >= 256) {
        state = -1;
        break;
      }
      if (unicodeRemaining) {
        if (!(
          (code >= 48 && code <= 57) ||
          (code >= 65 && code <= 70) ||
          (code >= 97 && code <= 102)
        )) {
          state = -1;
          break;
        }
        unicodeRemaining--;
      } else if (escaped) {
        if (code === 117) unicodeRemaining = 4;
        else if (![34, 92, 47, 98, 102, 110, 114, 116].includes(code)) {
          state = -1;
          break;
        }
        escaped = false;
      } else if (code === 92) escaped = true;
      else if (code === 34) {
        state = automaton.next[state * automaton.stride + automaton.classes[34]];
        quoted = false;
        spaced = false;
        last = 0;
      }
      continue;
    }
    if (!quoted && (code === 32 || code === 9 || code === 10 || code === 13)) {
      spaced = true;
      continue;
    }
    const kind =
      code >= 48 && code <= 57
        ? 1
        : (code >= 65 && code <= 90) || (code >= 97 && code <= 122)
          ? 2
          : code === 46
            ? 3
            : 0;
    if (
      spaced &&
      ((kind && kind === last) || (last === 1 && kind === 3) || (last === 3 && kind === 1))
    ) {
      state = -1;
      break;
    }
    if (code >= 256 || state < 0) {
      state = -1;
      break;
    }
    state = automaton.next[state * automaton.stride + automaton.classes[code]];
    if (!Number.isInteger(state) || state < 0) {
      state = -1;
      break;
    }
    if (code === 34) quoted = automaton.freeText[state] ? false : !quoted;
    spaced = false;
    last = kind;
  }
  return { state, escaped, quoted, spaced, last, unicodeRemaining };
}
