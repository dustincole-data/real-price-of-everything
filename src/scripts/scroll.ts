// The signature scroll mechanic (§4). ONE pinned chart transforms across beats 2-6,
// driven by a single master scroll-progress value. Every line's geometry is recomputed
// manually each frame from that progress — no tweened SVG attributes, no morph plugin,
// so the gsap-scrub-from-conflict violation is impossible by construction. The static
// prerendered fan (#fallback) is the no-JS / reduced-motion content; GSAP only enhances.

import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import seriesData from '../data/series.json';
import type { SeriesData, Good } from '../lib/types.ts';
import {
  FAN_FRAME as FF, TEACH_FRAME as TF, plotW, xAtYear, yAtValue, fanPoints,
  linePath, dodge, win, clamp, lerp, assignFanColors,
} from '../lib/chart.ts';

const data = seriesData as unknown as SeriesData;
const { years, latestYear } = data.meta;
const NS = 'http://www.w3.org/2000/svg';
const colors = assignFanColors(data.goods);

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const root = document.documentElement;
const live = document.getElementById('live') as SVGSVGElement | null;
if (!live) throw new Error('no #live');

function el<K extends string>(tag: K, attrs: Record<string, string | number> = {}): SVGElement {
  const n = document.createElementNS(NS, tag);
  for (const k in attrs) n.setAttribute(k, String(attrs[k]));
  return n;
}

/* ============================ FAN (beats 3-6) ============================ */
const FAN_YMAX = 380;
const fanGroup = el('g', { id: 'g-fan', opacity: 0 });
interface FanLine { g: Good; path: SVGElement; dot: SVGElement; leader: SVGElement; label: SVGElement; }
let fanLines: FanLine[] = [];

