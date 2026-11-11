/** Small typed shader programs. Values reference earlier nodes, never executable source. */
export type GraphType = 'v' | 's' | 'c';
export type GraphArg = string | number;
export type GraphNode = [string, ...GraphArg[]];
export type ShaderGraph = { nodes: GraphNode[]; out: number };
type ArgSpec = GraphType | readonly GraphArg[];
type OpSpec = { out: GraphType; args: readonly ArgSpec[] };

const frequency = [1, 2, 3, 4, 6, 8, 12, 16, 24, 32] as const;
const speed = [-2, -1, -0.5, -0.25, 0, 0.25, 0.5, 1, 2] as const;
const unit = [0, 0.1, 0.25, 0.5, 0.75, 1] as const;
export const GRAPH_LIMIT = 18;
export const GRAPH_PALETTES = {
  ocean: [
    [0.01, 0.03, 0.12],
    [0, 0.35, 0.7],
    [0.2, 1, 0.9],
  ],
  sunset: [
    [0.08, 0, 0.18],
    [0.85, 0.15, 0.3],
    [1, 0.8, 0.25],
  ],
  neon: [
    [0.015, 0, 0.06],
    [0.8, 0.05, 0.9],
    [0.2, 1, 1],
  ],
  fire: [
    [0.015, 0.005, 0],
    [0.85, 0.08, 0],
    [1, 0.9, 0.3],
  ],
  aurora: [
    [0, 0.015, 0.04],
    [0.02, 0.7, 0.35],
    [0.3, 0.9, 1],
  ],
  mono: [
    [0, 0, 0],
    [0.5, 0.5, 0.5],
    [1, 1, 1],
  ],
} as const;

export const GRAPH_OPS: Record<string, OpSpec> = {
  uv: { out: 'v', args: [] },
  scale: { out: 'v', args: ['v', [0.5, 1, 2, 3, 4, 6, 8]] },
  rotate: { out: 'v', args: ['v', [-90, -45, 0, 45, 90, 135]] },
  scroll: { out: 'v', args: ['v', speed, speed] },
  tile: { out: 'v', args: ['v', frequency] },
  warp: { out: 'v', args: ['v', 's', [0.02, 0.05, 0.1, 0.2, 0.4]] },
  constant: {
    out: 's',
    args: [[-8, -4, -2, -1, -0.5, 0, 0.1, 0.25, 0.5, 0.75, 1, 2, 4, 8, 16, 32]],
  },
  time: { out: 's', args: [speed] },
  x: { out: 's', args: ['v'] },
  y: { out: 's', args: ['v'] },
  radius: { out: 's', args: ['v'] },
  angle: { out: 's', args: ['v'] },
  noise: { out: 's', args: ['v', frequency] },
  fbm: { out: 's', args: ['v', frequency] },
  circle: { out: 's', args: ['v', [0.1, 0.2, 0.3, 0.4, 0.5]] },
  ring: { out: 's', args: ['v', [0.1, 0.2, 0.3, 0.4, 0.5], [0.01, 0.02, 0.05, 0.1]] },
  box: { out: 's', args: ['v', [0.1, 0.2, 0.3, 0.4], [0.1, 0.2, 0.3, 0.4]] },
  wave: { out: 's', args: ['s', frequency, speed] },
  sin: { out: 's', args: ['s'] },
  abs: { out: 's', args: ['s'] },
  fract: { out: 's', args: ['s'] },
  invert: { out: 's', args: ['s'] },
  smooth: { out: 's', args: ['s'] },
  add: { out: 's', args: ['s', 's'] },
  subtract: { out: 's', args: ['s', 's'] },
  multiply: { out: 's', args: ['s', 's'] },
  min: { out: 's', args: ['s', 's'] },
  max: { out: 's', args: ['s', 's'] },
  rgb: { out: 'c', args: [unit, unit, unit] },
  ramp: { out: 'c', args: ['s', Object.keys(GRAPH_PALETTES)] },
  hsv: { out: 'c', args: ['s', 's', 's'] },
  mix: { out: 'c', args: ['c', 'c', 's'] },
  mask: { out: 'c', args: ['c', 's'] },
  add_color: { out: 'c', args: ['c', 'c'] },
  screen: { out: 'c', args: ['c', 'c'] },
};

