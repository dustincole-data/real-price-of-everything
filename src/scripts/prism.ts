// Variation 1 · PRISM — the specimen hall.
// Scroll dollies a CSS-3D camera down a white hall of nine glass specimens, each hung off the same
// dashed 100 line the top chart draws. No WebGL and no bloom pass: on paper, depth comes from
// perspective plus fading into the paper itself, which is cheaper, sharper and works on a phone.
// Enhancement only — without JS or under reduced-motion the authored gallery carries all nine.
import { ITEMS, sparkPath } from '../lib/items.ts';

const section = document.getElementById('prism');
const scroll = document.getElementById('prScroll');
const stage = document.getElementById('prStage');
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const flat = location.search.includes('flat'); // escape hatch: force the authored gallery

if (section && scroll && stage && !reduced && !flat) init(section, scroll, stage);

function init(section: HTMLElement, scroll: HTMLElement, stage: HTMLElement) {
  const N = ITEMS.length;
  const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const specs = ITEMS.map((_, i) => document.getElementById(`prSpec${i}`) as HTMLElement);
  if (specs.some((s) => !s)) return;

  // reveal the hall first so the sticky stage has real dimensions to measure
  scroll.style.height = `${N * 82 + 44}vh`;
  section.setAttribute('data-driven', '');

  const gapOf = () => parseFloat(getComputedStyle(section).getPropertyValue('--gap')) || 900;
  let GAP = gapOf();
  const AHEAD = 1.5;   // how many gaps ahead a specimen starts fading up out of the paper
  const PAST = 0.45;   // and how fast it fades once you've flown through it
  const HOLD = 0.34;   // share of each segment spent parked on a specimen, not travelling

  // The camera dwells on each specimen, then moves; a constant-speed dolly would leave you between
  // two half-faded objects most of the time. Same beat structure as the top chart's captions.
  function dolly(p: number) {
    const seg = p * (N - 1);
    const i = Math.min(N - 2, Math.floor(seg));
    const k = clamp((seg - i - HOLD) / (1 - 2 * HOLD));
    return { z: (i + k * k * (3 - 2 * k)) * GAP, at: i + (k > 0.5 ? 1 : 0) };
  }

  const hud = document.getElementById('prHud')!;
  const el = {
    rank: document.getElementById('prRank')!, name: document.getElementById('prName')!,
    pct: document.getElementById('prPct')!, head: document.getElementById('prHead')!,
    blurb: document.getElementById('prBlurb')!, spark: document.getElementById('prSpark')!,
  };
  const railItems = Array.from(document.querySelectorAll<HTMLElement>('#prRail li'));

  let active = -1, shown = 0, target = 0;
  function setActive(i: number) {
    if (i === active) return;
    const it = ITEMS[i];
    hud.style.setProperty('--good', it.color);
    hud.style.setProperty('--good-ink', it.colorInk);
    el.rank.textContent = String(i + 1).padStart(2, '0');
    el.name.textContent = it.label;
    el.head.textContent = it.head;
    el.blurb.textContent = it.blurb;
    const sp = sparkPath(it.real, 168, 52);
    el.spark.innerHTML =
      `<line class="base" x1="0" y1="${sp.baseY.toFixed(1)}" x2="168" y2="${sp.baseY.toFixed(1)}"/>` +
      `<path class="ln" d="${sp.d}"/>` +
      `<circle class="dot" cx="${sp.endX.toFixed(1)}" cy="${sp.endY.toFixed(1)}" r="2.8"/>`;
    railItems.forEach((li, k) => li.classList.toggle('on', k === i));
    hud.classList.add('is-on');
    if (active === -1) shown = it.pct;  // first paint matches the server-rendered number
    target = it.pct;
    active = i;
  }

  let cur = 0, tgt = 0, raf = 0, last = 0;
  const progress = () => {
    const total = scroll.offsetHeight - stage.offsetHeight;
    return clamp(-scroll.getBoundingClientRect().top / (total || 1));
  };

  function frame(now = performance.now()) {
    raf = 0;
    // time-based easing, so a throttled tab or a slow phone catches up instead of crawling
    const dt = Math.min(200, last ? now - last : 16.7); last = now;
    cur += (tgt - cur) * (1 - Math.pow(0.89, dt / 16.7));
    if (Math.abs(tgt - cur) < 0.0002) cur = tgt;

    const { z: camZ, at } = dolly(cur);

    specs.forEach((s, i) => {
      const z = camZ - i * GAP;
      // 1.3× so the focused specimen sits at full strength through its whole dwell
      const o = z <= 0 ? clamp(1.3 * (1 + z / (AHEAD * GAP))) : clamp(1 - z / (PAST * GAP));
      if (o <= 0.004) {
        if (!s.hasAttribute('data-far')) s.setAttribute('data-far', '');
        return;
      }
      s.removeAttribute('data-far');
      s.style.setProperty('--z', `${z.toFixed(1)}px`);
      s.style.setProperty('--o', o.toFixed(3));
    });

    setActive(at);
    section.toggleAttribute('data-walking', cur > 0.02);
    if (shown !== target) {
      shown += (target - shown) * 0.18;
      if (Math.abs(target - shown) < 0.5) shown = target;
      const v = Math.round(shown);
      el.pct.textContent = `${v >= 0 ? '+' : '−'}${Math.abs(v)}%`;
    }

    if (cur !== tgt) schedule();
  }
  function schedule() { if (!raf) raf = requestAnimationFrame(frame); }

  window.addEventListener('scroll', () => { tgt = progress(); schedule(); }, { passive: true });
  window.addEventListener('resize', () => { GAP = gapOf(); tgt = progress(); schedule(); });
  tgt = cur = progress();
  frame(performance.now());
}
