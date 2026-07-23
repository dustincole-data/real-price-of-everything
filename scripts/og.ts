// Browser-free OG cover generator (spec §10.7 option b): builds one self-contained
// SVG string from the baked series + chart geometry, renders to PNG via resvg. No
// satori, no edge function, no browser. Run: `npm run og`. Output committed.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';
import { xAtYear, yAtValue, fanPoints, linePath, dodge, type Frame } from '../src/lib/chart.ts';
import type { SeriesData, Good } from '../src/lib/types.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const data = JSON.parse(await readFile(join(ROOT, 'src', 'data', 'series.json'), 'utf8')) as SeriesData;
const { years, latestYear } = data.meta;
const YMAX = 380;

const F: Frame = { W: 1200, H: 630, padL: 92, padR: 150, padT: 214, padB: 70 };
const xAt = (yr: number) => xAtYear(yr, years[0], latestYear, F);
const yAt = (v: number) => yAtValue(v, 0, YMAX, F);
const plotRight = F.W - F.padR;

// sRGB-hex two-pole ramps (usvg does not parse oklch); ordered by magnitude to match the app
const ROSE = ['#a41d34', '#c23a52', '#d56374', '#e08b98'];
const BLUE = ['#1c5ea6', '#3f79ba', '#6b9acd', '#93b6de'];
function colorMap(): Map<string, string> {
  const up = data.goods.filter((g) => g.pole === 'up').sort((a, b) => b.realIndexToday - a.realIndexToday);
  const down = data.goods.filter((g) => g.pole === 'down').sort((a, b) => a.realIndexToday - b.realIndexToday);
  const m = new Map<string, string>();
  up.forEach((g, i) => m.set(g.id, ROSE[Math.min(i, ROSE.length - 1)]));
  down.forEach((g, i) => m.set(g.id, BLUE[Math.min(i, BLUE.length - 1)]));
  return m;
}
const colors = colorMap();
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

const ordered = [...data.goods].sort((a, b) => (a.pole === b.pole ? 0 : a.pole === 'down' ? -1 : 1));
const geom = ordered.map((g) => {
  const pts = fanPoints(g.real, years, 0, YMAX, F, 1);
  const tip = pts[pts.length - 1];
  return { g, d: linePath(pts), tipX: tip[0], tipY: tip[1], stroke: colors.get(g.id)! };
});
const dodged = dodge(geom.map((l) => ({ key: l.g.id, y: l.tipY })), 22, F.padT + 4, F.H - F.padB - 4);
const gutterX = plotRight + 12;
const baseY = yAt(100);

const gridLines: string[] = [];
for (const v of [100, 200, 300]) {
  const y = yAt(v);
  gridLines.push(`<line x1="${F.padL}" y1="${y}" x2="${plotRight}" y2="${y}" stroke="#e4e7ee"/>`);
  gridLines.push(`<text x="${F.padL - 12}" y="${y + 4}" text-anchor="end" font-family="Consolas, ui-monospace, monospace" font-size="14" fill="#9a9fb0">${v}</text>`);
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<rect width="1200" height="630" fill="#fbfbfd"/>
<text x="60" y="70" font-family="Consolas, ui-monospace, monospace" font-size="16" fill="#b0324a">Everything costs more. That is not the whole story.</text>
<text x="58" y="126" font-family="Segoe UI, Arial, sans-serif" font-weight="600" font-size="46" letter-spacing="-1" fill="#2b2f3a">The Real Price of Everything</text>
<text x="1140" y="70" text-anchor="end" font-family="Consolas, ui-monospace, monospace" font-size="15" fill="#5b6070">1980&#8211;${latestYear} · real</text>
${gridLines.join('\n')}
<line x1="${F.padL}" y1="${baseY}" x2="${plotRight}" y2="${baseY}" stroke="#8b90a0" stroke-width="1.25" stroke-dasharray="4 4"/>
<text x="${F.padL}" y="${baseY - 8}" font-family="Consolas, ui-monospace, monospace" font-size="13" fill="#5b6070">100 = kept pace with inflation</text>
${geom.map((l) => `<path d="${l.d}" fill="none" stroke="${l.stroke}" stroke-width="${l.g.id === 'college' ? 3.4 : 2.6}" stroke-linejoin="round" stroke-linecap="round"/>`).join('\n')}
${geom.map((l) => {
  const ly = dodged.get(l.g.id)!;
  return `<circle cx="${l.tipX.toFixed(1)}" cy="${l.tipY.toFixed(1)}" r="3.5" fill="${l.stroke}"/>` +
    `<path d="M${(l.tipX + 3).toFixed(1)} ${l.tipY.toFixed(1)} L${gutterX - 5} ${ly.toFixed(1)}" stroke="${l.stroke}" stroke-width="1" fill="none" opacity="0.5"/>` +
    `<text x="${gutterX}" y="${ly.toFixed(1)}" font-family="Consolas, ui-monospace, monospace" font-size="15" font-weight="500" fill="${l.stroke}" dominant-baseline="middle">${esc(l.g.label)}</text>`;
}).join('\n')}
<text x="60" y="598" font-family="Consolas, ui-monospace, monospace" font-size="14" fill="#5b6070">dustincoledata.com · Source: U.S. Bureau of Labor Statistics</text>
</svg>`;

const fontDir = join(ROOT, 'public', 'fonts');
// resvg does not load woff2; render OG text in system fonts (Segoe UI / Consolas).
// This runs locally and the PNG is committed, so it only needs the build machine's fonts.
const png = new Resvg(svg, {
  font: { loadSystemFonts: true, defaultFontFamily: 'Segoe UI' },
}).render().asPng();
void fontDir;

await mkdir(join(ROOT, 'public', 'og'), { recursive: true });
await writeFile(join(ROOT, 'public', 'og', 'cover.png'), png);
console.log(`wrote public/og/cover.png (${(png.length / 1024).toFixed(1)}KB)`);
