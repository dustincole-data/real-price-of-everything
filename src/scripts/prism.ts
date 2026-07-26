// PRISM — the spine. SHELL ONLY: reveals the chart so it can be measured; the walk lands next.
const section = document.getElementById('prism');
const scroll = document.getElementById('prScroll');
const stage = document.getElementById('prStage');
const flat = location.search.includes('flat'); // escape hatch: force the authored gallery
if (section && scroll && stage && !flat) {
  scroll.style.height = `${9 * 82 + 44}vh`;
  section.setAttribute('data-driven', '');
}
