import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  writeFileSync,
} from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const gallery = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const configPath = resolve(gallery, 'executorch.json');
const repository = 'https://github.com/software-mansion/react-native-executorch.git';
const run = (command, args, cwd = gallery) =>
  execFileSync(command, args, { cwd, stdio: 'inherit' });
const output = (command, args, cwd = gallery) =>
  execFileSync(command, args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  }).trim();

function readConfig() {
  return JSON.parse(readFileSync(configPath, 'utf8'));
}

function packLocal(workspace, install = true) {
  const source = resolve(workspace, 'packages/react-native-executorch');
  const manifest = JSON.parse(readFileSync(resolve(source, 'package.json'), 'utf8'));
  if (manifest.name !== 'react-native-executorch')
    throw new Error(`No ExecuTorch package at ${source}`);
  const destination = resolve(gallery, '.local-packages');
  mkdirSync(destination, { recursive: true });
  // Recursive native submodules can contain unrelated TypeScript projects. Keep
  // them out of declaration generation, restoring the source config before pack.
  const buildConfig = resolve(source, 'tsconfig.build.json');
  const original = existsSync(buildConfig) ? readFileSync(buildConfig, 'utf8') : undefined;
  try {
    if (original) {
      const config = JSON.parse(original);
      config.exclude = [...(config.exclude ?? []), 'third-party'];
      writeFileSync(buildConfig, `${JSON.stringify(config, null, 2)}\n`);
    }
    run('npm', ['run', 'prepare'], source);
  } finally {
    if (original !== undefined) writeFileSync(buildConfig, original);
  }
  const [packed] = JSON.parse(
    output('npm', ['pack', '--ignore-scripts', '--json', '--pack-destination', destination], source)
  );
  const archive = resolve(destination, packed.filename);
  const hash = createHash('sha256').update(readFileSync(archive)).digest('hex').slice(0, 12);
  const snapshot = resolve(destination, `react-native-executorch-${manifest.version}-${hash}.tgz`);
  renameSync(archive, snapshot);
  const dependency = `file:${relative(gallery, snapshot)}`;
  if (install) run('npm', ['install', '--save-exact', `./${relative(gallery, snapshot)}`]);
  return dependency;
}

function checkoutGit(config, install = true) {
  const ref = config.commit ?? config.ref;
  if (typeof ref !== 'string' || !ref || ref.startsWith('-'))
    throw new Error('Choose a Git branch, tag, or commit.');
  const repo = config.repository ?? repository;
  const cache = resolve(
    gallery,
    '.executorch',
    createHash('sha256').update(repo).digest('hex').slice(0, 12)
  );
  mkdirSync(dirname(cache), { recursive: true });
  const fresh = !existsSync(resolve(cache, '.git'));
  if (fresh) run('git', ['clone', '--filter=blob:none', repo, cache]);
  if (!fresh && output('git', ['status', '--porcelain', '--untracked-files=no'], cache)) {
    throw new Error(
      `Source checkout has changes: ${cache}. Use local mode to build an edited checkout.`
    );
  }
  run('git', ['fetch', '--depth=1', 'origin', ref], cache);
  const commit = output('git', ['rev-parse', 'FETCH_HEAD'], cache);
  run('git', ['checkout', '--detach', commit], cache);
  // Native speech code is supplied by a pinned submodule and must be inside the packed snapshot.
  run('git', ['submodule', 'update', '--init', '--recursive'], cache);
  // Corepack reads the source repository's own packageManager pin.
  run('corepack', ['yarn', 'install', '--immutable'], cache);
  const dependency = packLocal(cache, install);
  return { config: { ...config, repository: repo, commit }, dependency };
}

