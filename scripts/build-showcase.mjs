import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const media = resolve(root, 'media');
const recordings = resolve(root, process.argv[2] ?? '.artifacts/showcase/recordings');
const duration = 24;
const fps = 30;
const work = mkdtempSync(join(tmpdir(), 'gallery-showcase-'));
const panels = [
  { file: 'chat', title: 'Local chat', caption: 'A little help. Right here.' },
  { file: 'speech', title: 'Text to speech', caption: 'Words, brought to life' },
  { file: 'search', title: 'Photo search', caption: 'Find a photo with words' },
];
const width = 1920,
  height = 1220,
  phoneWidth = 350,
  screenWidth = 336,
  screenHeight = 730;
const phoneTop = 250,
  screenTop = phoneTop + 7;
const positions = panels.map((_, index) => 291 + index * 494);
const text = (x, y, size, weight, color, value, extra = '') =>
  `<text x="${x}" y="${y}" text-anchor="middle" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="${size}" font-weight="${weight}" fill="${color}" ${extra}>${value}</text>`;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <defs><filter id="shadow" x="-50%" y="-20%" width="200%" height="160%"><feGaussianBlur stdDeviation="18"/></filter></defs>
  <rect width="100%" height="100%" fill="#F7F7F9"/>
  <!-- The official mark is composited here with the app's animated light sweep. -->
  ${text(1013, 157, 70, 500, '#17171B', 'A world of ideas', 'letter-spacing="-2.6"')}
  ${text(960, 210, 28, 400, '#74747D', 'Right on your device')}
  ${panels
    .map((panel, index) => {
      const x = positions[index],
        center = x + phoneWidth / 2;
      return `<rect x="${x + 3}" y="${phoneTop + 18}" width="344" height="742" rx="50" fill="#14141C" opacity=".14" filter="url(#shadow)"/>
      <rect x="${x - 2}" y="${phoneTop + 120}" width="3" height="22" rx="1.5" fill="#28282C"/>
      <rect x="${x - 2}" y="${phoneTop + 160}" width="3" height="42" rx="1.5" fill="#28282C"/>
      <rect x="${x - 2}" y="${phoneTop + 214}" width="3" height="42" rx="1.5" fill="#28282C"/>
      <rect x="${x + phoneWidth - 1}" y="${phoneTop + 174}" width="3" height="64" rx="1.5" fill="#28282C"/>
      <rect x="${x}" y="${phoneTop}" width="${phoneWidth}" height="744" rx="51" fill="#0A0A0C" stroke="#45454A" stroke-width="1.5"/>
      ${text(center, 1050, 26, 500, '#242429', panel.title, 'letter-spacing="-.5"')}
      ${text(center, 1088, 18, 400, '#7C7C85', panel.caption)}`;
    })
    .join('')}
  ${text(960, 1170, 24, 400, '#83838C', '20+ interactive demos · iOS + Android · On-device inference')}
