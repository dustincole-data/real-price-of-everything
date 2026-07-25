// "Drain the Tide" — the signature scroll mechanic (§4, redesigned 2026-07-24).
// A CSS position:sticky stage (NO GSAP pin — the pin was the mobile-death cause) holds
// one nine-bar skyline. A single 0..1 progress value, measured from scroll position inside
// the tall .scrolly container, drives every bar's geometry each frame. The SVG viewBox is
// measured in px on init/resize, so bars are tall on a phone and wide on desktop with no
// horizontal scroll, ever. Beat 3 plays each good's real 1980→2024 series (from series.json)
// as the tide drains, so bars breathe (gas jitters, eggs spike) and settle at real heights.
// No-JS / reduced-motion content is the static skyline baked in index.astro; this only enhances.

import seriesData from '../data/series.json';
import type { SeriesData, Good } from '../lib/types.ts';

const data = seriesData as unknown as SeriesData;
const NS = 'http://www.w3.org/2000/svg';

/* ---- goods: ascending real-2024 endpoint = a rising staircase left→right ---- */
const EMOJI: Record<string, string> = {
  tv: '📺', clothing: '👕', gas: '⛽', eggs: '🥚', stamp: '✉️',
  rent: '🏠', childcare: '🍼', healthcare: '🏥', college: '🎓',
};
interface Bar {
  id: string; good: Good; end: number; pole: 'up' | 'down';
  real: (number | null)[]; firstReal: number;
  rect: SVGElement; em: SVGElement; val: SVGElement; lab: SVGElement;
}
const goods = [...data.goods].sort((a, b) => a.realIndexToday - b.realIndexToday);
const ORDER = goods.map((g) => g.id);
const N = data.meta.years.length;
const firstNonNull = (a: (number | null)[]) => (a.find((v) => v != null) as number) ?? 100;

/* ---- helpers ---- */
const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ss = (p: number, a: number, b: number) => { const t = clamp((p - a) / (b - a)); return t * t * (3 - 2 * t); }; // smoothstep window
const col = (pole: string) => (pole === 'up' ? 'var(--pole-up)' : 'var(--pole-down)');
const mk = (tag: string, attrs: Record<string, string | number> = {}, text?: string): SVGElement => {
  const n = document.createElementNS(NS, tag);
  for (const k in attrs) n.setAttribute(k, String(attrs[k]));
  if (text != null) n.textContent = text;
  return n;
};

/* real index of a good sampled at fractional year position frac∈[0,1] (0=1980, 1=2024) */
function realAt(b: Bar, frac: number): number {
  const pos = clamp(frac) * (N - 1);
  const i0 = Math.floor(pos), i1 = Math.min(N - 1, i0 + 1), t = pos - i0;
  const v0 = b.real[i0] ?? b.firstReal;
  const v1 = b.real[i1] ?? b.firstReal;
  return lerp(v0, v1, t);
}

const viz = document.getElementById('viz') as unknown as SVGSVGElement | null;
const stage = document.getElementById('stage');
const scrolly = document.getElementById('scrolly');
if (!viz || !stage || !scrolly) throw new Error('drain: missing stage nodes');
const root = document.documentElement;
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---- captions (authored in the DOM; JS only drives opacity) ---- */
const caps = Array.from(document.querySelectorAll<HTMLElement>('#caps .cap'));
const tour = caps
  .filter((c) => c.dataset.good)
  .map((c) => ({ id: c.dataset.good!, a: parseFloat(c.dataset.in!), b: parseFloat(c.dataset.out!) }));
const activeGood = (p: number): string | null => {
  for (const t of tour) if (p >= t.a && p < t.b) return t.id;
  return null;
};

/* ---- geometry (measured, responsive) ---- */
let W = 0, H = 0, PL = 0, PR = 0, PT = 0, PB = 0, PW = 0, narrow = false;
const DMAX = 380;
function measure() {
  const box = viz!.parentElement as HTMLElement;
  W = Math.max(220, box.clientWidth);
  H = Math.max(220, box.clientHeight);
  viz!.setAttribute('viewBox', `0 0 ${W} ${H}`);
  narrow = W < 560;
  PL = narrow ? 30 : 46;
  PR = W - (narrow ? 14 : 22);
  PT = Math.round(H * 0.09);
  PB = H - (narrow ? 44 : 36);
  PW = PR - PL;
}
const yFor = (v: number) => PB - (clamp(v, 0, DMAX) / DMAX) * (PB - PT);
const slot = () => PW / ORDER.length;
const xFor = (i: number) => PL + (i + 0.5) * slot();
const barW = () => Math.min(narrow ? 999 : 56, slot() * 0.52);
const y100 = () => yFor(100);

