import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';
import ts from 'typescript';

// Only pure config/grammar modules are loaded; native inference is verified separately.
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
    assert.ok(name.startsWith('@/'), `Unexpected dependency: ${name}`);
    return load(`src/${name.slice(2)}.ts`);
  };
  new Function('require', 'module', 'exports', code)(require, module, module.exports);
  return module.exports;
}
const { parseShaderConfig } = load('src/lib/shader-chat/shader-config.ts');
const { createShaderGrammar } = load('src/lib/shader-chat/shader-grammar.ts');
const grammar = createShaderGrammar();
const valid = { effect: 'checker', palette: 'mono', speed: 0, scale: 8, intensity: 1, rotation: 0 };

function accepts(source) {
  let current = [grammar.start];
  for (const character of source) {
    const code = character.charCodeAt(0);
    current = [
      ...new Set(
        current.flatMap((state) =>
          grammar.states[state].edges
            .filter((edge) => code >= edge.min && code <= edge.max)
            .map((edge) => edge.to)
        )
      ),
    ];
    if (!current.length) return false;
  }
  return current.includes(grammar.end);
}

test('every effect has a complete grammar path and parses into bounded settings', () => {
  for (const effect of ['ripples', 'interference', 'stripes', 'checker', 'disk', 'gradient']) {
    const source = JSON.stringify({ ...valid, effect });
    assert.ok(accepts(source), effect);
    assert.deepEqual(parseShaderConfig(source), { ...valid, effect });
  }
});

test('grammar and parser reject executable content, unsupported effects, and out-of-range settings', () => {
  for (const patch of [
    { effect: 'custom' },
    { palette: 'red' },
    { speed: -1 },
    { speed: 100 },
    { scale: 0 },
    { intensity: 2 },
    { rotation: 360 },
    { code: 'while(true){}' },
  ]) {
    const source = JSON.stringify({ ...valid, ...patch });
    assert.equal(accepts(source), false, source);
    assert.throws(() => parseShaderConfig(source), undefined, source);
  }
});

test('incomplete and malformed responses are never renderable', () => {
  const complete = JSON.stringify(valid);
  for (const source of [
    complete.slice(0, -1),
    'null',
    '[]',
    '{}',
    '```json\n' + complete + '\n```',
  ]) {
    assert.equal(accepts(source), false);
    assert.throws(() => parseShaderConfig(source));
  }
});
