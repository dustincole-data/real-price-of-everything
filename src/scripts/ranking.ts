// "The Ranking" — the per-good gallery driver (issue 09).
// The panels are REAL content authored in the DOM (emoji/name/line/%/blurb) that simply
// scrolls; a docked sticky strip shows the whole staircase in miniature. This module only
// ENHANCES: an IntersectionObserver marks the centered panel active, which (1) lights that
// good's bar in the strip with an additive pin + spotlight band — never dimming the others,
// (2) draws the panel's real-price line in, and (3) counts the % up. Under prefers-reduced-motion
// the draw + count-up drop (content already final); with no JS the strip is a static mini-chart
// and every line/number is authored visible. Nothing is ever gated on this running.

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const strip = document.getElementById('strip');
const inner = document.getElementById('stripInner');
const pin = document.getElementById('stripPin');
const band = document.getElementById('stripBand');
const activeLabel = document.getElementById('stripActive');
const panels = Array.from(document.querySelectorAll<HTMLElement>('.rpanel'));

if (strip && inner && pin && band && activeLabel && panels.length) {
  document.documentElement.setAttribute('data-rank-js', '');
  const drawn = new WeakSet<Element>();
  let activeId: string | null = null;

  // Position the HTML pin + spotlight band over the active bar, in px, from its client rect
  // (the strip is sticky, so bar rects only move on resize — cheap to recompute there).
  function lightStrip(id: string) {
    activeId = id;
    const bar = strip!.querySelector<SVGRectElement>(`rect.stbar[data-good="${id}"]`);
    if (!bar) return;
    const br = bar.getBoundingClientRect();
    const ir = inner!.getBoundingClientRect();
    const cx = br.left - ir.left + br.width / 2;
    const good = `var(--pole-${bar.getAttribute('fill')!.includes('up') ? 'up' : 'down'})`;
    pin!.style.setProperty('--good', good);
    pin!.style.transform = `translate(${cx.toFixed(1)}px, ${(br.top - ir.top - 11).toFixed(1)}px)`;
    pin!.style.opacity = '1';
    band!.style.setProperty('--good', good);
    band!.style.left = `${(br.left - ir.left - 5).toFixed(1)}px`;
    band!.style.width = `${(br.width + 10).toFixed(1)}px`;
    band!.style.opacity = '1';
    const panel = panels.find((p) => p.dataset.good === id);
    const emoji = panel?.querySelector('.rp-emoji')?.textContent ?? '';
    const name = panel?.querySelector('.rp-name')?.textContent ?? '';
    activeLabel!.textContent = `${emoji} ${name}`.trim();
    activeLabel!.style.setProperty('--good', good);
    activeLabel!.style.opacity = '1';
  }

  function drawLine(panel: HTMLElement) {
    const path = panel.querySelector<SVGPathElement>('path.rline');
    if (!path) return;
    if (reduced) { panel.classList.add('is-drawn'); return; }
    const len = path.getTotalLength();
    path.style.transition = 'none';
    path.style.strokeDasharray = String(len);
    path.style.strokeDashoffset = String(len);
    void path.getBoundingClientRect(); // force reflow so the transition takes
    path.style.transition = 'stroke-dashoffset 1.15s cubic-bezier(.35,0,.1,1)';
    path.style.strokeDashoffset = '0';
    requestAnimationFrame(() => panel.classList.add('is-drawn'));
  }

  function countUp(panel: HTMLElement) {
    const el = panel.querySelector<HTMLElement>('.rp-pct');
    if (!el) return;
    const target = parseFloat(el.dataset.target || '0');
    if (reduced) return; // authored text is already the final value
    const fmt = (n: number) => `${n >= 0 ? '+' : '−'}${Math.abs(Math.round(n))}%`;
    const dur = 900, t0 = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - t, 3); // easeOutCubic
      el.textContent = fmt(target * e);
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function hideLine(panel: HTMLElement) {
    if (reduced) return;
    const path = panel.querySelector<SVGPathElement>('path.rline');
    if (!path) return;
    const len = path.getTotalLength();
    path.style.transition = 'none';
    path.style.strokeDasharray = String(len);
    path.style.strokeDashoffset = String(len);
  }

  function activate(panel: HTMLElement) {
    lightStrip(panel.dataset.good!);
    if (!drawn.has(panel)) {
      drawn.add(panel);
      drawLine(panel);
      countUp(panel);
    }
  }

  // Pre-hide every line (except reduced) so each draws fresh when its panel reaches center —
  // no flash of a fully-drawn line before the reveal.
  if (!reduced) panels.forEach(hideLine);

  const io = new IntersectionObserver(
    (entries) => { for (const e of entries) if (e.isIntersecting) activate(e.target as HTMLElement); },
    { rootMargin: '-45% 0px -45% 0px', threshold: 0 },
  );
  panels.forEach((p) => io.observe(p));

  // Reposition the strip pin/band when the layout reflows (the bars move on width change).
  let rt: number | undefined;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = window.setTimeout(() => { if (activeId) lightStrip(activeId); }, 120);
  });

  // Set the strip pin + draw the first good on load (it may already be centered).
  activate(panels[0]);
}