/** Restores the recorded snapshot without resolving versions or rewriting tracked manifests. */
function syncSelection(config) {
  const manifest = JSON.parse(readFileSync(resolve(gallery, 'package.json'), 'utf8'));
  const dependency = manifest.dependencies['react-native-executorch'];
  if (config.source === 'npm') {
    if (dependency !== config.version || !/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(config.version))
      throw new Error('The npm selection must match the exact version in package.json.');
  } else if (config.source === 'git' || config.source === 'local') {
    if (!/^file:\.local-packages\/react-native-executorch-[\w.+-]+\.tgz$/.test(dependency))
      throw new Error('Expected a recorded .local-packages snapshot in package.json.');
    if (config.source === 'git' && !/^[a-f0-9]{40}$/.test(config.commit ?? ''))
      throw new Error('Git sync requires a pinned commit. Select the Git source again.');
    if (!existsSync(resolve(gallery, dependency.slice('file:'.length)))) {
      const restored =
        config.source === 'git'
          ? checkoutGit(config, false).dependency
          : packLocal(resolve(gallery, config.path), false);
      if (restored !== dependency)
        throw new Error(
          'Rebuilt snapshot differs from the recorded dependency. Use deps:use to select and commit the new snapshot.'
        );
    }
  } else throw new Error(`Unknown source in executorch.json: ${config.source}`);
  // npm ci checks lockfile consistency and archive integrity, and never updates the lockfile.
  run('npm', ['ci']);
}

/** Selects an npm release, managed Git snapshot, or existing editable monorepo; persists only successful installs. */
export function selectExecutorch(args) {
  const [mode = 'status', value, extra] = args;
  if (mode === '--help' || mode === 'help') {
    console.log(`Usage:
  npm run deps:use -- npm <version-or-tag>   Install an exact published version (or resolve latest/next)
  npm run deps:use -- git <branch/tag/SHA>   Build source and pin its resolved commit
  npm run deps:use -- local [path]          Build an existing monorepo (default: ../react-native-executorch)
  npm run deps:sync                         Reinstall the choice in executorch.json
  npm run deps:status                       Show the selection and installed version

Git mode uses a managed, gitignored checkout, without editing your local library repository.
Selecting a Git ref again updates its pin. Sync always uses the recorded commit.
Commit executorch.json, package.json, and package-lock.json together after switching.`);
    return;
  }
  if (mode === 'status') {
    console.log(JSON.stringify(readConfig(), null, 2));
    const installed = resolve(gallery, 'node_modules/react-native-executorch/package.json');
    console.log(
      `Installed: ${existsSync(installed) ? JSON.parse(readFileSync(installed, 'utf8')).version : 'not installed'}`
    );
    return;
  }
  if (extra || !['sync', 'npm', 'git', 'local'].includes(mode) || (mode === 'sync' && value)) {
    throw new Error('Invalid selection. Run npm run deps:use -- --help.');
  }
  if (mode === 'sync') {
    syncSelection(readConfig());
    return;
  }
  let config = {
    source: mode,
    ...(mode === 'local'
      ? { path: value ?? '../react-native-executorch' }
      : mode === 'git'
        ? { ref: value }
        : { version: value }),
  };
  if (config.source === 'npm') {
    if (typeof config.version !== 'string' || !config.version || config.version.startsWith('-'))
      throw new Error('Choose an npm version or dist-tag.');
    const version = JSON.parse(
      output('npm', ['view', `react-native-executorch@${config.version}`, 'version', '--json'])
    );
    if (typeof version !== 'string')
      throw new Error('Use one exact npm version or dist-tag, not a range.');
    run('npm', ['install', '--save-exact', `react-native-executorch@${version}`]);
    config = { source: 'npm', version };
  } else if (config.source === 'git') {
    config = checkoutGit(config).config;
  } else if (config.source === 'local') {
    if (typeof config.path !== 'string' || !config.path)
      throw new Error('Choose a local monorepo path.');
    packLocal(resolve(gallery, config.path));
  } else {
    throw new Error(`Unknown source in executorch.json: ${config.source}`);
  }
  writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
  console.log(
    '\nSaved library selection to executorch.json. Rebuild the native app after switching versions.'
  );
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    selectExecutorch(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
