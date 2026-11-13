import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const input = resolve(root, process.argv[2] ?? '.artifacts/showcase/screenshots');
const output = resolve(root, '.github/assets/banner.webp');
const panels = ['home', 'tasks', 'search'];
const width = 1600;
const screenWidth = 420;
const screenHeight = 913;
const top = 238;
const positions = [100, 590, 1080];
const background =
  Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="1230">
  <rect width="100%" height="100%" fill="#F7F7F9"/>
  <text x="800" y="100" text-anchor="middle" font-family="Helvetica Neue, Arial, sans-serif" font-size="62" font-weight="600" fill="#17171B">React Native ExecuTorch Gallery</text>
  <text x="800" y="160" text-anchor="middle" font-family="Helvetica Neue, Arial, sans-serif" font-size="32" fill="#52525B">Explore on-device AI. Private. Offline. In your pocket.</text>
  ${positions.map((x) => `<rect x="${x - 7}" y="${top - 7}" width="${screenWidth + 14}" height="${screenHeight + 14}" rx="59" fill="#202026"/>`).join('')}
</svg>`);
const mask = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${screenWidth}" height="${screenHeight}"><rect width="100%" height="100%" rx="52" fill="white"/></svg>`
);
const composites = [];
for (const [index, panel] of panels.entries()) {
  const screenshot = await sharp(resolve(input, `${panel}.png`))
    .resize(screenWidth, screenHeight, { fit: 'fill' })
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toBuffer();
  composites.push({ input: screenshot, left: positions[index], top });
}
mkdirSync(dirname(output), { recursive: true });
await sharp(background).composite(composites).webp({ quality: 92 }).toFile(output);
console.log('Built .github/assets/banner.webp from simulator screenshots.');