/* ---- build once ---- */
let bars: Bar[] = [];
let water: SVGElement, base: SVGElement, baselbl: SVGElement, yearlbl: SVGElement;
let ticks: { v: number; l: SVGElement; t: SVGElement }[] = [];
function build() {
  while (viz!.firstChild) viz!.removeChild(viz!.firstChild);
  ticks = [];
  for (const v of [0, 100, 200, 300]) {
    const l = mk('line', { class: 'rule' });
    const t = mk('text', { class: 'tick', 'text-anchor': 'end' }, String(v));
    viz!.appendChild(l); viz!.appendChild(t); ticks.push({ v, l, t });
  }
  water = mk('rect', { class: 'tide', fill: 'var(--tide)', 'fill-opacity': 0 }); viz!.appendChild(water);
  base = mk('line', { class: 'base' }); viz!.appendChild(base);
  baselbl = mk('text', { class: 'baselbl' }, 'kept pace with inflation'); viz!.appendChild(baselbl);
  yearlbl = mk('text', { class: 'yearlbl', 'text-anchor': 'end', opacity: 0 }); viz!.appendChild(yearlbl);
  bars = goods.map((g) => {
    const rect = mk('rect', { rx: 2.5, fill: col(g.pole), 'fill-opacity': 0.9 });
    const em = mk('text', { class: 'emoji' }, EMOJI[g.id] ?? '');
    const val = mk('text', { class: 'val', fill: col(g.pole), opacity: 0 });
    const lab = mk('text', { class: 'glab', opacity: 0 }, g.label);
    viz!.appendChild(rect); viz!.appendChild(em); viz!.appendChild(val); viz!.appendChild(lab);
    return { id: g.id, good: g, end: g.realIndexToday, pole: g.pole, real: g.real, firstReal: firstNonNull(g.real), rect, em, val, lab };
  });
  layout();
}
function layout() {
  for (const o of ticks) {
    const y = yFor(o.v);
    o.l.setAttribute('x1', String(PL)); o.l.setAttribute('y1', String(y));
    o.l.setAttribute('x2', String(PR)); o.l.setAttribute('y2', String(y));
    o.t.setAttribute('x', String(PL - 7)); o.t.setAttribute('y', String(y + 3.5));
  }
  base.setAttribute('x1', String(PL)); base.setAttribute('y1', String(y100()));
  base.setAttribute('x2', String(PR)); base.setAttribute('y2', String(y100()));
  baselbl.setAttribute('x', String(PL)); baselbl.setAttribute('y', String(y100() - 6));
  baselbl.textContent = narrow ? 'kept pace' : 'kept pace with inflation';
  baselbl.setAttribute('font-size', narrow ? '12' : '11');
  yearlbl.setAttribute('x', String(PR)); yearlbl.setAttribute('y', String(PT + 4));
  yearlbl.setAttribute('font-size', String(narrow ? 22 : 30));
  water.setAttribute('x', String(PL)); water.setAttribute('width', String(PW));
  const bw = barW();
  bars.forEach((b, i) => {
    const x = xFor(i);
    b.rect.setAttribute('x', String(x - bw / 2)); b.rect.setAttribute('width', String(bw));
    b.em.setAttribute('x', String(x)); b.em.setAttribute('font-size', String(narrow ? 26 : 22));
    b.val.setAttribute('x', String(x)); b.val.setAttribute('font-size', String(narrow ? 15 : 13));
    b.lab.setAttribute('x', String(x)); b.lab.setAttribute('font-size', String(narrow ? 12 : 11));
    b.lab.setAttribute('y', String(PB + (narrow ? 15 : 19)));
  });
}

/* ---- render: one nine-bar group on one index scale ----
   teach (p<0.30) shows only the stamp — it rides the tide, drains to ~119, then hands off
   as the other eight fade in; the split (0.30–0.47) plays the real series while the tide drains. */
