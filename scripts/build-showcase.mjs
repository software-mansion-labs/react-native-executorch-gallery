import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

import { iphoneFrame } from './lib/iphone-frame.mjs';

// Capture with models loaded and the keyboard dismissed. Requires FFmpeg and img2webp.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const recordings = resolve(root, process.argv[2] ?? '.artifacts/showcase/recordings');
const output = resolve(root, '.github/assets');
const fps = 30;
const frame = iphoneFrame(360);
mkdirSync(output, { recursive: true });
for (const demo of ['chat', 'speech', 'search']) {
  const duration = Number(
    execFileSync(
      'ffprobe',
      [
        '-v',
        'error',
        '-show_entries',
        'format=duration',
        '-of',
        'csv=p=0',
        resolve(recordings, `${demo}.mp4`),
      ],
      { encoding: 'utf8' }
    ).trim()
  );
  if (!Number.isFinite(duration) || duration <= 0) throw new Error(`Invalid duration for ${demo}`);
  const hold = demo === 'chat' ? 4 : 2;
  const work = mkdtempSync(join(tmpdir(), `gallery-${demo}-`));
  try {
    const board = join(work, 'phone.png');
    const mask = join(work, 'mask.png');
    const frames = join(work, 'frames');
    mkdirSync(frames);
    await sharp(frame.svg).png().toFile(board);
    await sharp(frame.mask).flatten({ background: '#000' }).png().toFile(mask);
    const filters = [
      `[0:v]fps=${fps},scale=${frame.screen.width}:${frame.screen.height}:flags=lanczos,setsar=1,format=rgba[v]`,
      '[1:v]format=gray[m]',
      '[v][m]alphamerge=shortest=1[s]',
      '[2:v]format=rgba[b]',
      `[b][s]overlay=${frame.screen.left}:${frame.screen.top}:format=auto:shortest=1,format=rgba,tpad=stop_mode=clone:stop_duration=${hold}[out]`,
    ];
    execFileSync(
      'ffmpeg',
      [
        '-hide_banner',
        '-loglevel',
        'error',
        '-y',
        '-i',
        resolve(recordings, `${demo}.mp4`),
        '-framerate',
        String(fps),
        '-loop',
        '1',
        '-i',
        mask,
        '-framerate',
        String(fps),
        '-loop',
        '1',
        '-i',
        board,
        '-filter_complex_threads',
        '1',
        '-filter_complex',
        filters.join(';'),
        '-map',
        '[out]',
        '-t',
        String(duration + hold),
        join(frames, 'frame-%04d.png'),
      ],
      { stdio: 'inherit' }
    );
    // Lossless frames preserve text and avoid compression artifacts around moving glyphs.
    const args = ['-loop', '0', '-lossless', '-m', '4'];
    readdirSync(frames)
      .sort()
      .forEach((file, index) => {
        const delay = Math.round(((index + 1) * 1000) / fps) - Math.round((index * 1000) / fps);
        args.push('-d', String(delay), join(frames, file));
      });
    args.push('-o', resolve(output, `${demo}.webp`));
    execFileSync('img2webp', args, { stdio: 'inherit' });
    console.log(`Built .github/assets/${demo}.webp (${fps} fps, framed).`);
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}
