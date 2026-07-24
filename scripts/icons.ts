// Browser-free favicon/app-icon generator. Renders the divergence mark (same as
// public/favicon.svg) to committed PNGs via resvg — no browser, no fonts.
// Run: `npm run icons`. Outputs committed.

import { writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// The mark, shape-for-shape identical to public/favicon.svg.
const MARK = `
  <line x1="16" y1="50" x2="84" y2="50" stroke="#8b90a0" stroke-width="3" stroke-linecap="round" stroke-dasharray="0.5 7.5" opacity="0.6"/>
  <path d="M24 50 C 44 50 54 34 82 20" fill="none" stroke="#FB7185" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M24 50 C 44 50 54 66 82 80" fill="none" stroke="#22D3EE" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="24" cy="50" r="4.5" fill="#64748b"/>
  <circle cx="82" cy="20" r="5.5" fill="#FB7185"/>
  <circle cx="82" cy="80" r="5.5" fill="#22D3EE"/>`;

// apple-touch on the site's paper ground (light, matching the piece's chrome).
const appleSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="#fbfbfd"/>${MARK}</svg>`;
// 32px PNG fallback for browsers that skip the SVG icon — transparent.
const smallSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${MARK}</svg>`;

const render = (svg: string, width: number) =>
  new Resvg(svg, { fitTo: { mode: 'width', value: width }, font: { loadSystemFonts: false } }).render().asPng();

await writeFile(join(ROOT, 'public', 'apple-touch-icon.png'), render(appleSvg, 180));
await writeFile(join(ROOT, 'public', 'favicon-32.png'), render(smallSvg, 32));
console.log('wrote public/apple-touch-icon.png (180) + public/favicon-32.png (32)');
