// Variation 2 · STRATA — kinetic editorial chapters.
// Each item is a full-viewport chapter; on enter it reveals (staggered) and its % counts up, the
// crystal + color-orb parallax against scroll, and a rail tracks position. Enhancement only:
// content is authored visible; JS adds the entrance choreography and live parallax.
const root = document.documentElement;
const strata = document.getElementById('strata');
const chapters = Array.from(document.querySelectorAll<HTMLElement>('.st-ch'));
const rail = document.getElementById('stRail');
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (strata && chapters.length) init();

function init() {
  root.setAttribute('data-strata-anim', '');
  const N = chapters.length;

  // rail dots
  if (rail) { rail.innerHTML = chapters.map(() => '<i></i>').join(''); }
  const dots = rail ? (Array.from(rail.children) as HTMLElement[]) : [];

  // reveal + count-up on enter
  const counted = new WeakSet<HTMLElement>();
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const ch = e.target as HTMLElement;
      if (e.isIntersecting) {
        ch.classList.add('in');
        const pctEl = ch.querySelector<HTMLElement>('.st-pct');
        if (pctEl && !counted.has(pctEl)) { counted.add(pctEl); countUp(pctEl); }
      }
    }
  }, { threshold: 0.4 });
  chapters.forEach((c) => io.observe(c));

  function countUp(el: HTMLElement) {
    const target = parseFloat(el.dataset.target || '0');
    if (reduced) { el.textContent = fmt(target); return; }
    const dur = 900, t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(Math.round(target * e));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  const fmt = (v: number) => `${v >= 0 ? '+' : '−'}${Math.abs(v)}%`;

  // parallax + rail active, driven by rAF while the section is in view
  let ticking = false;
  function frame() {
    ticking = false;
    const vh = window.innerHeight, mid = vh / 2;
    let active = -1, activeDist = Infinity;
    chapters.forEach((ch, i) => {
      const r = ch.getBoundingClientRect();
      const center = r.top + r.height / 2;
      const ratio = Math.max(-1.2, Math.min(1.2, (center - mid) / vh)); // -1 above → +1 below
      if (!reduced) {
        const fig = ch.querySelector<HTMLElement>('.st-fig');
        const orb = ch.querySelector<HTMLElement>('.st-orb');
        if (fig) fig.style.transform = `translateY(${(-ratio * 34).toFixed(1)}px)`;
        if (orb) orb.style.transform = `translate(-50%,-50%) translateY(${(ratio * 60).toFixed(1)}px)`;
      }
      const d = Math.abs(center - mid);
      if (d < activeDist) { activeDist = d; active = i; }
    });
    dots.forEach((d, i) => { d.className = i === active ? 'on' : (i < active ? 'past' : ''); });
    if (active >= 0) { const g = getComputedStyle(chapters[active]).getPropertyValue('--good'); rail?.style.setProperty('--good', g); }
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  frame();
}
