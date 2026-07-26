// "Drain the Tide" — the signature scroll mechanic (§4, redesigned 2026-07-24).
// A CSS position:sticky stage (NO GSAP pin — the pin was the mobile-death cause) holds
// one nine-bar skyline. A single 0..1 progress value, measured from scroll position inside
// the tall .scrolly container, drives every bar's geometry each frame. The SVG viewBox is
// measured in px on init/resize, so bars are tall on a phone and wide on desktop with no
// horizontal scroll, ever. Beat 3 plays each good's real 1980→2024 series (from series.json)
// as the tide drains, so bars breathe (gas jitters, eggs spike) and settle at real heights.
// No-JS / reduced-motion content is the static skyline baked in TopStory.astro; this only enhances.

import seriesData from '../data/series.json';
import type { SeriesData, Good } from '../lib/types.ts';

const data = seriesData as unknown as SeriesData;
const NS = 'http://www.w3.org/2000/svg';

/* ---- goods: ascending real-2024 endpoint = a rising staircase left→right ---- */
interface Bar {
  id: string; good: Good; end: number; pole: 'up' | 'down';
  real: (number | null)[]; firstReal: number;
  rect: SVGElement; em: SVGElement; val: SVGElement; lab: SVGElement; tick: SVGElement;
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
let W = 0, H = 0, PL = 0, PR = 0, PT = 0, PB = 0, PW = 0, narrow = false, short = false;
let MK = 34, VF = 18, VGAP = 20;   // plate size, value type size, gap between them
const DMAX = 380;
function measure() {
  const box = viz!.parentElement as HTMLElement;
  W = Math.max(220, box.clientWidth);
  H = Math.max(220, box.clientHeight);
  viz!.setAttribute('viewBox', `0 0 ${W} ${H}`);
  narrow = W < 560;
  // a phone held sideways is wide but only ~180px of plot tall, so it needs the small stack even
  // though it is not "narrow" — sized off height, otherwise +248% draws off the top of the svg
  short = H < 430;
  MK = short ? 20 : narrow ? 24 : 34;         // the specimen plate above each bar
  // nine slots across ~332px of plot is ~37px each, and at 15px "+248%" renders ~54px, so
  // neighbouring readouts ran through each other — worst while they are all counting through the
  // same value on the way up. MK and VGAP stay: the plate size and the stack gap are not the
  // problem, and PT is derived from them.
  VF = short ? 10 : narrow ? 11 : 18;
  VGAP = short ? 12 : narrow ? 16 : 20;
  // no y-axis ticks any more — the plot runs nearly edge to edge, with headroom under the bars
  // for the item names, which are now Franklin at gallery size rather than 11px mono
  PL = narrow ? 14 : 16;
  PR = W - (narrow ? 14 : 16);
  // the plate and its % sit above the tallest bar, so the ceiling has to reserve their stack —
  // 9% of a short phone viewport does not, and college's +248% was clipping off the top
  PT = Math.round(H * 0.09) + MK + VGAP - 6;
  // a phone gets two staggered rows of names (nine slots across 360px is ~40px each, and
  // "Healthcare" is 64) so the deeper row needs its own headroom
  PB = H - (narrow ? 58 : 46);
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
function build() {
  while (viz!.firstChild) viz!.removeChild(viz!.firstChild);
  water = mk('rect', { class: 'tide', fill: 'var(--tide)', 'fill-opacity': 0 }); viz!.appendChild(water);
  base = mk('line', { class: 'base' }); viz!.appendChild(base);
  baselbl = mk('text', { class: 'baselbl' }, 'kept pace with inflation');
  yearlbl = mk('text', { class: 'yearlbl', 'text-anchor': 'end', opacity: 0 }); viz!.appendChild(yearlbl);
  bars = goods.map((g) => {
    const rect = mk('rect', { rx: 2.5, fill: col(g.pole), 'fill-opacity': 0.9 });
    // the plate: one <use> of the symbol TopStory defines, tinted to the bar's own pole
    const em = mk('use', { class: 'mark', href: `#mk-${g.id}`, style: `color:${col(g.pole)}` });
    const val = mk('text', { class: 'val', fill: col(g.pole), opacity: 0 });
    const lab = mk('text', { class: 'glab', opacity: 0 }, g.label);
    // leader for the lower of the two staggered name rows on a phone
    const tick = mk('line', { class: 'gtick', opacity: 0 });
    viz!.appendChild(rect); viz!.appendChild(em); viz!.appendChild(val);
    viz!.appendChild(tick); viz!.appendChild(lab);
    return { id: g.id, good: g, end: g.realIndexToday, pole: g.pole, real: g.real, firstReal: firstNonNull(g.real), rect, em, val, lab, tick };
  });
  // last, so it paints over the bars: during the drain every shallow bar's readout sweeps down
  // through the 100 line, and the fixed reference should survive that crossing, not the number
  // that is still moving
  viz!.appendChild(baselbl);
  layout();
}
/* The caption names the 100 line, so it wants to sit just above it — at the LEFT end, because the
   goods are sorted ascending and only the shallow bars reach here (the tall ones cross the line at
   the right). But every bar carries a plate-and-percent stack ~50px tall above its own top, and on
   a short plot — a phone held sideways gives the whole 380-point range about 150px — one of those
   stacks parks exactly where the caption goes. Which bar it is depends on the scale, so bound it
   rather than special-casing: lift clear of any readout sharing the caption's lane, measured at
   settled values so the caption never moves while you scrub. */
function placeCaption() {
  const fs = narrow ? 12 : 11;
  baselbl.setAttribute('x', String(PL));
  const capW = (baselbl as unknown as SVGTextContentElement).getComputedTextLength?.() || fs * 6;
  const lane = PL + capW + 6;
  // ascent, descent — generous, and +2 for the 3px paper knockout these labels are painted with
  const up = (s: number) => s + 2, down = (s: number) => s * 0.35 + 2;
  let y = y100() - 6;
  for (let i = 0; i < bars.length; i++) {
    if (xFor(i) - VF * 2.4 > lane) break;                 // ordered left→right — past the caption
    const vb = yFor(bars[i].end) - MK - VGAP;             // that bar's settled % baseline
    if (y + down(fs) > vb - up(VF) && y - up(fs) < vb + down(VF)) y = vb - up(VF) - down(fs) - 4;
  }
  baselbl.setAttribute('y', String(Math.round(y)));
}

function layout() {
  base.setAttribute('x1', String(PL)); base.setAttribute('y1', String(y100()));
  base.setAttribute('x2', String(PR)); base.setAttribute('y2', String(y100()));
  baselbl.textContent = narrow || short ? 'kept pace' : 'kept pace with inflation';
  baselbl.setAttribute('font-size', String(narrow ? 12 : 11));
  placeCaption();
  yearlbl.setAttribute('x', String(PR)); yearlbl.setAttribute('y', String(PT + 4));
  yearlbl.setAttribute('font-size', String(narrow ? 22 : 30));
  water.setAttribute('x', String(PL)); water.setAttribute('width', String(PW));
  const bw = barW();
  bars.forEach((b, i) => {
    const x = xFor(i);
    b.rect.setAttribute('x', String(x - bw / 2)); b.rect.setAttribute('width', String(bw));
    b.em.setAttribute('x', String(x - MK / 2));
    b.em.setAttribute('width', String(MK)); b.em.setAttribute('height', String(MK));
    // narrow keeps the readout small: nine slots across a phone leaves ~40px each, and a
    // gallery-sized "+248%" would run straight through its neighbours
    b.val.setAttribute('x', String(x)); b.val.setAttribute('font-size', String(VF));
    // Names always show. They used to be hidden at this width and revealed one at a time by the
    // tour beats — but those beats were removed with the old Ranking section, so a phone reached
    // the payoff chart and found nine unlabelled drawings. Two staggered rows fit all nine, and
    // the lower row gets a leader so it stays obvious which bar it belongs to.
    const row2 = narrow && i % 2 === 1;
    b.lab.setAttribute('x', String(x)); b.lab.setAttribute('font-size', String(narrow ? 11 : 14));
    b.lab.setAttribute('y', String(PB + (narrow ? (row2 ? 33 : 17) : 22)));
    b.tick.setAttribute('x1', String(x)); b.tick.setAttribute('x2', String(x));
    b.tick.setAttribute('y1', String(PB + 3)); b.tick.setAttribute('y2', String(PB + 22));
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
    b.em.setAttribute('y', String(y - 6 - MK)); b.em.setAttribute('opacity', o.toFixed(3));
    // A bar and its name arrive together. The stamp is named from the first frame (appear = 1 all
    // through the teach beat) and the other eight are named exactly as they fade in on the handoff.
    // They used to wait for the split to resolve, which left the teach beat showing an unnamed bar
    // and the group arriving as eight anonymous ones.
    const labO = appear * (dim ? 0.35 : 1);
    b.lab.setAttribute('opacity', labO.toFixed(3));
    b.tick.setAttribute('opacity', (narrow && i % 2 === 1 ? labO * 0.5 : 0).toFixed(3));

    // value readout: the teach stamp shows cents; after the handoff every bar carries its live
    // distance from the 100 line as a percentage — with the axis ticks gone the number has to say
    // what it means on its own, and it's the same readout the gallery below lands on.
    let txt: string | null = null;
    if (isStamp && p < 0.235) txt = tDrain > 0.5 ? 'real ≈ 12¢' : (tRise > 0.4 ? '68¢' : '15¢');
    else if (p >= 0.30) { const d = Math.round(v - 100); txt = `${d >= 0 ? '+' : '−'}${Math.abs(d)}%`; }
    if (txt) {
      b.val.setAttribute('y', String(y - MK - VGAP));
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
// The stage now ends at the split-settle: beats 2–3 (teach + split) fill the whole scrolly,
// then the specimen hall (#prism) takes over below. Raw scroll [0,1] maps to [0,SPLIT_END]
// so teach + split render EXACTLY as before (their windows/thresholds untouched); the old tour +
// verdict beats — removed from the DOM — are simply never reached.
const SPLIT_END = 0.5;
let curP = 0, tgtP = 0, ticking = false;
function computeProgress(): number {
  const r = scrolly!.getBoundingClientRect();
  const total = scrolly!.offsetHeight - stage!.offsetHeight;
  return clamp(-r.top / (total || 1)) * SPLIT_END;
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
