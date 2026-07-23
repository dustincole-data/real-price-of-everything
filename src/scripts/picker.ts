// The interactive ending (§6). You-Draw-It, one good at a time: a single "today"
// handle pivots a straight guess-line from the 1980 = 100 anchor; release reveals the
// true real trajectory + the gap. All 9 on the scroll's exact lens (real index,
// 1980 = 100). Client-side only — guesses live in memory, truth is baked (constraint 3).

import seriesData from '../data/series.json';
import type { SeriesData, Good } from '../lib/types.ts';
import { plotW, plotH, xAtYear, yAtValue, fanPoints, linePath, assignFanColors, clamp } from '../lib/chart.ts';

const data = seriesData as unknown as SeriesData;
const { years, latestYear } = data.meta;
const NS = 'http://www.w3.org/2000/svg';
const YMAX = 380; // same lens as the scroll fan
const colors = assignFanColors(data.goods);
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const GF = { W: 1000, H: 520, padL: 54, padR: 74, padT: 34, padB: 46 };
const xAt = (yr: number) => xAtYear(yr, years[0], latestYear, GF);
const yAt = (v: number) => yAtValue(v, 0, YMAX, GF);
const X_NOW = GF.padL + plotW(GF);
const X_BASE = xAt(years[0]);

function el<K extends string>(tag: K, attrs: Record<string, string | number> = {}): SVGElement {
  const n = document.createElementNS(NS, tag);
  for (const k in attrs) n.setAttribute(k, String(attrs[k]));
  return n;
}
const $ = <T extends Element>(sel: string) => document.querySelector(sel) as T;

// ---- state ----
const guesses = new Map<string, number>(); // working + committed handle value per good
const seen = new Set<string>(); // goods whose truth has been revealed
let current: Good | null = null;
let touched = false;
let revealed = false;

const svg = $<SVGSVGElement>('#guess');
const holder = $<HTMLElement>('#guess-holder');
const promptEl = $<HTMLElement>('#guess-prompt');
const revealEl = $<HTMLElement>('#guess-reveal');
const chips = Array.from(document.querySelectorAll<HTMLButtonElement>('.chip'));
const capBtn = $<HTMLButtonElement>('#capstone-btn');
const capBox = $<HTMLElement>('#capstone');

// ---- static skeleton (axis + baseline), built once ----
const axisG = el('g');
const dynG = el('g'); // per-good line + handle + markers
function buildSkeleton() {
  const plotRight = X_NOW;
  for (const v of [0, 100, 200, 300]) {
    const y = yAt(v);
    axisG.appendChild(el('line', { class: `axis-rule${v === 0 ? ' zero' : ''}`, x1: GF.padL, y1: y, x2: plotRight, y2: y }));
    const t = el('text', { class: 'axis-tick', x: GF.padL - 10, y: y + 4, 'text-anchor': 'end' }); t.textContent = String(v);
    axisG.appendChild(t);
  }
  for (const yr of [1980, 1990, 2000, 2010, 2020]) {
    const t = el('text', { class: 'axis-tick', x: xAt(yr), y: GF.H - GF.padB + 22, 'text-anchor': 'middle' }); t.textContent = String(yr);
    axisG.appendChild(t);
  }
  const by = yAt(100);
  axisG.appendChild(el('line', { class: 'baseline-line', x1: GF.padL, y1: by, x2: plotRight, y2: by }));
  const bl = el('text', { class: 'baseline-lbl', x: GF.padL, y: by - 8 }); bl.textContent = '100 = kept pace with inflation';
  axisG.appendChild(bl);
  svg.appendChild(axisG);
  svg.appendChild(dynG);
}

// ---- render the guess stage for a good ----
function anchorPrompt(g: Good): string {
  if (g.tangible) {
    return `A ${g.unit} cost about ${g.nominalThen} in ${g.nominalThenYear} and about ${g.nominalNow} today. Strip out inflation. Where does it land?`;
  }
  return `In ${data.meta.baseYear}, ${g.label.toLowerCase()} sat at 100. Where does it sit now, in real terms?`;
}

let handleG: SVGElement, ghost: SVGElement, valLbl: SVGElement;
function renderEmpty(g: Good) {
  revealed = false; touched = false;
  dynG.innerHTML = '';
  const start = seen.has(g.id) ? (guesses.get(g.id) ?? 100) : 100;

  ghost = el('line', { x1: X_BASE, y1: yAt(100), x2: X_NOW, y2: yAt(start), stroke: 'var(--ink-muted)', 'stroke-width': 2, 'stroke-dasharray': '2 5', 'stroke-linecap': 'round' });
  dynG.appendChild(ghost);
  // 1980 anchor dot
  dynG.appendChild(el('circle', { cx: X_BASE, cy: yAt(100), r: 4, fill: 'var(--ink)' }));
  // handle (accessible slider)
  handleG = el('g', { class: 'guess-handle', role: 'slider', tabindex: '0', 'aria-label': `Your guess for ${g.label}: real price index today, 100 means it kept pace with inflation`, 'aria-valuemin': '0', 'aria-valuemax': String(YMAX), 'aria-valuenow': String(start), 'aria-orientation': 'vertical' });
  handleG.appendChild(el('circle', { cx: X_NOW, cy: yAt(start), r: 9 }));
  valLbl = el('text', { class: 'guess-hint', x: X_NOW + 12, y: yAt(start) + 4 }); valLbl.textContent = String(Math.round(start));
  handleG.appendChild(valLbl);
  dynG.appendChild(handleG);

  setHandle(start, false);
  wireHandle(g);

  promptEl.innerHTML = `Drag the handle. 100 means it kept pace with inflation. Let go to see the real line.<span class="anchor">${anchorPrompt(g)}</span>`;
  promptEl.hidden = false;
  revealEl.innerHTML = '';
}

