import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const scripts = dirname(fileURLToPath(import.meta.url));
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'gallery-version-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'scripts'));
  mkdirSync(join(root, 'bin'));
  cpSync(join(scripts, 'select-executorch.mjs'), join(root, 'scripts/select-executorch.mjs'));
  const initial = { source: 'local', path: '../working-library' };
  writeFileSync(join(root, 'package.json'), JSON.stringify({ dependencies: {} }));
  writeFileSync(join(root, 'package-lock.json'), 'fixture lockfile');
  writeFileSync(join(root, 'executorch.json'), JSON.stringify(initial));
  writeFileSync(
    join(root, 'state.json'),
    JSON.stringify({ version: '1.2.3', commit: 'a'.repeat(40) })
  );
  const mock = `#!${process.execPath}
const fs = require('node:fs'), path = require('node:path');
const root = process.env.FIXTURE_ROOT, args = process.argv.slice(2), command = path.basename(process.argv[1]);
const state = JSON.parse(fs.readFileSync(path.join(root,'state.json')));
fs.appendFileSync(path.join(root,'calls.jsonl'),JSON.stringify({command,args,cwd:process.cwd()})+'\\n');
if (command === 'npm') {
 if (args[0] === 'run' && args[1] === 'prepare' && state.inspectBuild) {
  const config=fs.readFileSync(path.join(process.cwd(),'tsconfig.build.json'),'utf8');
  fs.writeFileSync(path.join(root,'prepared-config.json'),config);
  if (state.failPrepare) process.exit(1);
 }
 if (args[0] === 'view') console.log(JSON.stringify(state.version));
 if ((args[0] === 'install' || args[0] === 'ci') && state.failInstall) process.exit(1);
 if (args[0] === 'install') {
  const spec=args.at(-1), manifest={dependencies:{'react-native-executorch':spec.startsWith('./')?'file:'+spec.slice(2):spec.split('@').at(-1)}};
  fs.writeFileSync(path.join(root,'package.json'),JSON.stringify(manifest));
 }
 if (args[0] === 'pack') {
  const filename='react-native-executorch-1.2.3.tgz';
  fs.writeFileSync(path.join(args[args.indexOf('--pack-destination')+1],filename),'test package contents');
  console.log(JSON.stringify([{filename}]));
 }
}
if (command === 'git') {
 if (args[0] === 'clone') {
  const cache=args.at(-1); fs.mkdirSync(path.join(cache,'.git'),{recursive:true});
  const pkg=path.join(cache,'packages/react-native-executorch');fs.mkdirSync(pkg,{recursive:true});
  fs.writeFileSync(path.join(pkg,'package.json'),JSON.stringify({name:'react-native-executorch',version:'1.2.3'}));
 }
 if (args[0] === 'status' && state.dirty) console.log(' M tracked-file');
 if (args[0] === 'fetch') fs.writeFileSync(path.join(root,'fetched'),/^[a-f0-9]{40}$/.test(args.at(-1))?args.at(-1):state.commit);
 if (args[0] === 'rev-parse') console.log(fs.readFileSync(path.join(root,'fetched'),'utf8'));
}
`;
  for (const name of ['npm', 'git', 'corepack'])
    writeFileSync(join(root, 'bin', name), mock, { mode: 0o755 });
  const env = {
    ...process.env,
    FIXTURE_ROOT: root,
    PATH: `${join(root, 'bin')}:${process.env.PATH}`,
  };
  return {
    root,
    initial,
    run: (...args) =>
      spawnSync(process.execPath, [join(root, 'scripts/select-executorch.mjs'), ...args], {
        env,
        encoding: 'utf8',
      }),
    config: () => JSON.parse(readFileSync(join(root, 'executorch.json'))),
    state: (value) => writeFileSync(join(root, 'state.json'), JSON.stringify(value)),
    calls: () => readFileSync(join(root, 'calls.jsonl'), 'utf8').trim().split('\n').map(JSON.parse),
  };
}