/** Rejects cycles/forward references, type mismatches, unknown fields/operators and excess nodes. */
export function parseShaderGraph(source: string): ShaderGraph {
  const graph = JSON.parse(source) as ShaderGraph;
  if (
    !graph ||
    typeof graph !== 'object' ||
    Object.keys(graph).sort().join(',') !== 'nodes,out' ||
    !Array.isArray(graph.nodes) ||
    graph.nodes.length < 2 ||
    graph.nodes.length > GRAPH_LIMIT
  )
    throw new Error('Expected a shader graph with 2–18 nodes and one color output.');
  const types: GraphType[] = [];
  graph.nodes.forEach((node, index) => {
    if (!Array.isArray(node) || typeof node[0] !== 'string' || !Object.hasOwn(GRAPH_OPS, node[0]))
      throw new Error(`Unknown shader node at ${index}.`);
    const spec = GRAPH_OPS[node[0]];
    if (node.length !== spec.args.length + 1 || (index === 0 && node[0] !== 'uv'))
      throw new Error(`Invalid arguments at node ${index}.`);
    spec.args.forEach((arg, slot) => {
      const value = node[slot + 1];
      if (typeof arg === 'string') {
        if (
          typeof value !== 'number' ||
          !Number.isInteger(value) ||
          value < 0 ||
          value >= index ||
          types[value] !== arg
        )
          throw new Error(`Wrong reference type at node ${index}, argument ${slot}.`);
      } else if (!arg.includes(value)) throw new Error(`Out-of-range parameter at node ${index}.`);
    });
    types.push(spec.out);
  });
  if (!Number.isInteger(graph.out) || types[graph.out] !== 'c')
    throw new Error('Shader output must reference a color node.');
  return graph;
}

export type GraphCursor = {
  phase: number;
  prefix: string;
  nodes: GraphNode[];
  op: string;
  args: GraphArg[];
  out?: number;
};
type Choice = { text: string; value: GraphArg };

export function initialGraphCursor(): GraphCursor {
  'worklet';
  return { phase: 0, prefix: '', nodes: [], op: '', args: [] };
}

/** Legal chunks depend on previous node types, so invalid references cannot be sampled. */
export function graphChoices(cursor: GraphCursor): Choice[] {
  'worklet';
  const types = cursor.nodes.map((node) => GRAPH_OPS[node[0]].out);
  const refs = (type: GraphType) =>
    types.flatMap((value, index) => (value === type ? [index] : []));
  if (cursor.phase === 0) return [{ text: '{"nodes":[[', value: 'header' }];
  if (cursor.phase === 1) {
    return Object.keys(GRAPH_OPS)
      .filter((op) => {
        if (!types.length) return op === 'uv';
        const spec = GRAPH_OPS[op];
        if (types.length === GRAPH_LIMIT - 1 && !types.includes('c') && spec.out !== 'c')
          return false;
        return spec.args.every((arg) => typeof arg !== 'string' || types.includes(arg));
      })
      .map((op) => ({
        text: `${JSON.stringify(op)}${GRAPH_OPS[op].args.length ? ',' : ']'}`,
        value: op,
      }));
  }
  if (cursor.phase === 2) {
    const spec = GRAPH_OPS[cursor.op];
    const arg = spec.args[cursor.args.length];
    const values = typeof arg === 'string' ? refs(arg) : arg;
    const end = cursor.args.length === spec.args.length - 1 ? ']' : ',';
    return values.map((value) => ({ text: JSON.stringify(value) + end, value }));
  }
  if (cursor.phase === 3)
    return [
      ...(types.length < GRAPH_LIMIT ? [{ text: ',[', value: 'next' }] : []),
      ...(types.includes('c') ? [{ text: '],"out":', value: 'output' }] : []),
    ];
  if (cursor.phase === 4) return refs('c').map((value) => ({ text: `${value}}`, value }));
  return [];
}

