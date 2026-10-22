// Renderer, the single frame loop, scroll and the HTML overlay.
import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { createJourney, progressToIndex, backgroundAt, STOPS, TITLE_WINDOW, LAST_INDEX } from './journey.js';
import { createClouds, createSky } from './fx/clouds.js';
import { createButterflies } from './fx/butterflies.js';
import { createPost } from './fx/post.js';
import { createFlyers } from './fx/flyers.js';
import { onProgress, setRenderer } from './assets.js';
import { createInteractions } from './interact.js';
import { setTextureScale } from './fx/textures.js';

gsap.registerPlugin(ScrollTrigger);

// phones and small tablets; a touchscreen laptop is not a phone, so a touch
// screen alone doesn't count (it would get the smaller, softer files)
const mobile = matchMedia('(max-width: 768px)').matches
  || (matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) < 900);
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const debug = new URLSearchParams(location.search).has('debug');
setTextureScale(mobile ? 0.6 : 1);

/* ---------- renderer / scene / camera ---------- */
const canvas = document.getElementById('webgl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
// The scene is fill-rate bound (big blurred transparent planes + post), so
// cap pixels per frame, not just DPR: ~3.2M on desktop (1080p at 1.25x),
// ~1.3M on phones. Never above 2x, never below 1x.
const PIXEL_BUDGET = mobile ? 1.3e6 : 3.2e6;
const pixelRatioFor = (w, h) => Math.max(1, Math.min(window.devicePixelRatio, 2, Math.sqrt(PIXEL_BUDGET / (w * h))));
renderer.setPixelRatio(pixelRatioFor(window.innerWidth, window.innerHeight));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
// The scenes are real photographs and video, already graded by the camera:
// show them as they are. (Film tone mapping flattens and whitens them.)
renderer.toneMapping = THREE.NoToneMapping;

setRenderer(renderer);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 600);

const sky = createSky(scene);
const journey = createJourney(scene, { mobile });
const clouds = createClouds(scene, journey.curve, { lastIndex: LAST_INDEX, indices: [0.22, 0.42, 0.6, 0.76] });
const flyers = createFlyers(scene, journey.frames, { mobile, occlusion: journey.occlusion });
const butterflies = createButterflies(scene, journey.anchors, { perAnchor: mobile ? 2 : 4, occlusion: journey.occlusion });
const post = createPost(renderer, scene, camera, { mobile });
const interact = createInteractions({ journey, stops: STOPS, camera, mobile });

// Upload every texture and compile every shader now, so nothing stalls the
// first time a stop scrolls into view.
scene.traverse((o) => {
  if (o.material?.map) renderer.initTexture(o.material.map);
  if (o.material?.uniforms?.uMap) renderer.initTexture(o.material.uniforms.uMap.value);
});
renderer.compile(scene, camera);

/* ---------- overlay ---------- */
const titleEl = document.querySelector('.title');
const hintEl = document.querySelector('.hint');
const cardsEl = document.getElementById('cards');
// what you can do at each stop, said once on its card
const hintFor = (stop) => (stop.fireflies ? 'Tap the owl to hear it · move to shine your torch'
  : stop.pool ? 'Tap the pool to make ripples'
    : stop.video ? 'Tap the bird to hear its call' : '');
const cards = STOPS.map((stop, i) => {
  const el = document.createElement('article');
  el.className = `card card--${stop.side > 0 ? 'left' : 'right'}`;
  el.innerHTML = `
    <p class="card__index">${String(i + 1).padStart(2, '0')} / ${String(STOPS.length).padStart(2, '0')}</p>
    <h2 class="card__name">${stop.name}</h2>
    <p class="card__latin">${stop.latin}</p>
    <p class="card__text">${stop.text}</p>
    <dl class="card__facts">${stop.facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
    ${hintFor(stop) ? `<p class="card__hint">${hintFor(stop)}</p>` : ''}`;
  cardsEl.appendChild(el);
  return { el, stop, active: false };
});

/* ---------- scroll: Lenis owns it, ScrollTrigger reads it ---------- */
const lenis = new Lenis({ lerp: reduceMotion ? 1 : 0.085, smoothWheel: true });
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);

let targetProgress = 0;
ScrollTrigger.create({
  trigger: '#track', start: 'top top', end: 'bottom bottom',
  onUpdate: (self) => { targetProgress = self.progress; },
});

/* ---------- pointer ---------- */
const mouse = { x: 0, y: 0, sx: 0, sy: 0, active: false };
window.addEventListener('pointermove', (e) => {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  mouse.active = true;
}, { passive: true });
document.addEventListener('pointerleave', () => { mouse.active = false; });

/* ---------- resize ---------- */
let ratioCeiling = 2;   // lowered by adaptResolution when frames run long
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  camera.aspect = w / h;
  camera.fov = camera.aspect < 0.8 ? 58 : 45;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(ratioCeiling, pixelRatioFor(w, h)));
  renderer.setSize(w, h);
  post.setSize(w, h);
  journey.layout(camera);
}
window.addEventListener('resize', resize);
resize();

/* ---------- loop ---------- */
const damp = (a, b, ease, dt) => a + (b - a) * (1 - Math.pow(1 - ease, dt * 60));
const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

const clock = new THREE.Clock();
const camPos = new THREE.Vector3();
const lookPos = new THREE.Vector3();
const _right = new THREE.Vector3();
const _up = new THREE.Vector3();
const _fwd = new THREE.Vector3();
const fogColor = new THREE.Color();
let progress = 0;
let time = 0;
let lastTitle = -1;
let lastHint = -1;

