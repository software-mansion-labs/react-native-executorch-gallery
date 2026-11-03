import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const platform = process.argv[2];
if (!['android', 'ios'].includes(platform)) {
  console.error('Usage: node scripts/build-native.mjs <android|ios>');
  process.exit(1);
}
const run = (command, args, cwd = root, env = {}) =>
  execFileSync(command, args, { cwd, stdio: 'inherit', env: { ...process.env, CI: '1', ...env } });

// Generate from app.json without deleting a developer's existing native project.
run('npx', [
  '--no-install',
  'expo',
  'prebuild',
  '--platform',
  platform,
  ...(platform === 'android' ? ['--no-install'] : []),
]);
mkdirSync(resolve(root, '.artifacts', platform), { recursive: true });
if (platform === 'android') {
  run(
    './gradlew',
    [
      ':app:assembleRelease',
      '-PreactNativeArchitectures=arm64-v8a,x86_64',
      '--no-daemon',
      '--max-workers=2',
      '--console=plain',
    ],
    resolve(root, 'android'),
    { NODE_ENV: 'production' }
  );
} else {
  const projects = readdirSync(resolve(root, 'ios')).filter((name) => name.endsWith('.xcodeproj'));
  if (projects.length !== 1) throw new Error('Expected one generated iOS app project.');
  const scheme = projects[0].slice(0, -'.xcodeproj'.length);
  run(
    'xcodebuild',
    [
      '-jobs',
      '2',
      '-workspace',
      `ios/${scheme}.xcworkspace`,
      '-scheme',
      scheme,
      '-configuration',
      'Release',
      '-sdk',
      'iphonesimulator',
      '-destination',
      'generic/platform=iOS Simulator',
      '-derivedDataPath',
      '.artifacts/ios',
      'CODE_SIGNING_ALLOWED=NO',
      'ARCHS=arm64',
      'build',
    ],
    root,
    { NODE_ENV: 'production' }
  );
  // Preserve executable permissions and framework symlinks in the CI artifact.
  run('tar', [
    '-czf',
    '.artifacts/ios-simulator-app.tar.gz',
    '-C',
    '.artifacts/ios/Build/Products/Release-iphonesimulator',
    `${scheme}.app`,
  ]);
}
