// Everything the visitor can do besides scroll: turn sound on, make it rain,
// tap a bird to hear it, tap the waterfall's pool to send out ripples, and
// shine a torch around the owl's hollow at dusk.
import * as THREE from 'three';
import { createSound } from './fx/sound.js';

const OWL_INDEX = 12;   // path index of the owl stop

const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

const ICON = {
  soundOff: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M17 9l4 6M21 9l-4 6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  soundOn: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  rain: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 15a4.5 4.5 0 1 1 1-8.9A5.5 5.5 0 0 1 18.5 9 3.5 3.5 0 0 1 18 16H7z" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M8 19l-1 2M12 19l-1 2M16 19l-1 2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
};

function readPref(key) { try { return localStorage.getItem(key); } catch { return null; } }
function writePref(key, v) { try { localStorage.setItem(key, v); } catch { /* private mode */ } }

export function createInteractions({ journey, stops, camera, mobile }) {
  const sound = createSound(stops);

  /* ---------- buttons ---------- */
  const bar = document.createElement('div');
  bar.className = 'controls';
  bar.innerHTML = `
    <button type="button" class="ctl ctl--sound" aria-pressed="false">${ICON.soundOff}<span>Sound off</span></button>
    <button type="button" class="ctl ctl--rain" aria-pressed="false">${ICON.rain}<span>Make it rain</span></button>`;
  document.body.appendChild(bar);
  const soundBtn = bar.querySelector('.ctl--sound');
  const rainBtn = bar.querySelector('.ctl--rain');

  function showSound() {
    const on = sound.enabled;
    soundBtn.setAttribute('aria-pressed', String(on));
    soundBtn.innerHTML = `${on ? ICON.soundOn : ICON.soundOff}<span>${on ? 'Sound on' : 'Sound off'}</span>`;
  }
  soundBtn.addEventListener('click', () => {
    sound.setEnabled(!sound.enabled);
    writePref('uma-sound', sound.enabled ? 'on' : 'off');
    showSound();
  });

  let rainTarget = 0, rain = 0;
  rainBtn.addEventListener('click', () => {
    rainTarget = rainTarget ? 0 : 1;
    rainBtn.setAttribute('aria-pressed', String(!!rainTarget));
    rainBtn.querySelector('span').textContent = rainTarget ? 'Stop the rain' : 'Make it rain';
  });

  /* ---------- rain: streaks on a 2D canvas over the scene ---------- */
  const rainCanvas = document.createElement('canvas');
  rainCanvas.className = 'rain';
  document.body.insertBefore(rainCanvas, document.querySelector('.ui'));
  const rg = rainCanvas.getContext('2d');
  const drops = [];
  function sizeRain() {
    const r = Math.min(window.devicePixelRatio, 1.5);
    rainCanvas.width = Math.round(innerWidth * r);
    rainCanvas.height = Math.round(innerHeight * r);
    drops.length = 0;
    const n = mobile ? 220 : 520;
    for (let i = 0; i < n; i++) drops.push(newDrop(true));
  }
  function newDrop(anywhere) {
    const depth = Math.random();             // 0 far .. 1 near
    return {
      x: Math.random() * rainCanvas.width * 1.2 - rainCanvas.width * 0.1,
      y: anywhere ? Math.random() * rainCanvas.height : -40 - Math.random() * 200,
      len: 10 + depth * 34, speed: 900 + depth * 1500, w: 0.6 + depth * 1.3, a: 0.1 + depth * 0.28,
    };
  }
  window.addEventListener('resize', sizeRain);
  sizeRain();
  function drawRain(dt) {
    const W = rainCanvas.width, H = rainCanvas.height, r = W / innerWidth;
    rg.clearRect(0, 0, W, H);
    if (rain < 0.002) { rainCanvas.style.opacity = '0'; return; }
    rainCanvas.style.opacity = '1';
    // the sky dims a little under the shower
    rg.fillStyle = `rgba(8, 18, 24, ${0.22 * rain})`;
    rg.fillRect(0, 0, W, H);
    rg.lineCap = 'round';
    const slant = 0.12;
    const visible = Math.floor(drops.length * rain);
    for (let i = 0; i < drops.length; i++) {
      const d = drops[i];
      d.y += d.speed * r * dt;
      d.x += d.speed * slant * r * dt;
      if (d.y > H + 40) drops[i] = newDrop(false);
      if (i > visible) continue;
      rg.strokeStyle = `rgba(210, 225, 235, ${d.a * rain})`;
      rg.lineWidth = d.w * r;
      rg.beginPath();
      rg.moveTo(d.x, d.y);
      rg.lineTo(d.x - d.len * slant * r, d.y - d.len * r);
      rg.stroke();
    }
  }

  /* ---------- torch at the owl ---------- */
  const torchEl = document.createElement('div');
  torchEl.className = 'torch';
  torchEl.innerHTML = '<span class="torch__hint">Move the torch to light the forest</span>';
  document.querySelector('.ui').prepend(torchEl);
  const beam = { x: innerWidth * 0.62, y: innerHeight * 0.45, tx: innerWidth * 0.62, ty: innerHeight * 0.45 };
  let torch = 0;

  /* ---------- pointer: hover hints and taps ---------- */
  const tip = document.createElement('div');
  tip.className = 'tip';
  document.body.appendChild(tip);
  const ptr = { x: 0, y: 0, in: false, moved: false };
  let down = null;
  window.addEventListener('pointermove', (e) => {
    ptr.x = e.clientX; ptr.y = e.clientY; ptr.in = true; ptr.moved = true;
    beam.tx = e.clientX; beam.ty = e.clientY;
  }, { passive: true });
  document.addEventListener('pointerleave', () => { ptr.in = false; });
  window.addEventListener('pointerdown', (e) => {
    if (e.target?.closest?.('.controls')) return;
    down = { x: e.clientX, y: e.clientY, t: performance.now() };
    beam.tx = e.clientX; beam.ty = e.clientY;
  }, { passive: true });
  window.addEventListener('pointerup', (e) => {
    if (!down) return;
    const quick = performance.now() - down.t < 450 && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 10;
    down = null;
    if (quick) tap(e.clientX, e.clientY);
  }, { passive: true });

  const ndc = new THREE.Vector2();
  const toNdc = (x, y) => ndc.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1);
  let now = 0;

  function ring(x, y, kind) {
    const el = document.createElement('div');
    el.className = `ring ring--${kind}`;
    el.style.left = `${x}px`; el.style.top = `${y}px`;
    if (kind === 'bird') el.innerHTML = '<span>♪</span>';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1400);
  }

  function tap(x, y) {
    const hit = journey.pick(toNdc(x, y), camera);
    if (!hit?.kind) return;
    if (hit.kind === 'bird') {
      sound.call(hit.stop);
      showSound();
      ring(x, y, 'bird');
    } else if (hit.kind === 'pool') {
      journey.addRipple(hit.index, hit.uv, now, 1);
      sound.plip(1);
      ring(x, y, 'water');
    }
  }

  let lastHover = null;
  function hover() {
    let kind = null, label = '';
    if (ptr.in && !mobile) {
      const hit = journey.pick(toNdc(ptr.x, ptr.y), camera);
      kind = hit?.kind || null;
      if (kind === 'bird') label = `Tap to hear the ${hit.stop.name.replace(/s$/, '').toLowerCase()}`;
      if (kind === 'pool') label = 'Tap the water';
    }
    document.body.style.cursor = kind ? 'pointer' : '';
    if (label !== lastHover) {
      lastHover = label;
      tip.textContent = label;
      tip.classList.toggle('is-on', !!label);
    }
    if (label) tip.style.transform = `translate3d(${ptr.x + 16}px, ${ptr.y + 18}px, 0)`;
  }

  // a returning visitor who left sound on gets it back on their first tap
  // anywhere (browsers only allow audio after a gesture)
  if (readPref('uma-sound') === 'on') {
    const resume = () => { if (!sound.enabled) { sound.setEnabled(true); showSound(); } };
    window.addEventListener('pointerdown', resume, { once: true });
    window.addEventListener('keydown', resume, { once: true });
  }

  /* ---------- per frame ---------- */
  function update(index, time, dt) {
    now = time;
    rain += (rainTarget - rain) * (1 - Math.exp(-dt * 1.6));
    sound.setRain(rain);
    sound.update(index);
    drawRain(dt);

    // torch: fully on while settled at the owl, easing in and out around it
    torch = 1 - smoothstep(0.25, 0.75, Math.abs(index - OWL_INDEX));
    const k = 1 - Math.exp(-dt * 7);
    beam.x += (beam.tx - beam.x) * k;
    beam.y += (beam.ty - beam.y) * k;
    torchEl.style.opacity = torch.toFixed(3);
    torchEl.style.visibility = torch > 0.003 ? 'visible' : 'hidden';
    if (torch > 0.003) {
      const rad = Math.min(innerWidth, innerHeight) * (mobile ? 0.26 : 0.2);
      torchEl.style.setProperty('--x', `${beam.x}px`);
      torchEl.style.setProperty('--y', `${beam.y}px`);
      torchEl.style.setProperty('--r', `${rad}px`);
      const hit = journey.pick(toNdc(beam.x, beam.y), camera);
      journey.setTorch(hit && hit.index === OWL_INDEX ? hit.uv : null, torch);
    } else journey.setTorch(null, 0);

    hover();
  }

  showSound();
  return { update, sound };
}
