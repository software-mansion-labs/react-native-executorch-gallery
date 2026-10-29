import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, renameSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const gallery = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const workspace = resolve(gallery, process.argv[2] ?? '../react-native-executorch');
const source = resolve(workspace, 'packages/react-native-executorch');
const manifest = JSON.parse(readFileSync(resolve(source, 'package.json'), 'utf8'));
if (manifest.name !== 'react-native-executorch') {
  throw new Error(`Expected the react-native-executorch package at ${source}`);
}

const destination = resolve(gallery, '.local-packages');
mkdirSync(destination, { recursive: true });

// Rebuild generated JS and declarations before taking a package snapshot.
// The sibling workspace needs its own Yarn dependencies installed first.
execFileSync('npm', ['run', 'prepare'], { cwd: source, stdio: 'inherit' });
const packed = JSON.parse(
  execFileSync('npm', ['pack', '--ignore-scripts', '--json', '--pack-destination', destination], {
    cwd: source,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  })
)[0];
const archive = resolve(destination, packed.filename);
const hash = createHash('sha256').update(readFileSync(archive)).digest('hex').slice(0, 12);
const snapshot = resolve(destination, `react-native-executorch-${manifest.version}-${hash}.tgz`);
renameSync(archive, snapshot);

// A new content-addressed path prevents npm reusing a cached same-version build.
// Installing a tarball exercises package exports, postinstall, and native autolinking.
execFileSync('npm', ['install', '--save-exact', `./${relative(gallery, snapshot)}`], {
  cwd: gallery,
  stdio: 'inherit',
});
console.log(`\nInstalled ${manifest.name}@${manifest.version} from ${source}`);
console.log('Rebuild the native app after changing library native code.');
