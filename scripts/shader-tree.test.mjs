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
const tree = load('src/lib/shader-chat/shader-tree.ts');
const graph = load('src/lib/shader-chat/shader-graph.ts');
const { treeConstraints } = load('src/lib/shader-chat/tree-constraints.ts');
const { createGrammarTokens } = load('src/lib/widget-builder/widget-token-trie.ts');
const sample = {
  color: [
    'mask',
    ['ramp', ['wave', ['radius', ['uv']], 8, 1], 'neon'],
    ['ring', ['uv'], 0.3, 0.05],
  ],
};

test('nested programs lower automatically with every authored operation reachable', () => {
  const raw = JSON.stringify(sample);
  const parsed = tree.parseShaderTree(raw);
  const cursor = tree.advanceTree(tree.initialTreeCursor(), raw);
  assert.equal(cursor.tasks.length, 0);
  assert.ok(cursor.count <= 17);
  const lowered = tree.lowerShaderTree(parsed);
  const info = graph.describeShaderGraph(lowered);
  assert.equal(info.used, info.total);
  assert.equal(info.animated, true);
  assert.ok(tree.compileShaderTree(parsed).includes('fn graphColor'));
});

test('nested parser rejects wrong child types, literal node references, extra fields and excess operations', () => {
  let nested = ['uv'];
  for (let i = 0; i < 18; i++) nested = ['rotate', nested, 45];
  for (const value of [
    { color: ['ramp', 0, 'neon'] },
    { color: ['mask', ['uv'], ['constant', 1]] },
    { color: ['rgb', 0, 0, 0], code: 'WGSL' },
    { color: ['ramp', ['x', nested], 'fire'] },
  ]) {
    assert.throws(() => tree.parseShaderTree(JSON.stringify(value)));
    const end = tree.advanceTree(tree.initialTreeCursor(), JSON.stringify(value));
    assert.ok(!end || end.tasks.length > 0);
  }
});

test('whole-token masking accepts nested boundaries and forbids a coordinate in a scalar slot', () => {
  const pieces = [
    '{"color":',
    '["ramp",',
    '["uv"]',
    '["noise",',
    '["uv"],',
    '4]',
    ',',
    '"fire"]',
    '}',
    '\n',
  ];
  const mask = treeConstraints(createGrammarTokens(pieces));
  const generatedTokens = [];
  for (const id of [0, 1]) {
    assert.ok([...mask({ generatedTokens }).allowedTokens].includes(id));
    generatedTokens.push(id);
  }
  assert.equal([...mask({ generatedTokens }).allowedTokens].includes(2), false);
  for (const id of [3, 4, 5, 6, 7, 8]) {
    assert.ok([...mask({ generatedTokens }).allowedTokens].includes(id), pieces[id]);
    generatedTokens.push(id);
  }
  assert.ok([...mask({ generatedTokens }).allowedTokens].includes(9));
});