function buildFan() {
  const plotRight = FF.padL + plotW(FF);
  // y grid + ticks
  for (const v of [0, 100, 200, 300]) {
    const y = yAtValue(v, 0, FAN_YMAX, FF);
    fanGroup.appendChild(el('line', { class: `axis-rule${v === 0 ? ' zero' : ''}`, x1: FF.padL, y1: y, x2: plotRight, y2: y }));
    const t = el('text', { class: 'axis-tick', x: FF.padL - 10, y: y + 4, 'text-anchor': 'end' });
    t.textContent = String(v); fanGroup.appendChild(t);
  }
  for (const yr of [1980, 1990, 2000, 2010, 2020]) {
    const t = el('text', { class: 'axis-tick', x: xAtYear(yr, years[0], latestYear, FF), y: FF.H - FF.padB + 22, 'text-anchor': 'middle' });
    t.textContent = String(yr); fanGroup.appendChild(t);
  }
  // baseline
  const by = yAtValue(100, 0, FAN_YMAX, FF);
  fanGroup.appendChild(el('line', { class: 'baseline-line', x1: FF.padL, y1: by, x2: plotRight, y2: by }));
  const bl = el('text', { class: 'baseline-lbl', x: FF.padL, y: by - 8 }); bl.textContent = '100 = kept pace with inflation';
  fanGroup.appendChild(bl);
  // lines (goods first, services on top)
  const ordered = [...data.goods].sort((a, b) => (a.pole === b.pole ? 0 : a.pole === 'down' ? -1 : 1));
  fanLines = ordered.map((g) => {
    const stroke = colors.get(g.id)!;
    const path = el('path', { fill: 'none', stroke, 'stroke-width': g.id === 'college' ? 2.9 : 2.3, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' });
    const leader = el('path', { class: 'leader', stroke });
    const dot = el('circle', { r: 3, fill: stroke });
    const label = el('text', { class: 'line-lbl', fill: stroke }); label.textContent = g.label;
    fanGroup.appendChild(path); fanGroup.appendChild(leader); fanGroup.appendChild(dot); fanGroup.appendChild(label);
    return { g, path, dot, leader, label };
  });
  live!.appendChild(fanGroup);
}

const gutterX = FF.W - FF.padR + 12;
function renderFan(fanProg: number, highlight: string | null) {
  const tips: { key: string; y: number }[] = [];
  const geo = new Map<string, { x: number; y: number; d: string }>();
  for (const L of fanLines) {
    const pts = fanPoints(L.g.real, years, 0, FAN_YMAX, FF, fanProg);
    const tip = pts[pts.length - 1];
    geo.set(L.g.id, { x: tip[0], y: tip[1], d: linePath(pts) });
    tips.push({ key: L.g.id, y: tip[1] });
  }
  const dodged = dodge(tips, 16, FF.padT + 4, FF.H - FF.padB - 4);
  const labelReveal = clamp((fanProg - 0.55) / 0.3);
  for (const L of fanLines) {
    const q = geo.get(L.g.id)!;
    const ly = dodged.get(L.g.id)!;
    const dim = highlight && highlight !== L.g.id;
    const op = dim ? 0.14 : 1;
    L.path.setAttribute('d', q.d);
    L.path.setAttribute('opacity', String(op));
    L.dot.setAttribute('cx', String(q.x)); L.dot.setAttribute('cy', String(q.y)); L.dot.setAttribute('opacity', String(op * labelReveal));
    L.leader.setAttribute('d', `M${(q.x + 3).toFixed(1)} ${q.y.toFixed(1)} L${gutterX - 5} ${ly.toFixed(1)}`);
    L.leader.setAttribute('opacity', String(0.5 * op * labelReveal));
    L.label.setAttribute('x', String(gutterX)); L.label.setAttribute('y', String(ly));
    L.label.setAttribute('opacity', String((dim ? 0.25 : 1) * labelReveal));
    L.label.setAttribute('font-weight', highlight === L.g.id ? '600' : '500');
  }
}

/* ============================ TEACH (beat 2, stamp) ============================ */
const stamp = data.goods.find((g) => g.id === 'stamp')! as Good;
const teach = stamp.teach!;
const TEACH_YMAX = 80;
const tGroup = el('g', { id: 'g-teach' });
let tEls: Record<string, SVGElement> = {};
const tx = (yr: number) => xAtYear(yr, teach.years[0], teach.years[teach.years.length - 1], TF);
const ty = (c: number) => yAtValue(c, 0, TEACH_YMAX, TF);

function buildTeach() {
  const plotRight = TF.padL + plotW(TF);
  for (const v of [0, 20, 40, 60, 80]) {
    const y = ty(v);
    tGroup.appendChild(el('line', { class: 'axis-rule', x1: TF.padL, y1: y, x2: plotRight, y2: y }));
    const t = el('text', { class: 'axis-tick', x: TF.padL - 10, y: y + 4, 'text-anchor': 'end' }); t.textContent = v + '¢';
    tGroup.appendChild(t);
  }
  for (const yr of [teach.years[0], 1990, 2005, latestYear]) {
    const t = el('text', { class: 'axis-tick', x: tx(yr), y: TF.H - TF.padB + 22, 'text-anchor': 'middle' }); t.textContent = String(yr);
    tGroup.appendChild(t);
  }
  tEls.tideArea = el('path', { fill: 'var(--tide)', 'fill-opacity': 0, stroke: 'none' });
  tEls.tideEdge = el('polyline', { fill: 'none', stroke: 'var(--tide)', 'stroke-width': 1.25, 'stroke-dasharray': '3 4', 'stroke-opacity': 0 });
  tEls.line = el('polyline', { fill: 'none', stroke: 'var(--ink)', 'stroke-width': 3, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' });
  tEls.dot = el('circle', { r: 5, fill: 'var(--ink)' });
  tEls.endLbl = el('text', { class: 'line-lbl', fill: 'var(--ink)' });
  tEls.tideLbl = el('text', { class: 'line-lbl', fill: 'var(--tide)', opacity: 0 });
  for (const k of ['tideArea', 'tideEdge', 'line', 'dot', 'endLbl', 'tideLbl']) tGroup.appendChild(tEls[k]);
  live!.appendChild(tGroup);
}

function renderTeach(tide: number, deflate: number) {
  const linePts: [number, number][] = [];
  const tidePts: [number, number][] = [];
  for (let i = 0; i < teach.years.length; i++) {
    const x = tx(teach.years[i]);
    const lineVal = lerp(teach.nominalCents[i], teach.realCents[i], deflate);
    const tideVal = lerp(teach.thenCents, teach.tideCents[i], tide * (1 - deflate));
    linePts.push([x, ty(lineVal)]);
    tidePts.push([x, ty(tideVal)]);
  }
  // tide filled area down to 0
  const area = tidePts.map((p) => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L');
  tEls.tideArea.setAttribute('d', `M${area} L${tx(latestYear).toFixed(1)} ${ty(0).toFixed(1)} L${tx(teach.years[0]).toFixed(1)} ${ty(0).toFixed(1)} Z`);
  tEls.tideArea.setAttribute('fill-opacity', (0.16 * tide * (1 - deflate)).toFixed(3));
  tEls.tideEdge.setAttribute('points', tidePts.map((p) => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' '));
  tEls.tideEdge.setAttribute('stroke-opacity', (0.55 * tide * (1 - deflate)).toFixed(3));
  tEls.line.setAttribute('points', linePts.map((p) => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' '));
  const end = linePts[linePts.length - 1];
  tEls.dot.setAttribute('cx', String(end[0])); tEls.dot.setAttribute('cy', String(end[1]));
  tEls.endLbl.setAttribute('x', String(end[0] + 12)); tEls.endLbl.setAttribute('y', String(end[1] + 4));
  tEls.endLbl.textContent = deflate > 0.5 ? `real ≈ ${teach.thenCents}¢` : `${teach.nowCents}¢`;
  const te = tidePts[tidePts.length - 1];
  tEls.tideLbl.setAttribute('x', String(te[0] - 10)); tEls.tideLbl.setAttribute('y', String(te[1] - 10));
  tEls.tideLbl.setAttribute('text-anchor', 'end');
  tEls.tideLbl.setAttribute('opacity', (tide * (1 - deflate)).toFixed(2));
  tEls.tideLbl.textContent = 'inflation tide';
}

/* ============================ captions ============================ */
const caps = Array.from(document.querySelectorAll<HTMLElement>('#caps .cap'));
// tour highlight windows (must match the goods captions' data-in/out)
const tour: { id: string; a: number; b: number }[] = [
  { id: 'gas', a: 0.45, b: 0.515 }, { id: 'tv', a: 0.515, b: 0.58 },
  { id: 'clothing', a: 0.58, b: 0.64 }, { id: 'eggs', a: 0.64, b: 0.705 },
  { id: 'college', a: 0.705, b: 0.77 }, { id: 'healthcare', a: 0.77, b: 0.83 },
  { id: 'rent', a: 0.83, b: 0.885 }, { id: 'childcare', a: 0.885, b: 0.945 },
];
function capOpacity(p: number, a: number, b: number): number {
  const f = 0.018;
  return clamp(win(p, a, a + f)) * (1 - clamp(win(p, b - f, b)));
}
function renderCaps(p: number) {
  for (const c of caps) {
    const a = parseFloat(c.dataset.in!); const b = parseFloat(c.dataset.out!);
    const o = capOpacity(p, a, b);
    c.style.opacity = String(o);
    c.style.transform = `translateY(${(1 - o) * 8}px)`;
    c.style.pointerEvents = o > 0.5 ? 'auto' : 'none';
  }
}

/* ============================ master render ============================ */
function activeTour(p: number): string | null {
  for (const t of tour) if (p >= t.a && p < t.b) return t.id;
  return null;
}
function render(p: number) {
  // beat 2 teach params
  const tide = win(p, 0.05, 0.16);
  const deflate = win(p, 0.175, 0.275);
  renderTeach(tide, deflate);
  // crossfade teach -> fan across the handoff
  const teachOpacity = 1 - win(p, 0.285, 0.36);
  const fanOpacity = win(p, 0.27, 0.35);
  tGroup.setAttribute('opacity', teachOpacity.toFixed(3));
  fanGroup.setAttribute('opacity', fanOpacity.toFixed(3));
  // fan opens through the handoff + beat 3
  const fanProg = win(p, 0.30, 0.45);
  renderFan(fanProg, activeTour(p));
  renderCaps(p);
}

/* ============================ setup ============================ */
function activate() {
  root.setAttribute('data-js-active', '');
  buildTeach();
  buildFan();
  render(0);

  if (reduced) {
    // reduced motion: no pin/scrub. Show the final composed fan + final caption.
    tGroup.setAttribute('opacity', '0');
    fanGroup.setAttribute('opacity', '1');
    renderFan(1, null);
    for (const c of caps) c.style.opacity = c.hasAttribute('data-final') ? '1' : '0';
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.create({
    trigger: '#scroll-root',
    start: 'top top',
    end: 'bottom bottom',
    pin: '#stage',
    pinSpacing: false,
    scrub: 0.4,
    onUpdate: (self) => render(self.progress),
  });
  ScrollTrigger.refresh();

  // failsafe: if ScrollTrigger never initialised (hidden tab / headless), paint a valid frame
  setTimeout(() => { if (!ScrollTrigger.getAll().length) { fanGroup.setAttribute('opacity', '1'); renderFan(1, null); } }, 1500);
}

activate();
