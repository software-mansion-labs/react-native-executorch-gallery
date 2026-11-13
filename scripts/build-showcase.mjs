import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Record each interaction with its model already loaded; leave a short hold on the result.
// Requires FFmpeg and img2webp. Pass a recordings directory to override the local captures.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const recordings = resolve(root, process.argv[2] ?? '.artifacts/showcase/recordings');
const output = resolve(root, '.github/assets');
const fps = 20;
mkdirSync(output, { recursive: true });
for (const demo of ['chat', 'speech', 'search']) {
  const frames = mkdtempSync(join(tmpdir(), `gallery-${demo}-`));
  try {
    execFileSync(
      'ffmpeg',
      [
        '-hide_banner',
        '-loglevel',
        'error',
        '-y',
        '-i',
        resolve(recordings, `${demo}.mp4`),
        '-vf',
        `fps=${fps},scale=640:-2:flags=lanczos${demo === 'chat' ? ',tpad=stop_mode=clone:stop_duration=4' : ''}`,
        join(frames, 'frame-%04d.png'),
      ],
      { stdio: 'inherit' }
    );
    const args = ['-loop', '0', '-lossy', '-q', '85', '-m', '4'];
    for (const frame of readdirSync(frames).sort()) {
      args.push('-d', String(1000 / fps), join(frames, frame));
    }
    args.push('-o', resolve(output, `${demo}.webp`));
    execFileSync('img2webp', args, { stdio: 'inherit' });
    console.log(`Built .github/assets/${demo}.webp (${fps} fps, 640px).`);
  } finally {
    rmSync(frames, { recursive: true, force: true });
  }
}