test('npm tags resolve to exact versions and install with save-exact', (t) => {
  const f = fixture(t);
  const result = f.run('npm', 'latest');
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(f.config(), { source: 'npm', version: '1.2.3' });
  assert.ok(
    f
      .calls()
      .some(
        (call) =>
          call.command === 'npm' &&
          call.args.join(' ') === 'install --save-exact react-native-executorch@1.2.3'
      )
  );
});
test('a failed install does not replace the recorded selection', (t) => {
  const f = fixture(t);
  f.state({ version: '1.2.3', failInstall: true });
  assert.notEqual(f.run('npm', 'latest').status, 0);
  assert.deepEqual(f.config(), f.initial);
});
test('Git mode pins a commit; sync does not follow the moving branch', (t) => {
  const f = fixture(t);
  let result = f.run('git', 'main');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(f.config().commit, 'a'.repeat(40));
  f.state({ version: '1.2.3', commit: 'b'.repeat(40) });
  rmSync(join(f.root, '.local-packages'), { recursive: true });
  result = f.run('sync');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(f.config().commit, 'a'.repeat(40));
  assert.equal(
    f
      .calls()
      .filter((call) => call.command === 'git' && call.args[0] === 'fetch')
      .at(-1)
      .args.at(-1),
    'a'.repeat(40)
  );
  result = f.run('git', 'main');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(f.config().commit, 'b'.repeat(40));
});
test('edited Git checkouts are preserved instead of reset', (t) => {
  const f = fixture(t);
  assert.equal(f.run('git', 'main').status, 0);
  f.state({ commit: 'b'.repeat(40), dirty: true });
  const before = f.calls().length;
  const result = f.run('git', 'main');
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /checkout has changes/);
  assert.equal(f.config().commit, 'a'.repeat(40));
  assert.ok(
    !f
      .calls()
      .slice(before)
      .some((call) => ['checkout', 'fetch'].includes(call.args[0]))
  );
});
test('local mode packs a content-addressed snapshot from a path with spaces', (t) => {
  const f = fixture(t),
    workspace = join(f.root, 'my library'),
    pkg = join(workspace, 'packages/react-native-executorch');
  mkdirSync(pkg, { recursive: true });
  writeFileSync(
    join(pkg, 'package.json'),
    JSON.stringify({ name: 'react-native-executorch', version: '1.2.3' })
  );
  const result = f.run('local', workspace);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(f.config().path, workspace);
  assert.ok(
    f
      .calls()
      .some(
        (call) =>
          call.command === 'npm' &&
          call.args[0] === 'install' &&
          /react-native-executorch-1\.2\.3-[a-f0-9]{12}\.tgz$/.test(call.args.at(-1))
      )
  );
});

test('snapshot builds exclude native submodule TypeScript and restore source config on success or failure', (t) => {
  const f = fixture(t);
  const workspace = join(f.root, 'library');
  const pkg = join(workspace, 'packages/react-native-executorch');
  mkdirSync(pkg, { recursive: true });
  writeFileSync(
    join(pkg, 'package.json'),
    JSON.stringify({ name: 'react-native-executorch', version: '1.2.3' })
  );
  const config = '{ "extends": "./tsconfig", "exclude": ["lib", "__tests__"] }\n';
  writeFileSync(join(pkg, 'tsconfig.build.json'), config);
  for (const failPrepare of [false, true]) {
    f.state({ inspectBuild: true, failPrepare });
    const result = f.run('local', workspace);
    assert.equal(result.status === 0, !failPrepare, result.stderr);
    assert.deepEqual(
      JSON.parse(readFileSync(join(f.root, 'prepared-config.json'), 'utf8')).exclude,
      ['lib', '__tests__', 'third-party']
    );
    assert.equal(readFileSync(join(pkg, 'tsconfig.build.json'), 'utf8'), config);
  }
});
test('invalid sources, missing refs, and npm ranges fail without changing the selection', (t) => {
  const f = fixture(t);
  for (const args of [['git'], ['git', '--bad'], ['npm'], ['unknown']]) {
    assert.notEqual(f.run(...args).status, 0);
    assert.deepEqual(f.config(), f.initial);
  }
  f.state({ version: ['1.2.3', '1.2.4'] });
  assert.notEqual(f.run('npm', '^1').status, 0);
  assert.deepEqual(f.config(), f.initial);
});

test('sync reuses a restored archive and runs npm ci without rewriting manifests', (t) => {
  const f = fixture(t);
  assert.equal(f.run('git', 'main').status, 0);
  const names = ['executorch.json', 'package.json', 'package-lock.json'];
  const before = names.map((name) => readFileSync(join(f.root, name), 'utf8'));
  const calls = f.calls().length;
  const result = f.run('sync');
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(
    names.map((name) => readFileSync(join(f.root, name), 'utf8')),
    before
  );
  assert.deepEqual(
    f
      .calls()
      .slice(calls)
      .map(({ command, args }) => [command, args]),
    [['npm', ['ci']]]
  );
});

test('npm sync uses the exact recorded selection without querying a moving tag', (t) => {
  const f = fixture(t);
  assert.equal(f.run('npm', 'latest').status, 0);
  f.state({ version: '9.9.9' });
  const calls = f.calls().length;
  assert.equal(f.run('sync').status, 0);
  assert.deepEqual(
    f
      .calls()
      .slice(calls)
      .map(({ command, args }) => [command, args]),
    [['npm', ['ci']]]
  );
});

test('sync rejects source drift and propagates frozen install failures', (t) => {
  const f = fixture(t);
  assert.equal(f.run('git', 'main').status, 0);
  const before = readFileSync(join(f.root, 'package.json'), 'utf8');
  const manifest = JSON.parse(before);
  manifest.dependencies['react-native-executorch'] =
    'file:.local-packages/react-native-executorch-other.tgz';
  writeFileSync(join(f.root, 'package.json'), JSON.stringify(manifest));
  const result = f.run('sync');
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /differs from the recorded dependency/);
  writeFileSync(join(f.root, 'package.json'), before);
  f.state({ failInstall: true });
  assert.notEqual(f.run('sync').status, 0);
  assert.equal(readFileSync(join(f.root, 'package.json'), 'utf8'), before);
});