/** Advances compact JSON through a bounded typed parser. Immutable state supports token-trie branching. */
export function advanceGraph(cursor: GraphCursor, piece: string): GraphCursor | undefined {
  'worklet';
  let current = cursor;
  for (let i = 0; i < piece.length; i++) {
    if (current.phase === 5) {
      if (!/[ \r\n\t]/.test(piece[i])) return;
      continue;
    }
    const prefix = current.prefix + piece[i];
    const choices = graphChoices(current).filter((choice) => choice.text.startsWith(prefix));
    if (!choices.length) return;
    const complete = choices.find((choice) => choice.text === prefix);
    if (!complete) {
      current = { ...current, prefix };
      continue;
    }
    const { phase } = current;
    current = { ...current, prefix: '' };
    if (phase === 0) current.phase = 1;
    else if (phase === 1) {
      current.op = String(complete.value);
      current.args = [];
      if (GRAPH_OPS[current.op].args.length) current.phase = 2;
      else {
        current.nodes = [...current.nodes, [current.op]];
        current.phase = 3;
      }
    } else if (phase === 2) {
      current.args = [...current.args, complete.value];
      if (current.args.length === GRAPH_OPS[current.op].args.length) {
        current.nodes = [...current.nodes, [current.op, ...current.args]];
        current.phase = 3;
      }
    } else if (phase === 3) current.phase = complete.value === 'next' ? 1 : 4;
    else if (phase === 4) {
      current.out = Number(complete.value);
      current.phase = 5;
    }
  }
  return current;
}

const HELPERS = `
struct Params { resolution: vec2f, time: f32, padding: f32 }
@group(0) @binding(0) var<uniform> params: Params;
fn gHash(p: vec2f) -> f32 { return fract(sin(dot(p,vec2f(127.1,311.7)))*43758.5453); }
fn gNoise(p: vec2f) -> f32 {
  let i=floor(p); let f=fract(p); let u=f*f*(vec2f(3.0)-2.0*f);
  return mix(mix(gHash(i),gHash(i+vec2f(1.0,0.0)),u.x),
             mix(gHash(i+vec2f(0.0,1.0)),gHash(i+vec2f(1.0,1.0)),u.x),u.y);
}
fn gFbm(p: vec2f) -> f32 { return (gNoise(p)*0.5+gNoise(p*2.03+vec2f(7.1))*0.25+gNoise(p*4.07+vec2f(13.7))*0.125)/0.875; }
fn gRotate(p: vec2f,a: f32) -> vec2f { let q=p-vec2f(0.5); let c=cos(a); let s=sin(a); return vec2f(c*q.x-s*q.y,s*q.x+c*q.y)+vec2f(0.5); }
fn gRamp(t: f32,a: vec3f,b: vec3f,c: vec3f) -> vec3f { let x=clamp(t,0.0,1.0); return mix(mix(a,b,clamp(x*2.0,0.0,1.0)),c,clamp(x*2.0-1.0,0.0,1.0)); }
fn gHsv(h: f32,s: f32,v: f32) -> vec3f { let p=abs(fract(vec3f(h)+vec3f(0.0,0.6666667,0.3333333))*6.0-vec3f(3.0)); return clamp(v,0.0,1.0)*mix(vec3f(1.0),clamp(p-vec3f(1.0),vec3f(0.0),vec3f(1.0)),clamp(s,0.0,1.0)); }
@vertex fn vertex_main(@builtin(vertex_index) index: u32) -> @builtin(position) vec4f {
  let x=f32((index<<1u)&2u); let y=f32(index&2u); return vec4f(x*2.0-1.0,y*2.0-1.0,0.0,1.0);
}
`;