function setHandle(value: number, markTouched = true) {
  if (revealed) return; // frozen once the truth is shown
  const v = clamp(value, 0, YMAX);
  const y = yAt(v);
  handleG.querySelector('circle')!.setAttribute('cy', String(y));
  valLbl.setAttribute('y', String(y + 4));
  valLbl.textContent = String(Math.round(v));
  ghost.setAttribute('y2', String(y));
  handleG.setAttribute('aria-valuenow', String(Math.round(v)));
  handleG.setAttribute('aria-valuetext', `${Math.round(v)}, ${v > 105 ? 'above' : v < 95 ? 'below' : 'at'} the inflation line`);
  if (current) guesses.set(current.id, v);
  if (markTouched) touched = true;
}

// pointer + keyboard on the handle
function wireHandle(g: Good) {
  const clientYToValue = (clientY: number) => {
    const r = svg.getBoundingClientRect();
    const vy = ((clientY - r.top) / r.height) * GF.H; // to viewBox space
    return YMAX * (GF.padT + plotH(GF) - vy) / plotH(GF);
  };
  handleG.addEventListener('pointerdown', (e) => {
    (e.target as Element).setPointerCapture?.((e as PointerEvent).pointerId);
    e.preventDefault();
  });
  handleG.addEventListener('pointermove', (e) => {
    const pe = e as PointerEvent;
    if (pe.pressure === 0 && pe.buttons === 0) return;
    setHandle(clientYToValue(pe.clientY));
  });
  handleG.addEventListener('pointerup', () => { if (touched && !revealed) reveal(g); });
  handleG.addEventListener('keydown', (e) => {
    const ke = e as KeyboardEvent;
    const cur = guesses.get(g.id) ?? 100;
    let nv = cur;
    if (ke.key === 'ArrowUp' || ke.key === 'ArrowRight') nv = cur + (ke.shiftKey ? 10 : 2);
    else if (ke.key === 'ArrowDown' || ke.key === 'ArrowLeft') nv = cur - (ke.shiftKey ? 10 : 2);
    else if (ke.key === 'PageUp') nv = cur + 20;
    else if (ke.key === 'PageDown') nv = cur - 20;
    else if (ke.key === 'Home') nv = 0;
    else if (ke.key === 'End') nv = YMAX;
    else if (ke.key === 'Enter' || ke.key === ' ') { e.preventDefault(); if (touched && !revealed) reveal(g); return; }
    else return;
    e.preventDefault();
    setHandle(nv);
  });
}

// ---- reveal the truth + the gap ----
function reveal(g: Good) {
  revealed = true;
  seen.add(g.id);
  const guess = guesses.get(g.id) ?? 100;
  const stroke = colors.get(g.id)!;
  const truth = g.realIndexToday;

  // true trajectory
  const pts = fanPoints(g.real, years, 0, YMAX, GF, 1);
  const truePath = el('path', { d: linePath(pts), fill: 'none', stroke, 'stroke-width': 2.6, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' });
  dynG.insertBefore(truePath, handleG); // under the handle
  if (!reduced) {
    const len = (truePath as SVGPathElement).getTotalLength();
    truePath.setAttribute('stroke-dasharray', String(len));
    truePath.setAttribute('stroke-dashoffset', String(len));
    (truePath as SVGPathElement).getBoundingClientRect();
    (truePath as unknown as HTMLElement).style.transition = 'stroke-dashoffset 1.1s cubic-bezier(.4,0,.15,1)';
    truePath.setAttribute('stroke-dashoffset', '0');
  }
  // true endpoint dot
  dynG.appendChild(el('circle', { cx: X_NOW, cy: yAt(truth), r: 4.5, fill: stroke }));
  // gap between guess and truth at "today"
  dynG.appendChild(el('line', { x1: X_NOW, y1: yAt(guess), x2: X_NOW, y2: yAt(truth), stroke: 'var(--ink-muted)', 'stroke-width': 1.5, 'stroke-dasharray': '2 3' }));
  // freeze the ghost line to muted, keep guess marker
  ghost.setAttribute('stroke', 'var(--ink-faint)');

  // copy (direction clause from the build flag — constraint 2)
  const gap = Math.round(Math.abs(guess - truth));
  const overUnder = guess > truth ? 'too high' : guess < truth ? 'too low' : 'exactly right';
  let html = `Real index today: <span class="big">${truth}</span>. Your pin: <span class="big">${Math.round(guess)}</span>, off by <span class="big">${gap}</span> (${overUnder}). ` +
    `In real terms, ${g.label.toLowerCase()} <b>${g.direction}</b> since ${data.meta.baseYear}.`;
  if (g.tangible) {
    html += `<span class="callout">A ${g.unit} cost <span class="mono">${g.nominalThen}</span> in ${g.nominalThenYear}. At inflation, that is <span class="mono">${g.keptPaceDollar}</span> today. Actual: <span class="mono">${g.nominalNow}</span>.</span>`;
  } else if (g.footnote) {
    html += `<span class="callout">${g.footnote}</span>`;
  }
  revealEl.innerHTML = html;
  promptEl.hidden = true;

  // seen state + capstone unlock
  const chip = chips.find((c) => c.dataset.good === g.id)!;
  chip.setAttribute('data-seen', '');
  capBtn.hidden = false;
}

// ---- chips ----
function selectGood(id: string) {
  const g = data.goods.find((x) => x.id === id)!;
  current = g;
  chips.forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.good === id)));
  holder.hidden = false;
  renderEmpty(g);
  if (seen.has(id)) reveal(g); // re-picking a seen good returns its revealed state + prior guess
  handleG.focus?.();
}
chips.forEach((c) => c.addEventListener('click', () => selectGood(c.dataset.good!)));
chips.forEach((c) => c.setAttribute('aria-pressed', 'false'));

