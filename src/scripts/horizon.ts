// Variation 3 · HORIZON — the filmstrip.
// Wide screens: vertical scroll pans the nine panels sideways across bare paper, the active
// % counts up and the docked mini-skyline pins the item you're on. Small screens
// keep a real swipeable snap-carousel (CSS) and only borrow the pin tracking. Enhancement only:
// without JS the panels stack and the authored gallery is fully readable.
import { ITEMS } from '../lib/items.ts';

const root = document.getElementById('horizon');
const scroll = document.getElementById('hzScroll');
const stage = document.getElementById('hzStage');
const track = document.getElementById('hzTrack');
const pin = document.getElementById('hzPin');
const live = document.getElementById('hzLive');
const rects = Array.from(document.querySelectorAll<SVGRectElement>('.hz-strip-svg rect'));
const panels = Array.from(document.querySelectorAll<HTMLElement>('.hz-panel'));
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const N = panels.length;

const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const fmt = (v: number) => `${v >= 0 ? '+' : '−'}${Math.abs(v)}%`;
const counted = new Set<number>();

function countUp(el: HTMLElement) {
  const to = parseFloat(el.dataset.target || '0');
  const t0 = performance.now(), dur = 850;
  const tick = (now: number) => {
    const p = Math.min(1, (now - t0) / dur);
    el.textContent = fmt(Math.round(to * (1 - Math.pow(1 - p, 3))));
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

// shared readouts: which of the nine you're on
function mark(i: number) {
  const it = ITEMS[i];
  rects.forEach((r, k) => r.classList.toggle('dim', k !== i));
  if (pin) {
    const w = (pin.parentElement as HTMLElement).clientWidth;
    pin.style.transform = `translateX(${(((i + 0.5) / N) * w).toFixed(1)}px)`;
    pin.style.opacity = '1';
    pin.style.setProperty('--good', it.color);
  }
  if (live) {
    live.textContent = `${it.label} · ${fmt(it.pct)}`;
    live.style.setProperty('--good', it.colorInk);
    live.classList.add('is-on');
  }
  if (!counted.has(i)) {
    const pct = panels[i].querySelector<HTMLElement>('.nine-pct');
    if (pct) { counted.add(i); if (!reduced) countUp(pct); }
  }
}

// ---- wide: vertical scroll pans the track ----
function pan(root: HTMLElement, scroll: HTMLElement, stage: HTMLElement, track: HTMLElement) {
  root.setAttribute('data-driven', '');
  root.setAttribute('data-hz-pan', '');
  scroll.style.height = `${N * 95}vh`;

  let cur = 0, tgt = 0, raf = 0, last = -1, prev = 0;
  // /0.93 leaves a tail of travel where the pan has finished, so the ninth panel gets a beat of its
  // own instead of only being square in frame at the single last pixel of the scroll
  const progress = () => {
    const total = scroll.offsetHeight - stage.offsetHeight;
    return clamp(-scroll.getBoundingClientRect().top / (total || 1) / 0.93);
  };

  // Each panel parks in frame for a beat before the strip moves on. Without the hold you spend most
  // of the scroll looking at one item's chart next to the next item's headline.
  const HOLD = 0.3;
  function station(p: number) {
    const seg = p * (N - 1);
    const i = Math.min(N - 2, Math.floor(seg));
    const k = clamp((seg - i - HOLD) / (1 - 2 * HOLD));
    return { at: i + (k > 0.5 ? 1 : 0), x: i + k * k * (3 - 2 * k) };
  }

  function frame(now = performance.now()) {
    raf = 0;
    // time-based easing, so a throttled tab or a slow phone catches up instead of crawling
    const dt = Math.min(200, prev ? now - prev : 16.7); prev = now;
    const vw = window.innerWidth;
    const { at, x } = station(tgt);
    const to = x * vw;
    cur += (to - cur) * (1 - Math.pow(0.87, dt / 16.7));
    if (Math.abs(to - cur) < 0.4) cur = to;
    track.style.transform = `translate3d(${-cur.toFixed(1)}px,0,0)`;

    root.toggleAttribute('data-panning', tgt > 0.02);
    const i = Math.max(0, Math.min(N - 1, at));
    if (i !== last) { last = i; mark(i); }
    if (cur !== to) schedule();
  }
  function schedule() { if (!raf) raf = requestAnimationFrame(frame); }

  window.addEventListener('scroll', () => { tgt = progress(); schedule(); }, { passive: true });
  window.addEventListener('resize', () => { tgt = progress(); schedule(); });
  tgt = progress(); cur = station(tgt).x * window.innerWidth; frame(performance.now());
}

// ---- small / reduced-motion: the CSS carousel drives, we just track it ----
function follow(scroll: HTMLElement) {
  let last = -1, raf = 0;
  const read = () => {
    raf = 0;
    const w = scroll.clientWidth || 1;
    const i = Math.max(0, Math.min(N - 1, Math.round(scroll.scrollLeft / w)));
    if (i !== last) { last = i; mark(i); }
  };
  scroll.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(read); }, { passive: true });
  read();
}

if (root && scroll && stage && track && N === ITEMS.length) {
  const canPan = window.matchMedia('(min-width: 861px)').matches && !reduced;
  if (canPan) pan(root, scroll, stage, track); else follow(scroll);
}
