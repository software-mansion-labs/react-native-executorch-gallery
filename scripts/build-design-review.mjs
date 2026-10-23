import { Buffer } from 'node:buffer';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const directory = resolve(root, 'design');
const source = resolve(directory, 'review.html');
const destination = resolve(directory, 'review-standalone.html');
const mime = {
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain',
};
const embedded = new Map();

function embed(reference) {
  if (/^(?:https?:|data:|#|mailto:)/.test(reference)) return reference;
  if (!embedded.has(reference)) {
    const extension = extname(reference);
    if (!mime[extension]) throw new Error(`Unsupported local asset: ${reference}`);
    const bytes = readFileSync(resolve(directory, reference));
    embedded.set(reference, `data:${mime[extension]};base64,${bytes.toString('base64')}`);
  }
  return embedded.get(reference);
}

let html = readFileSync(source, 'utf8');
html = html.replace(/\b(src|href)=(['"])([^'"<>]+)\2/g, (match, attribute, quote, reference) => {
  const value = embed(reference);
  const preview = attribute === 'href' && value.startsWith('data:');
  return `${attribute}=${quote}${value}${quote}${preview ? ' data-embedded-preview="true"' : ''}`;
});
html = html.replace(/url\((['"]?)([^)'"\s]+)\1\)/g, (match, quote, reference) => {
  return `url('${embed(reference)}')`;
});

// A local image reference can be opened without relying on top-level data-URL navigation.
html = html.replace(
  '</body>',
  `<dialog id="asset-preview" style="max-width:90vw;max-height:90vh;border:0;border-radius:16px;padding:18px;background:var(--surface);color:var(--text)">
    <button type="button" style="display:block;margin:0 0 12px auto" aria-label="Close asset preview">Close</button>
    <div></div>
  </dialog>
  <script>
    document.addEventListener('click', event => {
      const link = event.target.closest('a[data-embedded-preview]');
      if (!link) return;
      event.preventDefault();
      const dialog = document.querySelector('#asset-preview');
      const container = dialog.querySelector('div');
      container.replaceChildren();
      if (link.href.startsWith('data:image/')) {
        const img = new Image();
        img.src = link.href;
        img.alt = link.textContent || 'Reference image';
        img.style.cssText = 'display:block;max-width:82vw;max-height:75vh;object-fit:contain';
        container.append(img);
      } else {
        const text = document.createElement('pre');
        text.style.cssText = 'white-space:pre-wrap;max-width:75vw;font-size:12px';
        text.textContent = atob(link.href.split(',')[1]);
        container.append(text);
      }
      dialog.showModal();
      dialog.querySelector('button').focus();
    });
    document.querySelector('#asset-preview button').addEventListener('click', () => document.querySelector('#asset-preview').close());
  </script>
  </body>`
);

writeFileSync(destination, html);
console.log(`Built ${destination}`);
console.log(
  `${embedded.size} embedded assets; ${(Buffer.byteLength(html) / 1024 / 1024).toFixed(1)} MB`
);