// ---- capstone (client-side only) ----
function buildCapstone() {
  capBox.innerHTML = '';
  const CW = 1000, CH = 460, pl = 54, pr = 74, pt = 30, pb = 44;
  const cx = (yr: number) => pl + ((yr - years[0]) / (latestYear - years[0])) * (CW - pl - pr);
  const cy = (v: number) => pt + (CH - pt - pb) - (v / YMAX) * (CH - pt - pb);
  const s = document.createElementNS(NS, 'svg');
  s.setAttribute('viewBox', `0 0 ${CW} ${CH}`); s.setAttribute('class', 'chart'); s.setAttribute('role', 'img');
  s.setAttribute('aria-label', 'Every good you guessed, your pins laid against the true real lines.');
  for (const v of [0, 100, 200, 300]) {
    const y = cy(v);
    s.appendChild(el('line', { class: `axis-rule${v === 0 ? ' zero' : ''}`, x1: pl, y1: y, x2: CW - pr, y2: y }));
    const t = el('text', { class: 'axis-tick', x: pl - 10, y: y + 4, 'text-anchor': 'end' }); t.textContent = String(v); s.appendChild(t);
  }
  s.appendChild(el('line', { class: 'baseline-line', x1: pl, y1: cy(100), x2: CW - pr, y2: cy(100) }));
  // true lines (guessed = full color, unguessed = faint) + guess dots
  const ordered = [...data.goods].sort((a, b) => (a.pole === b.pole ? 0 : a.pole === 'down' ? -1 : 1));
  for (const g of ordered) {
    const stroke = colors.get(g.id)!;
    const guessed = guesses.has(g.id);
    const pts: [number, number][] = [];
    g.real.forEach((rv, i) => { if (rv != null) pts.push([cx(years[i]), cy(rv)]); });
    s.appendChild(el('path', { d: linePath(pts), fill: 'none', stroke, 'stroke-width': guessed ? 2.4 : 1.4, 'stroke-opacity': guessed ? 1 : 0.22, 'stroke-linejoin': 'round' }));
    if (guessed) {
      const gv = guesses.get(g.id)!;
      s.appendChild(el('line', { x1: CW - pr, y1: cy(gv), x2: CW - pr, y2: cy(g.realIndexToday), stroke: 'var(--ink-muted)', 'stroke-width': 1.4, 'stroke-dasharray': '2 3' }));
      s.appendChild(el('circle', { cx: CW - pr, cy: cy(gv), r: 5, fill: 'none', stroke, 'stroke-width': 2.5 })); // your pin (hollow)
      s.appendChild(el('circle', { cx: CW - pr, cy: cy(g.realIndexToday), r: 4, fill: stroke })); // truth (solid)
      const lbl = el('text', { class: 'line-lbl', x: CW - pr + 10, y: cy(g.realIndexToday), fill: stroke }); lbl.textContent = g.label; s.appendChild(lbl);
    }
  }
  capBox.appendChild(s);
  const cap = document.createElement('p');
  cap.className = 'cap-caption';
  cap.textContent = 'Your pins (hollow), laid against the real lines (solid). Nine everyday things on one axis, 1980 = 100. Some fell. Some climbed. You can see where you expected which.';
  capBox.appendChild(cap);
}
capBtn.addEventListener('click', () => {
  buildCapstone();
  capBox.hidden = false;
  capBox.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
});

buildSkeleton();