const TIDE = 300;
const STAMP_I = ORDER.indexOf('stamp');
function renderBars(p: number) {
  const tRise = ss(p, 0.02, 0.11), tDrain = ss(p, 0.115, 0.215), hand = ss(p, 0.22, 0.30);
  const aRise = ss(p, 0.30, 0.385), aDrain = ss(p, 0.385, 0.47);
  const hi = activeGood(p);

  // water = the inflation tide, draining twice (teach, then split)
  let wl: number, wfade: number;
  if (p < 0.22) { wl = tDrain > 0 ? lerp(TIDE, 100, tDrain) : lerp(100, TIDE, tRise); wfade = 1 - tDrain; }
  else if (p < 0.30) { wl = 100; wfade = 0; }
  else { wl = aDrain > 0 ? lerp(TIDE, 100, aDrain) : lerp(100, TIDE, aRise); wfade = 1 - aDrain; }
  const yw = yFor(wl);
  water.setAttribute('y', String(yw)); water.setAttribute('height', String(Math.max(0, PB - yw)));
  water.setAttribute('fill-opacity', (0.15 * clamp(wfade)).toFixed(3));

  // year readout during the split's year-play (0=1980 … 1=2024)
  const playing = p >= 0.30 && p < 0.475 && aDrain > 0.001 && aDrain < 0.999;
  if (playing) {
    const yr = Math.round(lerp(data.meta.years[0], data.meta.latestYear, aDrain));
    yearlbl.textContent = String(yr);
    yearlbl.setAttribute('opacity', (0.5 * ss(aDrain, 0.02, 0.12) * (1 - ss(aDrain, 0.9, 1))).toFixed(2));
  } else {
    yearlbl.setAttribute('opacity', '0');
  }

  const labReveal = clamp((aDrain - 0.15) / 0.5); // names fade in as the split resolves
  bars.forEach((b, i) => {
    const isStamp = i === STAMP_I;
    const appear = isStamp ? 1 : hand; // the other eight fade in over the handoff
    let v: number;
    if (isStamp) {
      if (p < 0.22) v = tDrain > 0 ? lerp(TIDE, b.end, tDrain) : lerp(100, TIDE, tRise);
      else if (p < 0.30) v = lerp(b.end, 100, hand); // slot back to the tide line before the group rises
      else v = aDrain > 0 ? lerp(TIDE, realAt(b, aDrain), aDrain) : lerp(100, TIDE, aRise);
    } else {
      v = aDrain > 0 ? lerp(TIDE, realAt(b, aDrain), aDrain) : lerp(100, TIDE, aRise);
    }
    const dim = hi && hi !== b.id;
    const o = appear * (dim ? 0.16 : 1);
    const y = yFor(v);
    b.rect.setAttribute('y', String(y)); b.rect.setAttribute('height', String(Math.max(0, PB - y)));
    b.rect.setAttribute('opacity', o.toFixed(3));
    b.em.setAttribute('y', String(y - (narrow ? 18 : 16))); b.em.setAttribute('opacity', o.toFixed(3));
    // wide: label the whole axis (names fit); narrow: only the active bar, so long names never collide
    b.lab.setAttribute('opacity', narrow ? (hi === b.id ? o.toFixed(3) : '0') : (appear * labReveal * (dim ? 0.35 : 1)).toFixed(3));

    // value readout: the teach stamp shows cents; after the handoff the live index rides every bar
    let txt: string | null = null;
    if (isStamp && p < 0.235) txt = tDrain > 0.5 ? 'real ≈ 12¢' : (tRise > 0.4 ? '68¢' : '15¢');
    else if (p >= 0.30) txt = String(Math.round(v));
    if (txt) {
      b.val.setAttribute('y', String(y - (narrow ? 40 : 34)));
      b.val.textContent = txt;
      b.val.setAttribute('opacity', o.toFixed(3));
    } else {
      b.val.setAttribute('opacity', '0');
    }
  });
}

/* ---- captions ---- */
function renderCaps(p: number) {
  const f = 0.02;
  for (const c of caps) {
    const a = parseFloat(c.dataset.in!), b = parseFloat(c.dataset.out!);
    const o = ss(p, a, a + f) * (1 - ss(p, b - f, b));
    c.style.opacity = String(o);
    c.style.transform = `translateY(${(1 - o) * 6}px)`;
    c.style.pointerEvents = o > 0.5 ? 'auto' : 'none';
  }
}

function render(p: number) { renderBars(p); renderCaps(p); }

/* ---- scroll drive (rAF + light lerp smoothing) ---- */
let curP = 0, tgtP = 0, ticking = false;
function computeProgress(): number {
  const r = scrolly!.getBoundingClientRect();
  const total = scrolly!.offsetHeight - stage!.offsetHeight;
  return clamp(-r.top / (total || 1));
}
function frame() {
  // reduced-motion: snap straight to the scroll position (no motion independent of the finger);
  // otherwise ease toward the target so scrubbing stays smooth.
  curP += reduced ? (tgtP - curP) : (tgtP - curP) * 0.18;
  if (reduced || Math.abs(tgtP - curP) < 0.0005) curP = tgtP;
  render(curP);
  if (curP !== tgtP) requestAnimationFrame(frame); else ticking = false;
}
function onScroll() { tgtP = computeProgress(); if (!ticking) { ticking = true; requestAnimationFrame(frame); } }

function init() {
  // Note: reduced-motion still runs the scrollytelling — the scroll-coupled chart IS the content,
  // not decoration. frame() drops the eased smoothing under reduced so nothing moves on its own.
  // The static skyline + stacked captions only carry it when JS never runs at all.
  root.setAttribute('data-js-active', '');
  measure(); build();
  tgtP = curP = computeProgress(); render(curP);
  window.addEventListener('scroll', onScroll, { passive: true });
  let rt: number | undefined;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = window.setTimeout(() => { measure(); build(); render(curP); }, 120);
  });
}

if (document.fonts && document.fonts.ready) document.fonts.ready.then(init); else window.addEventListener('load', init);
setTimeout(() => { if (!W) init(); }, 700); // failsafe if fonts never resolve