</svg>`;
const ffmpeg = (args) =>
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], {
    stdio: 'inherit',
  });
// Read the same dimensions and timings used by the app without importing React Native into Node.
const theme = readFileSync(resolve(root, 'src/theme.ts'), 'utf8');
function token(name) {
  const value = theme.match(new RegExp(`\\b${name}:\\s*(-?[\\d.]+)`));
  if (!value) throw new Error(`Missing theme token: ${name}`);
  return Number(value[1]);
}
const logoScale = 1.5;
const logoWidth = Math.round(token('logoWidth') * logoScale),
  logoHeight = Math.round(token('logoHeight') * logoScale);
const logoX = 663,
  logoY = 78;

// Match Animated's Easing.inOut(Easing.ease), including its cubic-bezier(0.42, 0, 1, 1).
function ease(value) {
  const cubic = (t, a, b) => 3 * (1 - t) ** 2 * t * a + 3 * (1 - t) * t ** 2 * b + t ** 3;
  let low = 0,
    high = 1;
  for (let i = 0; i < 20; i++) {
    const mid = (low + high) / 2;
    if (cubic(mid, 0.42, 1) < value) low = mid;
    else high = mid;
  }
  return cubic((low + high) / 2, 0, 1);
}
function inOut(value) {
  return value < 0.5 ? ease(value * 2) / 2 : 1 - ease((1 - value) * 2) / 2;
}

try {
  const background = join(work, 'board.png'),
    mask = join(work, 'mask.png');
  const logo = await sharp(resolve(root, 'assets/images/logo-hero.svg'))
    .resize(logoWidth, logoHeight)
    .png()
    .toBuffer();
  const { data: logoPixels } = await sharp(logo)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const frameBytes = logoWidth * logoHeight * 4;
  const shine = Buffer.alloc(frameBytes * fps * duration);
  const first = token('logoShineFirstDelay') / 1000,
    interval = token('logoShineInterval') / 1000;
  const sweep = token('logoShineDuration') / 1000;
  for (let frame = 0; frame < fps * duration; frame++) {
    const time = frame / fps;
    if (time < first) continue;
    const elapsed = (time - first) % interval;
    if (elapsed >= sweep) continue;
    const position =
      logoScale *
      (token('travelStart') + (token('travelEnd') - token('travelStart')) * inOut(elapsed / sweep));
    for (let y = 0; y < logoHeight; y++)
      for (let x = 0; x < logoWidth; x++) {
        const localX = x + 0.5 - position;
        if (localX < 0 || localX > logoWidth) continue;
        // The app's white 0 / 0.38 / 0 gradient runs from (0, 0) to (1, 0.3).
        const gradient = (localX / logoWidth + (0.3 * (y + 0.5)) / logoHeight) / 1.09;
        const opacity = 0.38 * Math.max(0, 1 - Math.abs(2 * gradient - 1));
        const pixel = (y * logoWidth + x) * 4,
          offset = frame * frameBytes + pixel;
        shine[offset] = shine[offset + 1] = shine[offset + 2] = 255;
        shine[offset + 3] = Math.round(logoPixels[pixel + 3] * opacity);
      }
  }
  const shinePath = join(work, 'logo-shine.rgba');
  writeFileSync(shinePath, shine);
  const board = svg.replace(
    "<!-- The official mark is composited here with the app's animated light sweep. -->",
    `<image x="${logoX}" y="${logoY}" width="${logoWidth}" height="${logoHeight}" href="data:image/png;base64,${logo.toString('base64')}"/>`
  );
  await sharp(Buffer.from(board)).png().toFile(background);
  await sharp(
    Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${screenWidth}" height="${screenHeight}"><rect width="100%" height="100%" fill="black"/><rect width="100%" height="100%" rx="45" fill="white"/></svg>`
    )
  )
    .png()
    .toFile(mask);
  const inputs = ['-loop', '1', '-framerate', String(fps), '-i', background];
  for (const panel of panels)
    inputs.push('-stream_loop', '-1', '-i', resolve(recordings, `${panel.file}.mp4`));
  inputs.push(
    '-loop',
    '1',
    '-framerate',
    String(fps),
    '-i',
    mask,
    '-f',
    'rawvideo',
    '-pixel_format',
    'rgba',
    '-video_size',
    `${logoWidth}x${logoHeight}`,
    '-framerate',
    String(fps),
    '-i',
    shinePath
  );
  const filters = [
    `[${panels.length + 1}:v]format=gray,split=${panels.length}${panels.map((_, index) => `[m${index}]`).join('')}`,
  ];
  panels.forEach((_, index) => {
    filters.push(
      `[${index + 1}:v]fps=${fps},scale=${screenWidth}:${screenHeight},setsar=1,format=rgb24[v${index}]`
    );
    filters.push(`[v${index}][m${index}]alphamerge[s${index}]`);
    filters.push(
      `[${index ? `b${index - 1}` : '0:v'}][s${index}]overlay=${positions[index] + 7}:${screenTop}:shortest=1[b${index}]`
    );
  });
  filters.push(
    `[b${panels.length - 1}][${panels.length + 2}:v]overlay=${logoX}:${logoY}:shortest=1[out]`
  );
  const master = join(work, 'showcase.mp4');
  ffmpeg([
    ...inputs,
    '-filter_complex_threads',
    '1',
    '-filter_complex',
    filters.join(';'),
    '-map',
    '[out]',
    '-t',
    String(duration),
    '-an',
    '-c:v',
    'libx264',
    '-preset',
    'medium',
    '-crf',
    '17',
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    master,
  ]);
  const frames = join(work, 'frames');
  mkdirSync(frames);
  ffmpeg([
    '-i',
    master,
    '-vf',
    'fps=24,scale=1440:-2:flags=lanczos',
    '-compression_level',
    '1',
    join(frames, 'frame-%04d.png'),
  ]);
  const webp = ['-loop', '0', '-lossy', '-q', '90', '-m', '4'];
  readdirSync(frames)
    .sort()
    .forEach((file, index) => {
      const delay = Math.round(((index + 1) * 1000) / 24) - Math.round((index * 1000) / 24);
      webp.push('-d', String(delay), join(frames, file));
    });
  webp.push('-o', resolve(media, 'showcase.webp'));
  execFileSync('img2webp', webp, { stdio: 'inherit' });
  console.log('Built media/showcase.webp (24 fps, 1440px).');
} finally {
  rmSync(work, { recursive: true, force: true });
}
