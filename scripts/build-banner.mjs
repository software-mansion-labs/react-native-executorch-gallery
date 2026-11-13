import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

import { iphoneFrame } from './lib/iphone-frame.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const input = resolve(root, process.argv[2] ?? '.artifacts/showcase/screenshots');
const output = resolve(root, '.github/assets/banner.webp');
const frame = iphoneFrame(400);
const top = 190;
const positions = [40, 560, 1080];
const background =
  Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="${top + frame.height + 30}">
  <rect width="100%" height="100%" fill="#F7F7F9"/>
  <text x="185" y="105" font-family="Helvetica Neue, Arial, sans-serif" font-size="64" font-weight="500" letter-spacing="-1.8" fill="#17171B">ExecuTorch Gallery</text>
  <text x="187" y="151" font-family="Helvetica Neue, Arial, sans-serif" font-size="28" fill="#52525B">On-device AI for React Native</text>
</svg>`);
const logo = await sharp(resolve(root, 'assets/images/logo-hero.svg'))
  .resize({ width: 68 })
  .png()
  .toBuffer();
const composites = [{ input: logo, left: 85, top: 57 }];
for (const [index, panel] of ['home', 'tasks', 'search'].entries()) {
  const screenshot = await sharp(resolve(input, `${panel}.png`))
    .resize(frame.screen.width, frame.screen.height, { fit: 'contain' })
    .composite([{ input: frame.mask, blend: 'dest-in' }])
    .png()
    .toBuffer();
  const phone = await sharp(frame.svg)
    .composite([{ input: screenshot, left: frame.screen.left, top: frame.screen.top }])
    .png()
    .toBuffer();
  composites.push({ input: phone, left: positions[index], top });
}
mkdirSync(dirname(output), { recursive: true });
await sharp(background).composite(composites).webp({ quality: 95 }).toFile(output);
console.log('Built .github/assets/banner.webp from simulator screenshots.');
