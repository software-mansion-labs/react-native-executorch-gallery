import {
  GRAPH_OPS,
  compileShaderGraph,
  type GraphArg,
  type GraphNode,
  type GraphType,
  type ShaderGraph,
} from '@/lib/shader-chat/shader-graph';

export type ShaderExpression = [string, ...(GraphArg | ShaderExpression)[]];
export type ShaderTree = { color: ShaderExpression };
export const TREE_LIMIT = 17;
type Task = { type: GraphType } | { text: string } | { values: readonly GraphArg[]; tail: string };
export type TreeCursor = { tasks: Task[]; prefix: string; count: number };

export function initialTreeCursor(): TreeCursor {
  'worklet';
  return { tasks: [{ text: '{"color":' }, { type: 'c' }, { text: '}' }], prefix: '', count: 0 };
}

/** Exposes typed child expressions directly; there are no node indices to manage or leave unused. */
export function treeChoices(cursor: TreeCursor): { text: string; next: Task[]; count: number }[] {
  'worklet';
  const [task, ...rest] = cursor.tasks;
  if (!task) return [];
  if ('text' in task) return [{ text: task.text, next: rest, count: cursor.count }];
  if ('values' in task)
    return task.values.map((value) => ({
      text: JSON.stringify(value) + task.tail,
      next: rest,
      count: cursor.count,
    }));
  const reserved = rest.filter((pending) => 'type' in pending).length;
  return Object.keys(GRAPH_OPS).flatMap((op) => {
    const spec = GRAPH_OPS[op];
    const children = spec.args.filter((arg) => typeof arg === 'string').length;
    if (spec.out !== task.type || cursor.count + 1 + children + reserved > TREE_LIMIT) return [];
    const next: Task[] = [];
    spec.args.forEach((arg, index) => {
      const tail = index === spec.args.length - 1 ? ']' : ',';
      if (typeof arg === 'string') next.push({ type: arg }, { text: tail });
      else next.push({ values: arg, tail });
    });
    return [
      {
        text: `[${JSON.stringify(op)}${spec.args.length ? ',' : ']'}`,
        next: [...next, ...rest],
        count: cursor.count + 1,
      },
    ];
  });
}

/** Incremental bounded pushdown parser, suitable for token-trie traversal on the sampler runtime. */
export function advanceTree(cursor: TreeCursor, piece: string): TreeCursor | undefined {
  'worklet';
  let current = cursor;
  for (let i = 0; i < piece.length; i++) {
    if (!current.tasks.length) {
      if (!/[ \n\r\t]/.test(piece[i])) return;
      continue;
    }
    const prefix = current.prefix + piece[i];
    const options = treeChoices(current).filter((choice) => choice.text.startsWith(prefix));
    if (!options.length) return;
    const complete = options.find((choice) => choice.text === prefix);
    current = complete
      ? { tasks: complete.next, prefix: '', count: complete.count }
      : { ...current, prefix };
  }
  return current;
}

/** Validates the whole typed tree independently of sampling, including the global operation budget. */
export function parseShaderTree(source: string): ShaderTree {
  const value = JSON.parse(source) as ShaderTree;
  if (!value || typeof value !== 'object' || Object.keys(value).join(',') !== 'color')
    throw new Error('Expected one color expression.');
  let count = 0;
  const visit = (node: ShaderExpression, expected: GraphType) => {
    if (++count > TREE_LIMIT) throw new Error('The shader tree exceeds 17 operations.');
    if (!Array.isArray(node) || typeof node[0] !== 'string' || !Object.hasOwn(GRAPH_OPS, node[0]))
      throw new Error('Unknown shader operation.');
    const spec = GRAPH_OPS[node[0]];
    if (spec.out !== expected || node.length !== spec.args.length + 1)
      throw new Error('Shader expression type mismatch.');
    spec.args.forEach((arg, i) => {
      const child = node[i + 1];
      if (typeof arg === 'string') visit(child as ShaderExpression, arg);
      else if (!arg.includes(child as GraphArg))
        throw new Error('Shader parameter is out of range.');
    });
  };
  visit(value.color, 'c');
  return value;
}

/** Lowers nested expressions into the compiler's internal typed DAG, automatically assigning references. */
export function lowerShaderTree(input: ShaderTree): ShaderGraph {
  const tree = parseShaderTree(JSON.stringify(input));
  const nodes: GraphNode[] = [['uv']];
  const visit = ([op, ...args]: ShaderExpression): number => {
    if (op === 'uv') return 0;
    const values = GRAPH_OPS[op].args.map((spec, i) =>
      typeof spec === 'string' ? visit(args[i] as ShaderExpression) : (args[i] as GraphArg)
    );
    nodes.push([op, ...values]);
    return nodes.length - 1;
  };
  const out = visit(tree.color);
  return { nodes, out };
}

/** Compiles only validated operator expansions. Models generate a tree, never raw WGSL. */
export function compileShaderTree(tree: ShaderTree): string {
  return compileShaderGraph(lowerShaderTree(tree));
}

export const TREE_SYSTEM = `Create a procedural pixel shader by COMPOSING nested typed expressions. Output only compact JSON: {"color":COLOR_EXPRESSION}. No node indices, no out field, no Markdown. At most 17 operations in the entire tree (including repeated children).
Every expression is ["operation",arguments...]. In the signatures below, v means a NESTED coordinate expression, s a NESTED scalar expression, c a NESTED color expression. Numeric/string lists are literal choices. Only expressions of the required type may appear in a child position.
Signatures: ${JSON.stringify(GRAPH_OPS)}
Coordinate base ["uv"] covers the unit square. scroll moves coordinates by time*(xSpeed,ySpeed); rotate/scale work about center (0.5,0.5); tile repeats; warp distorts using the nested scalar field. radius/angle measure around center. noise/fbm produce smooth fields. circle/ring/box produce soft masks. wave returns 0.5+0.5*sin(input*frequency*2pi-time*speed). sin maps to [0,1]. smooth is smoothstep. Other scalar math is ordinary arithmetic.
ramp maps scalar to a palette: ocean=deepblue/cyan, sunset=purple/orange, neon=purple/pink/cyan, fire=darkred/orange/yellow, aurora=darksky/green/cyan, mono=black/white. mask(color,scalar) makes a dark background where the scalar is zero. mix(color,color,scalar), screen and add_color layer effects. rgb takes literal RGB values; hsv takes nested scalar expressions.
Example A, unrelated drifting colored dots: {"color":["mask",["ramp",["noise",["uv"],8],"fire"],["circle",["tile",["scroll",["uv"],0.25,0.25],4],0.2]]}
Example B, unrelated gold moving diagonal bands inside a square: {"color":["mask",["ramp",["wave",["x",["rotate",["uv"],45]],4,0.5],"sunset"],["box",["uv"],0.3,0.3]]}
Invent your own composition matching the request, not a copy of either example. Use only the operations you need, usually 6–14. Noise/coordinate warps create organic variation; masks provide structure; waves or scrolled coordinates provide motion. Build a meaningful final color, not just a constant or simple gradient.`;