/** Compiles validated typed nodes into WGSL from trusted expansions; no model text is interpolated as code. */
export function compileShaderGraph(input: ShaderGraph): string {
  const graph = parseShaderGraph(JSON.stringify(input));
  const number = (n: GraphArg) => (Number.isInteger(n) ? `${n}.0` : String(n));
  const vec = (color: readonly number[]) => `vec3f(${color.map((v) => number(v)).join(',')})`;
  const lines = graph.nodes.map(([op, ...a], index) => {
    const n = (i: number) => number(a[i]);
    const r = (i: number) => `n${a[i]}`;
    const x = r(0),
      y = r(1);
    let expression: string;
    switch (op) {
      case 'uv':
        expression = 'uv';
        break;
      case 'scale':
        expression = `(${x}-vec2f(0.5))*${n(1)}+vec2f(0.5)`;
        break;
      case 'rotate':
        expression = `gRotate(${x},${n(1)}*0.01745329252)`;
        break;
      case 'scroll':
        expression = `${x}+vec2f(${n(1)},${n(2)})*time`;
        break;
      case 'tile':
        expression = `fract(${x}*${n(1)})`;
        break;
      case 'warp':
        expression = `${x}+vec2f(${y}-0.5,sin(${y}*6.2831853)*0.5)*${n(2)}`;
        break;
      case 'constant':
        expression = n(0);
        break;
      case 'time':
        expression = `time*${n(0)}`;
        break;
      case 'x':
      case 'y':
        expression = `${x}.${op}`;
        break;
      case 'radius':
        expression = `length(${x}-vec2f(0.5))`;
        break;
      case 'angle':
        expression = `atan2(${x}.y-0.5,${x}.x-0.5)`;
        break;
      case 'noise':
      case 'fbm':
        expression = `${op === 'noise' ? 'gNoise' : 'gFbm'}(${x}*${n(1)})`;
        break;
      case 'circle':
        expression = `1.0-smoothstep(${n(1)}-0.006,${n(1)}+0.006,length(${x}-vec2f(0.5)))`;
        break;
      case 'ring':
        expression = `1.0-smoothstep(${n(2)},${n(2)}+0.006,abs(length(${x}-vec2f(0.5))-${n(1)}))`;
        break;
      case 'box':
        expression = `1.0-smoothstep(0.0,0.006,max(abs(${x}.x-0.5)-${n(1)},abs(${x}.y-0.5)-${n(2)}))`;
        break;
      case 'wave':
        expression = `0.5+0.5*sin(${x}*${n(1)}*6.2831853-time*${n(2)})`;
        break;
      case 'sin':
        expression = `0.5+0.5*sin(${x})`;
        break;
      case 'abs':
      case 'fract':
        expression = `${op}(${x})`;
        break;
      case 'invert':
        expression = `1.0-${x}`;
        break;
      case 'smooth':
        expression = `smoothstep(0.0,1.0,${x})`;
        break;
      case 'add':
        expression = `${x}+${y}`;
        break;
      case 'subtract':
        expression = `${x}-${y}`;
        break;
      case 'multiply':
        expression = `${x}*${y}`;
        break;
      case 'min':
      case 'max':
        expression = `${op}(${x},${y})`;
        break;
      case 'rgb':
        expression = `vec3f(${n(0)},${n(1)},${n(2)})`;
        break;
      case 'ramp': {
        const colors = GRAPH_PALETTES[a[1] as keyof typeof GRAPH_PALETTES];
        expression = `gRamp(${x},${colors.map(vec).join(',')})`;
        break;
      }
      case 'hsv':
        expression = `gHsv(${x},${y},${r(2)})`;
        break;
      case 'mix':
        expression = `mix(${x},${y},clamp(${r(2)},0.0,1.0))`;
        break;
      case 'mask':
        expression = `${x}*clamp(${y},0.0,1.0)`;
        break;
      case 'add_color':
        expression = `${x}+${y}`;
        break;
      case 'screen':
        expression = `vec3f(1.0)-(vec3f(1.0)-clamp(${x},vec3f(0.0),vec3f(1.0)))*(vec3f(1.0)-clamp(${y},vec3f(0.0),vec3f(1.0)))`;
        break;
      default:
        throw new Error('Unsupported shader operation.');
    }
    const type = GRAPH_OPS[op].out;
    const bounds =
      type === 's'
        ? '-1024.0,1024.0'
        : type === 'v'
          ? 'vec2f(-64.0),vec2f(64.0)'
          : 'vec3f(0.0),vec3f(8.0)';
    return `let n${index}: ${type === 'v' ? 'vec2f' : type === 'c' ? 'vec3f' : 'f32'} = clamp(${expression},${bounds});`;
  });
  return `${HELPERS}\nfn graphColor(uv: vec2f,time: f32) -> vec4f {\n${lines.join('\n')}\nreturn vec4f(clamp(n${graph.out},vec3f(0.0),vec3f(1.0)),1.0);\n}\n@fragment fn fragment_main(@builtin(position) pos: vec4f) -> @location(0) vec4f { return graphColor(pos.xy/params.resolution,params.time); }`;
}

