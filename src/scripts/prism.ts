// Variation 1 · PRISM — the crystalline vault.
// The nine items as glowing crystal artifacts suspended in a foggy void. Scroll dollies a camera
// through them, best real deal → worst; UnrealBloom makes each crystal glow, a particle field gives
// depth, and an HUD tracks the active item (name, count-up %, story, sparkline). Enhancement only:
// under reduced-motion / no-WebGL / no-JS the static crystalline gallery (in the DOM) carries it.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ITEMS, sparkPath } from '../lib/items.ts';

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const flat = location.search.includes('flat'); // escape hatch: force the static gallery
const section = document.getElementById('prism');
const canvas = document.getElementById('prismCanvas') as HTMLCanvasElement | null;
const scroll = document.getElementById('prismScroll');
const stage = document.getElementById('prismStage');
if (section && canvas && scroll && stage && !reduced && !flat) init();

function init() {
  const N = ITEMS.length;
  const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));

  // reveal the vault FIRST so the sticky stage has real dimensions before we size the renderer
  // (its scroll container is display:none until this attribute is set → 0×0 framebuffer otherwise)
  scroll!.style.height = `${N * 90 + 40}vh`;
  section!.setAttribute('data-prism-js', '');

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas!, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true });
  } catch { section!.removeAttribute('data-prism-js'); return; } // no WebGL → keep the static gallery
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; // compress highlights so bloom glows, not blows
  renderer.toneMappingExposure = 0.92;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0c14);
  scene.fog = new THREE.FogExp2(0x0b0c14, 0.033);

  const GAP = 7, VIEW = 7, SIZE = 3.8;
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
  camera.position.set(0, 0, VIEW);

  // nine crystal planes
  const loader = new THREE.TextureLoader();
  const planes: THREE.Mesh[] = [];
  const baseY: number[] = [];
  ITEMS.forEach((it, i) => {
    const tex = loader.load(`/obj/${it.id}.png`);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 1 });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(SIZE, SIZE), mat);
    mesh.position.set(0, 0, -i * GAP);
    scene.add(mesh);
    planes.push(mesh); baseY.push(0);
  });

  // a soft spectral halo behind each crystal — a gentle ambient wash of its hue, not a flood
  const halos: THREE.Sprite[] = [];
  const haloTex = haloTexture();
  ITEMS.forEach((it, i) => {
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, color: new THREE.Color(it.rgb), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.13 }));
    spr.scale.set(SIZE * 2.1, SIZE * 2.1, 1);
    spr.position.set(0, 0, -i * GAP - 0.3);
    scene.add(spr); halos.push(spr);
  });

  // drifting particle dust for depth
  const PN = 1400;
  const pg = new THREE.BufferGeometry();
  const pos = new Float32Array(PN * 3);
  for (let i = 0; i < PN; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 30;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 20;
    pos[i * 3 + 2] = 4 - Math.random() * (N * GAP + 10);
  }
  pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const particles = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0x9fb2e6, size: 0.055, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true }));
  scene.add(particles);

  // bloom
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.42, 0.42, 0.62);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  function resize() {
    const w = stage!.clientWidth, h = stage!.clientHeight;
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    bloom.resolution.set(w, h);
  }
  resize();

  // ---- HUD ----
  const phBody = document.getElementById('phBody')!;
  const phName = document.getElementById('phName')!;
  const phRank = document.getElementById('phRank')!;
  const phPct = document.getElementById('phPct')!;
  const phHead = document.getElementById('phHead')!;
  const phBlurb = document.getElementById('phBlurb')!;
  const phSpark = document.getElementById('phSpark')!;
  const phNav = document.getElementById('phNav')!;
  phNav.innerHTML = ITEMS.map(() => '<i></i>').join('');
  const dots = Array.from(phNav.children) as HTMLElement[];

  let shownPct = 0, pctTarget = 0, coState = -1;
  function setActive(i: number) {
    if (i === coState) return;
    const it = ITEMS[i];
    phBody.style.setProperty('--good', it.color);
    phName.textContent = it.label;
    phRank.textContent = `${String(i + 1).padStart(2, '0')} / ${String(N).padStart(2, '0')}`;
    phHead.textContent = it.head;
    phBlurb.textContent = it.blurb;
    const sp = sparkPath(it.real, 150, 46);
    phSpark.innerHTML =
      `<line class="base" x1="0" y1="${sp.baseY.toFixed(1)}" x2="150" y2="${sp.baseY.toFixed(1)}"/>` +
      `<path class="ln" d="${sp.d}"/><circle class="dot" cx="${sp.endX.toFixed(1)}" cy="${sp.endY.toFixed(1)}" r="2.6"/>`;
    dots.forEach((d, k) => { d.className = k === i ? 'on' : (k < i ? 'past' : ''); });
    phBody.classList.add('is-on');
    pctTarget = it.pct;
    coState = i;
  }

  // ---- scroll ----
  let curP = 0, tgtP = 0;
  function progress() {
    const r = scroll!.getBoundingClientRect();
    const total = scroll!.offsetHeight - stage!.offsetHeight;
    return clamp(-r.top / (total || 1));
  }
  window.addEventListener('scroll', () => { tgtP = progress(); }, { passive: true });
  window.addEventListener('resize', () => { resize(); tgtP = progress(); });

  // pointer parallax
  let px = 0, py = 0, tpx = 0, tpy = 0;
  window.addEventListener('pointermove', (e) => {
    tpx = (e.clientX / window.innerWidth - 0.5) * 2;
    tpy = (e.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });

  resize(); // re-measure now that the stage is laid out
  tgtP = progress();

  const clock = new THREE.Clock();
  function frame() {
    const t = clock.getElapsedTime();
    curP += (tgtP - curP) * 0.12;
    if (Math.abs(tgtP - curP) < 1e-4) curP = tgtP;

    const camZ = VIEW - curP * (N - 1) * GAP;
    px += (tpx - px) * 0.05; py += (tpy - py) * 0.05;
    camera.position.set(px * 0.9, -py * 0.6, camZ);
    camera.lookAt(px * 0.3, -py * 0.2, camZ - VIEW);

    const centerIdx = curP * (N - 1);
    planes.forEach((m, i) => {
      m.position.y = baseY[i] + Math.sin(t * 0.5 + i * 1.3) * 0.11;
      m.rotation.z = Math.sin(t * 0.25 + i) * 0.02;
      const vis = Math.max(0, 1 - Math.abs(i - centerIdx) * 0.85); // only the active crystal dominates
      (m.material as THREE.MeshBasicMaterial).opacity = vis;
      const h = halos[i]; h.position.y = m.position.y * 0.6;
      (h.material as THREE.SpriteMaterial).opacity = vis * (0.12 + 0.04 * Math.sin(t + i));
    });
    particles.rotation.y = t * 0.01;
    particles.rotation.x = Math.sin(t * 0.05) * 0.05;

    const active = Math.round(curP * (N - 1));
    setActive(active);
    if (shownPct !== pctTarget) {
      shownPct += (pctTarget - shownPct) * 0.16;
      if (Math.abs(pctTarget - shownPct) < 0.5) shownPct = pctTarget;
      const v = Math.round(shownPct);
      phPct.textContent = `${v >= 0 ? '+' : '−'}${Math.abs(v)}%`;
    }

    composer.render();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// radial soft-glow sprite texture (white → transparent), tinted per item via material color
function haloTexture(): THREE.Texture {
  const s = 128;
  const cv = document.createElement('canvas'); cv.width = cv.height = s;
  const ctx = cv.getContext('2d')!;
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(255,255,255,0.9)');
  g.addColorStop(0.4, 'rgba(255,255,255,0.25)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
