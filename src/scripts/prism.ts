// PRISM — the spine.
// Scroll walks a highlight down one always-visible chart of all nine, and the verdict card tracks
// it. Every length in the chart is server-rendered from ITEMS; this file computes no scale. It
// decides which row is active, where the card sits, and where the leader elbow goes.
// Enhancement only — without JS the authored gallery carries all nine.
// Reduced motion still walks: the highlight and the card only ever move with the finger, and that
// is the content, not decoration. Bailing here left a phone with Reduce Motion on — a common
// setting — with no chart and nothing to tap. What gets dropped below is the motion that runs on
// its own (the eased catch-up, the counting number, the card's swap, the smooth-scrolled jump).
import { ITEMS, sparkPath } from '../lib/items.ts';

const section = document.getElementById('prism');
const scroll = document.getElementById('prScroll');
const stage = document.getElementById('prStage');
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const flat = location.search.includes('flat'); // escape hatch: force the authored gallery

if (section && scroll && stage && !flat) init(section, scroll, stage);

function init(section: HTMLElement, scroll: HTMLElement, stage: HTMLElement) {
  const N = ITEMS.length;
  const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const chart = document.getElementById('spChart');
  const card = document.getElementById('spCard');
  if (!chart || !card) return;

  // reveal the chart first so the sticky stage has real dimensions to measure
  scroll.style.height = `${N * 82 + 44}vh`;
  section.setAttribute('data-driven', '');

  const rows = Array.from(chart.querySelectorAll<HTMLElement>('.sp-row'));
  const leader = document.getElementById('spLeader');
  const line = leader?.querySelector('polyline');
  const phone = window.matchMedia('(max-width: 860px)');
  // read once from the markup — the same numbers the CSS lays the bars out with, so the leader
  // can never disagree with the chart it is pointing at
  const tipPct = rows.map((r) => parseFloat(r.style.getPropertyValue('--tip')));

  const HOLD = 0.34;   // share of each segment spent parked on an item, not travelling
  // The walk finishes before the scroll does. p = 1 is the exact instant the sticky stage releases,
  // so a walk that ran to p = 1 parked on the ninth item and immediately began sliding away —
  // College at +248%, the whole point of the piece, was the only one that never got a dwell.
  const WALK = 0.88;
  // The card travels a share of the column's SLACK (see prism.css), not of its height, so these
  // are damping only — the card cannot leave the stage at any value. Short of the ends so it
  // breathes rather than butting the column's edges; the leader carries the precise tie.
  const TOP_LO = 10, TOP_HI = 90;

  // The highlight dwells on each item, then moves; walking at constant speed would leave you
  // between two rows most of the time. Same beat as the top chart's captions — and the jump
  // inverse below depends on it.
  function walk(p: number) {
    const seg = clamp(p / WALK) * (N - 1);
    const i = Math.min(N - 2, Math.floor(seg));
    const k = clamp((seg - i - HOLD) / (1 - 2 * HOLD));
    return { at: i + (k > 0.5 ? 1 : 0), frac: clamp(p / WALK) };
  }

  const el = {
    use: document.getElementById('spUse')!, name: document.getElementById('spName')!,
    pct: document.getElementById('spPct')!, head: document.getElementById('spHead')!,
    blurb: document.getElementById('spBlurb')!, spark: document.getElementById('spSpark')!,
  };

  let active = -1, shown = 0, target = 0;
  function setActive(i: number) {
    if (i === active) return;
    const it = ITEMS[i];
    card.style.setProperty('--good', it.color);
    card.style.setProperty('--good-ink', it.colorInk);
    el.use.setAttribute('href', `#mk-${it.id}`);
    el.name.textContent = it.label;
    el.head.textContent = it.head;
    el.blurb.textContent = it.blurb;
    const sp = sparkPath(it.real, 168, 52);
    el.spark.innerHTML =
      `<line class="base" x1="0" y1="${sp.baseY.toFixed(1)}" x2="168" y2="${sp.baseY.toFixed(1)}"/>` +
      `<path class="ln" d="${sp.d}"/>` +
      `<circle class="dot" cx="${sp.endX.toFixed(1)}" cy="${sp.endY.toFixed(1)}" r="2.8"/>`;
    rows.forEach((r, k) => r.toggleAttribute('data-on', k === i));
    leader?.style.setProperty('--good', it.color);
    if (active !== -1) {                 // restart the swap fade; not on first paint
      card.removeAttribute('data-swap');
      void card.offsetWidth;             // force the reflow that lets the animation retrigger
      card.setAttribute('data-swap', '');
    }
    if (active === -1) shown = it.pct;   // first paint matches the server-rendered number
    target = it.pct;
    active = i;
  }

  // Reading getBoundingClientRect() every frame thrashes layout, so the boxes the leader needs are
  // cached here and only re-read on resize. Coordinates are relative to the chart's own box, which
  // is the leader svg's coordinate system.
  let box = { w: 0, h: 0, reserve: 0, cardL: 0, colT: 0, colH: 0 };
  function measure() {
    const col = card.parentElement as HTMLElement;
    const c = chart!.getBoundingClientRect(), k = card.getBoundingClientRect(), q = col.getBoundingClientRect();
    box = {
      w: c.width, h: c.height,
      reserve: parseFloat(getComputedStyle(rows[0]).marginLeft) || 0,
      cardL: k.left - c.left, colT: q.top - c.top, colH: q.height,
    };
  }

  let cur = 0, tgt = 0, raf = 0, last = 0;
  const progress = () => {
    const total = scroll.offsetHeight - stage.offsetHeight;
    return clamp(-scroll.getBoundingClientRect().top / (total || 1));
  };

  // Past the last item the sticky stage releases and scrolls away with the page. Fade the whole
  // stage over its exit so the chart closes instead of coming apart.
  function exit() {
    const h = stage.offsetHeight || 1;
    const bottom = scroll.getBoundingClientRect().bottom;
    // Once released the stage's top rides at (container bottom − h), so `bottom` counts the exit
    // down from h. It cannot simply run to 0: the page below is shorter than the stage is tall, so
    // the container never clears the screen and a half-lit verdict stayed pinned over the sources.
    // End the fade at whatever `bottom` reads once the document is fully scrolled.
    const end = Math.max(0, bottom + window.scrollY -
      (document.documentElement.scrollHeight - window.innerHeight));
    stage.style.opacity = clamp((bottom - end) / Math.max(1, h - end)).toFixed(3);
  }

  function frame(now = performance.now()) {
    raf = 0;
    // time-based easing, so a throttled tab or a slow phone catches up instead of crawling
    const dt = Math.min(200, last ? now - last : 16.7); last = now;
    cur += reduced ? tgt - cur : (tgt - cur) * (1 - Math.pow(0.89, dt / 16.7));
    if (reduced || Math.abs(tgt - cur) < 0.0002) cur = tgt;

    const { at, frac } = walk(cur);
    setActive(at);

    const topPct = TOP_LO + (TOP_HI - TOP_LO) * frac;
    card.style.setProperty('--top', `${topPct.toFixed(2)}%`);

    // the leader is hidden by CSS on a phone, so none of this is worth doing there
    if (line && !phone.matches) {
      const rowY = ((at + 0.5) / N) * box.h;
      const plotL = box.reserve, plotW = box.w - 2 * box.reserve;
      const tipX = plotL + (tipPct[at] / 100) * plotW;
      const cardY = box.colT + (topPct / 100) * (box.colH - card.offsetHeight) + card.offsetHeight / 2;
      const midX = (tipX + box.cardL) / 2;
      line.setAttribute('points',
        `${tipX.toFixed(1)},${rowY.toFixed(1)} ${midX.toFixed(1)},${rowY.toFixed(1)} ` +
        `${midX.toFixed(1)},${cardY.toFixed(1)} ${box.cardL.toFixed(1)},${cardY.toFixed(1)}`);
    }

    section.toggleAttribute('data-walking', cur > 0.02);
    if (shown !== target) {
      shown += reduced ? target - shown : (target - shown) * 0.18;
      if (reduced || Math.abs(target - shown) < 0.5) shown = target;
      const v = Math.round(shown);
      el.pct.textContent = `${v >= 0 ? '+' : '−'}${Math.abs(v)}%`;
    }

    if (cur !== tgt) schedule();
  }
  function schedule() { if (!raf) raf = requestAnimationFrame(frame); }

  // Tapping a row walks to that item. The chart is the only map of the nine, so it should work as
  // one rather than just report position — most of all on a phone, where the bars are the whole
  // cross-item view. The bar and its label are one target: the whole row.
  // Inverse of walk(): at seg = i + HOLD/2 the highlight is parked square on item i, and the last
  // one only lands at the end — without the WALK factor every jump falls short of its item by the
  // length of the trailing dwell.
  chart.addEventListener('click', (e) => {
    const row = (e.target as HTMLElement).closest('.sp-row');
    if (!row || !chart.contains(row)) return;
    const i = Number(row.getAttribute('data-i'));
    if (!Number.isFinite(i)) return;
    const total = scroll.offsetHeight - stage.offsetHeight;
    const p = WALK * (i >= N - 1 ? 1 : (i + HOLD / 2) / (N - 1));
    const top = window.scrollY + scroll.getBoundingClientRect().top + total * p;
    window.scrollTo({ top, behavior: reduced ? 'auto' : 'smooth' });
  });

  window.addEventListener('scroll', () => { tgt = progress(); exit(); schedule(); }, { passive: true });
  window.addEventListener('resize', () => { measure(); tgt = progress(); exit(); schedule(); });
  measure();
  tgt = cur = progress();
  exit();
  frame(performance.now());
}