const stats = { fps: 0, frames: 0, acc: 0, min: Infinity };
window.__uma = stats;
if (debug) Object.assign(stats, { lenis, scene, camera, holds: STOPS.map((s) => s.hold), videos: journey.videos, journey });
const fpsEl = debug ? Object.assign(document.body.appendChild(document.createElement('div')), { className: 'fps' }) : null;

function tick() {
  const dt = Math.min(clock.getDelta(), 0.1);
  time += dt;

  // second layer of smoothing on top of Lenis: the camera eases, never snaps
  progress = damp(progress, targetProgress, reduceMotion ? 0.25 : 0.075, dt);
  const t = progressToIndex(progress) / LAST_INDEX;
  journey.curve.getPoint(t, camPos);
  journey.lookCurve.getPoint(t, lookPos);

  // slight mouse parallax, lerped
  mouse.sx = damp(mouse.sx, mouse.active ? mouse.x : 0, 0.05, dt);
  mouse.sy = damp(mouse.sy, mouse.active ? mouse.y : 0, 0.05, dt);
  camera.matrixWorld.extractBasis(_right, _up, _fwd);
  camera.position.copy(camPos).addScaledVector(_right, mouse.sx * 0.45).addScaledVector(_up, mouse.sy * 0.28);
  camera.lookAt(lookPos);
  camera.updateMatrixWorld();

  backgroundAt(progress, fogColor);
  renderer.setClearColor(fogColor);
  const skyMix = smoothstep(0.07, 0.1, progress);
  sky.update(camera.position, fogColor, skyMix);

  journey.update(camera, mouse, time, dt);
  interact.update(progressToIndex(progress), time, dt);
  flyers.update(camera, time);
  clouds.update(camera.position, time);
  butterflies.update(camera, mouse, time, dt);
  updateOverlay();
  post.render(time);

  stats.progress = progress;
  stats.frames++; stats.acc += dt;
  stats.maxDt = Math.max(stats.maxDt || 0, dt);
  if (stats.acc >= 0.5) {
    stats.fps = Math.round(stats.frames / stats.acc);
    if (time > 2) stats.min = Math.min(stats.min, stats.fps);
    // a single stall (tab throttled, GC) is not sustained slowness
    if (stats.maxDt < 0.09) adaptResolution(stats.fps);
    stats.frames = 0; stats.acc = 0; stats.maxDt = 0;
    if (fpsEl) fpsEl.textContent = `${stats.fps} fps · ${renderer.getPixelRatio().toFixed(2)}x`;
  }
}

// If the frame rate sags for a few windows in a row, render fewer pixels.
// Only ever steps down, so it can't oscillate.
let slowWindows = 0;
let lastHidden = 0;
document.addEventListener('visibilitychange', () => { lastHidden = time; });
const minRatio = mobile ? 0.85 : 1;
function adaptResolution(fps) {
  // a hidden or just-restored tab reports throttled frame rates; ignore them
  if (time < 3 || document.hidden || time - lastHidden < 2) { slowWindows = 0; return; }
  slowWindows = fps < (mobile ? 28 : 52) ? slowWindows + 1 : 0;
  const pr = renderer.getPixelRatio();
  if (slowWindows >= 3 && pr > minRatio) {
    slowWindows = 0;
    ratioCeiling = Math.max(minRatio, pr - 0.25);
    renderer.setPixelRatio(ratioCeiling);
    post.setSize(window.innerWidth, window.innerHeight);
  }
  stats.pixelRatio = renderer.getPixelRatio();
}

function updateOverlay() {
  // title fades up from blur as the clouds clear, then drifts away
  const a = smoothstep(TITLE_WINDOW.in[0], TITLE_WINDOW.in[1], progress) * (1 - smoothstep(TITLE_WINDOW.out[0], TITLE_WINDOW.out[1], progress));
  if (Math.abs(a - lastTitle) > 0.002) {
    lastTitle = a;
    titleEl.style.opacity = a.toFixed(3);
    titleEl.style.filter = a > 0.995 ? 'none' : `blur(${((1 - a) * 18).toFixed(1)}px)`;
    titleEl.style.transform = `translate3d(0, ${((1 - a) * 28).toFixed(1)}px, 0) scale(${(0.97 + a * 0.03).toFixed(4)})`;
    titleEl.style.visibility = a < 0.003 ? 'hidden' : 'visible';
  }
  const h = 1 - smoothstep(0.003, 0.03, progress);
  if (Math.abs(h - lastHint) > 0.002) { lastHint = h; hintEl.style.opacity = h.toFixed(3); }

  for (const c of cards) {
    const on = progress > c.stop.hold[0] - 0.025 && progress < c.stop.hold[1] + 0.03;
    if (on !== c.active) { c.active = on; c.el.classList.toggle('is-active', on); }
  }
}

gsap.ticker.add(tick);

// ?debug: render a frame synchronously at a given progress and return its
// cost in ms (gl.finish waits for the GPU), so frame cost can be measured
// even when the tab is throttled.
if (debug) {
  stats.setRatio = (r) => {
    renderer.setPixelRatio(r);
    post.setSize(window.innerWidth, window.innerHeight);
  };
  stats.renderAt = (p) => {
    targetProgress = progress = p;
    const t0 = performance.now();
    tick();
    const gl = renderer.getContext();
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
    return performance.now() - t0;
  };
}
// The intro needs the sky, the cloud and the canopy; show the page once the
// first few images are in, and let the rest stream in behind.
const loaderEl = document.querySelector('.loader');
const loaderBar = document.querySelector('.loader__bar');
onProgress((done, total) => {
  loaderBar.style.transform = `scaleX(${(done / total).toFixed(3)})`;
  if (done >= Math.min(total, 8) && !document.documentElement.classList.contains('is-ready')) {
    document.documentElement.classList.add('is-ready');
    setTimeout(() => loaderEl.remove(), 1600);
  }
});