/** Reports only operations reachable from the color output, so unused animation is not advertised. */
export function describeShaderGraph(graph: ShaderGraph) {
  const used = new Set<number>();
  const visit = (index: number) => {
    if (used.has(index)) return;
    used.add(index);
    const [op, ...args] = graph.nodes[index];
    GRAPH_OPS[op].args.forEach((spec, i) => {
      if (typeof spec === 'string') visit(Number(args[i]));
    });
  };
  visit(graph.out);
  const animated = [...used].some((index) => {
    const [op, ...args] = graph.nodes[index];
    return (
      (op === 'time' && args[0] !== 0) ||
      (op === 'scroll' && (args[1] !== 0 || args[2] !== 0)) ||
      (op === 'wave' && args[2] !== 0)
    );
  });
  return { used: used.size, total: graph.nodes.length, animated };
}

/** The prompt names primitives and types, not finished effects or effect-specific recipes. */
export const GRAPH_SYSTEM = `Generate a compact JSON shader graph. Output only {"nodes":[NODE,...],"out":INDEX}, with no spaces or Markdown.
Each NODE is ["operation",arguments...]. Node indices start at 0. The FIRST node must be ["uv"]. Each reference argument is the integer index of an EARLIER node with the required type: v=vec2 coordinate, s=scalar, c=RGB color. Numeric literal arguments come from allowed lists. Build at most 18 nodes. out must reference a color node. Create a meaningful composition, usually 8–16 nodes; use your intermediate values in the final output. Animate through scroll, time, or wave speed. Use masks/blends to add structure and dark backgrounds rather than simply coloring noise.
Operations (output type and argument specification): ${JSON.stringify(GRAPH_OPS)}
Numeric lists are literal parameter choices. Strings v/s/c mean typed node REFERENCES, never literals. Palette choices: ocean deepblue/cyan, sunset purple/orange, neon purple/magenta/cyan, fire darkred/orange/yellow, aurora darksky/green/cyan, mono black/white.
Coordinates: uv covers [0,1]^2; scale/rotate operate about (0.5,0.5); scroll adds time*(xSpeed,ySpeed); tile repeats with fract. warp displaces coordinates using the referenced scalar field and an amplitude.
Scalars: radius is distance from center; angle is atan2 around center in radians. noise/fbm return smooth values in [0,1]. circle/ring/box are soft masks: 1 inside, 0 outside. wave returns 0.5+0.5*sin(input*frequency*2pi-time*speed). sin similarly maps to [0,1]; smooth is smoothstep(0,1,input). Other scalar math is ordinary arithmetic. ramp maps a scalar into a three-stop palette. mask multiplies a color by a clamped scalar; mix blends two colors by a clamped scalar. hsv uses scalar references for hue, saturation and value. add_color and screen combine colors. Final RGB is clamped, alpha=1.
Syntax example for an unrelated simple horizontal gradient: {"nodes":[["uv"],["x",0],["ramp",1,"ocean"]],"out":2}
Generate your own connected program for the requested look. Do not copy the gradient example or produce arbitrary unused nodes.`;
