import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';
import ts from 'typescript';

// Pure-language tests and a synchronous mask adapter, not native inference evidence.
const cache = new Map();
function load(path) {
  const absolute = resolve(import.meta.dirname, '..', path);
  if (cache.has(absolute)) return cache.get(absolute);
  const module = { exports: {} };
  cache.set(absolute, module.exports);
  const code = ts.transpileModule(readFileSync(absolute, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const require = (name) => {
    if (name === 'react-native-worklets')
      return {
        createSynchronizable: (value) => ({
          getBlocking: () => value,
          setBlocking: (next) => {
            value = next;
          },
        }),
      };
    assert.ok(name.startsWith('@/'), name);
    return load(`src/${name.slice(2)}.ts`);
  };
  new Function('require', 'module', 'exports', code)(require, module, module.exports);
  return module.exports;
}
const graph = load('src/lib/shader-chat/shader-graph.ts');
const valid = { nodes: [['uv'], ['noise', 0, 4], ['ramp', 1, 'fire']], out: 2 };

test('typed parser and compiler accept every supported primitive with legal reference types', () => {
  for (const [op, spec] of Object.entries(graph.GRAPH_OPS)) {
    const nodes = [['uv'], ['constant', 0.5], ['rgb', 0.1, 0.25, 0.5]];
    const values = spec.args.map((arg) =>
      typeof arg === 'string' ? { v: 0, s: 1, c: 2 }[arg] : arg.at(-1)
    );
    nodes.push([op, ...values]);
    let out = 3;
    if (spec.out === 'v') {
      nodes.push(['noise', 3, 4], ['ramp', 4, 'neon']);
      out = 5;
    }
    if (spec.out === 's') {
      nodes.push(['ramp', 3, 'neon']);
      out = 4;
    }
    const value = { nodes, out };
    const source = JSON.stringify(value);
    assert.deepEqual(graph.parseShaderGraph(source), value, op);
    assert.equal(graph.advanceGraph(graph.initialGraphCursor(), source)?.phase, 5, op);
    assert.ok(graph.compileShaderGraph(value).includes('fn graphColor'), op);
  }
});

test('forward/cyclic refs, wrong types, source injection, unknown fields and oversized graphs fail', () => {
  for (const value of [
    { ...valid, out: 0 },
    { ...valid, out: -1 },
    { ...valid, code: 'while(true){}' },
    { nodes: [['uv'], ['noise', 1, 4], ['ramp', 1, 'fire']], out: 2 },
    { nodes: [['uv'], ['constant', 0.5], ['noise', 1, 4], ['ramp', 2, 'fire']], out: 3 },
    { nodes: [['uv'], ['rgb', 0, 0, Infinity]], out: 1 },
    { nodes: [['uv'], ['rgb', 0, 0, 0], ['unknown);discard', 0]], out: 1 },
    { nodes: [['uv'], ...Array.from({ length: 18 }, () => ['rgb', 0, 0, 0])], out: 1 },
  ])
    assert.throws(() => graph.parseShaderGraph(JSON.stringify(value)));
});

test('unused time is reported as still; connected animation is reported as animated', () => {
  assert.deepEqual(
    graph.describeShaderGraph({
      nodes: [['uv'], ['time', 1], ['x', 0], ['ramp', 2, 'neon']],
      out: 3,
    }),
    { used: 3, total: 4, animated: false }
  );
  assert.equal(
    graph.describeShaderGraph({
      nodes: [['uv'], ['scroll', 0, 0.25, 0], ['noise', 1, 4], ['ramp', 2, 'fire']],
      out: 3,
    }).animated,
    true
  );
});
