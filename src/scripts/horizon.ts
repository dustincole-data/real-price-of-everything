// Variation 3 · HORIZON — a horizontal cinematic filmstrip.
// Vertical scroll pans the nine panels sideways; the active panel's % counts up, crystals + text
// parallax as they cross center, a progress bar tracks position. Enhancement only: without JS /
// under reduced-motion the panels stack vertically (authored, fully readable).
const root = document.getElementById('horizon');
const scroll = document.getElementById('hzScroll');
const stage = document.getElementById('hzStage');
const track = document.getElementById('hzTrack');
const bar = document.getElementById('hzBar');
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const panels = Array.from(document.querySelectorAll<HTMLElement>('.hz-panel'));

// horizontal scroll-hijack only on wider screens; narrow/touch gets the clean vertical stack
const wide = window.matchMedia('(min-width: 861px)').matches;
if (root && scroll && stage && track && panels.length && !reduced && wide) init();

function init() {
  const N = panels.length;
  const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  root!.setAttribute('data-hz-js', '');
  scroll!.style.height = `${N * 100}vh`;

  const counted = new Set<number>();
  const fmt = (v: number) => `${v >= 0 ? '+' : '−'}${Math.abs(v)}%`;
  function countUp(el: HTMLElement) {
    const target = parseFloat(el.dataset.target || '0');
    const dur = 900, t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(Math.round(target * e));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  let curX = 0, tgtP = 0, raf = 0;
  function progress() {
    const r = scroll!.getBoundingClientRect();
    const total = scroll!.offsetHeight - stage!.offsetHeight;
    return clamp(-r.top / (total || 1));
  }
  function render() {
    raf = 0;
    const vw = window.innerWidth;
    const maxX = (N - 1) * vw;
    const tgtX = tgtP * maxX;
    curX += (tgtX - curX) * 0.14;
    if (Math.abs(tgtX - curX) < 0.4) curX = tgtX;
    track!.style.transform = `translate3d(${-curX.toFixed(1)}px,0,0)`;

    // parallax inner layers + active detection
    let active = Math.round((curX / (maxX || 1)) * (N - 1));
    active = Math.max(0, Math.min(N - 1, active));
    panels.forEach((p, i) => {
      const dx = i * vw - curX;          // panel offset from viewport left
      const ratio = clamp(dx / vw, -1.2, 1.2); // -1 left … 0 centered … +1 right
      const fig = p.querySelector<HTMLElement>('.hz-fig');
      const txt = p.querySelector<HTMLElement>('.hz-txt');
      if (fig) fig.style.transform = `translateX(${(ratio * -60).toFixed(1)}px)`;
      if (txt) txt.style.transform = `translateX(${(ratio * 34).toFixed(1)}px)`;
    });

    if (!counted.has(active)) {
      const pct = panels[active].querySelector<HTMLElement>('.hz-pct');
      if (pct) { counted.add(active); countUp(pct); }
    }
    if (bar) {
      bar.style.width = `${(curX / (maxX || 1) * 100).toFixed(2)}%`;
      bar.style.background = getComputedStyle(panels[active]).getPropertyValue('--good');
    }
    if (Math.abs(tgtX - curX) > 0.4) schedule();
  }
  function schedule() { if (!raf) raf = requestAnimationFrame(render); }
  window.addEventListener('scroll', () => { tgtP = progress(); schedule(); }, { passive: true });
  window.addEventListener('resize', () => { tgtP = progress(); schedule(); });
  tgtP = progress(); render();
}
