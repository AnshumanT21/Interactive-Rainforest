// Procedural placeholder textures. Every generator here stands in for a
// Nano Banana Pro image that will replace it in Phase 3, so each one is
// painted with the same depth role it will have later (blurred backdrop,
// soft mid trees, sharp bird, very blurred foreground leaves).
import * as THREE from 'three';

let SCALE = 1;
export function setTextureScale(s) { SCALE = s; }
const px = (n) => Math.max(8, Math.round(n * SCALE));

export function rng(seed) {
  let s = (Math.imul(seed | 0, 2654435761) >>> 0) || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}

function toTexture(c) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// Copy a canvas through a CSS blur filter: the cheap stand-in for the
// shallow depth of field the real photos will have.
function blurred(src, amount) {
  const [c, g] = makeCanvas(src.width, src.height);
  g.filter = `blur(${amount * SCALE}px)`;
  g.drawImage(src, 0, 0);
  g.filter = 'none';
  return c;
}

// Fade the borders of a canvas to transparent so plane edges never show.
function edgeMask(g, w, h, fx, fy) {
  g.globalCompositeOperation = 'destination-in';
  if (fx > 0) {
    const gx = g.createLinearGradient(0, 0, w, 0);
    gx.addColorStop(0, 'rgba(0,0,0,0)');
    gx.addColorStop(fx, 'rgba(0,0,0,1)');
    gx.addColorStop(1 - fx, 'rgba(0,0,0,1)');
    gx.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gx; g.fillRect(0, 0, w, h);
  }
  if (fy > 0) {
    const gy = g.createLinearGradient(0, 0, 0, h);
    gy.addColorStop(0, 'rgba(0,0,0,0)');
    gy.addColorStop(fy, 'rgba(0,0,0,1)');
    gy.addColorStop(1 - fy, 'rgba(0,0,0,1)');
    gy.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gy; g.fillRect(0, 0, w, h);
  }
  g.globalCompositeOperation = 'source-over';
}

function leaf(g, x, y, len, wid, ang, color, rib) {
  g.save();
  g.translate(x, y);
  g.rotate(ang);
  g.beginPath();
  g.moveTo(0, 0);
  g.quadraticCurveTo(len * 0.35, -wid, len, 0);
  g.quadraticCurveTo(len * 0.35, wid, 0, 0);
  g.fillStyle = color;
  g.fill();
  if (rib) {
    g.strokeStyle = rib;
    g.lineWidth = Math.max(1, wid * 0.05);
    g.beginPath(); g.moveTo(0, 0); g.lineTo(len * 0.92, 0); g.stroke();
  }
  g.restore();
}

const green = (r, lo, hi) => {
  const k = lo + r() * (hi - lo);
  return `rgb(${Math.round(8 + 20 * k)},${Math.round(28 + 70 * k)},${Math.round(18 + 34 * k)})`;
};

/* ---------- 16:9 background plate ---------- */
export function jungleBackdrop({ seed = 1, top = '#dfe9df', mid = '#4f7a60', bottom = '#0d2219', light = '#fff2d2' } = {}) {
  const w = px(1024), h = px(576), r = rng(seed);
  const [c, g] = makeCanvas(w, h);
  const grd = g.createLinearGradient(0, 0, 0, h);
  grd.addColorStop(0, top); grd.addColorStop(0.45, mid); grd.addColorStop(1, bottom);
  g.fillStyle = grd; g.fillRect(0, 0, w, h);

  const lx = w * (0.3 + r() * 0.4);
  const rg = g.createRadialGradient(lx, h * 0.1, 0, lx, h * 0.1, w * 0.55);
  rg.addColorStop(0, light); rg.addColorStop(1, 'rgba(255,255,255,0)');
  g.globalAlpha = 0.75; g.fillStyle = rg; g.fillRect(0, 0, w, h); g.globalAlpha = 1;

  // three receding layers of trunks and foliage, darker as they come forward
  for (let layer = 0; layer < 3; layer++) {
    const a = 0.18 + layer * 0.2;
    g.fillStyle = `rgba(${12 - layer * 3},${40 - layer * 10},${30 - layer * 8},${a})`;
    for (let i = 0; i < 7 + layer * 4; i++) {
      const x = r() * w, tw = (3 + r() * 10) * (1 + layer) * SCALE;
      g.fillRect(x, 0, tw, h);
    }
    for (let i = 0; i < 26; i++) {
      g.beginPath();
      g.ellipse(r() * w, r() * h * (0.35 + layer * 0.2), (40 + r() * 90) * SCALE, (20 + r() * 50) * SCALE, r() * 3, 0, Math.PI * 2);
      g.fill();
    }
  }
  // hanging mist band
  const mg = g.createLinearGradient(0, h * 0.35, 0, h * 0.9);
  mg.addColorStop(0, 'rgba(210,228,214,0)');
  mg.addColorStop(0.5, 'rgba(210,228,214,0.28)');
  mg.addColorStop(1, 'rgba(210,228,214,0)');
  g.fillStyle = mg; g.fillRect(0, 0, w, h);

  const out = blurred(c, 7);
  edgeMask(out.getContext('2d'), w, h, 0.08, 0.1);
  return toTexture(out);
}

/* ---------- mid-ground tree (transparent, tall) ---------- */
export function midTree({ seed = 1, tone = 0.5 } = {}) {
  const w = px(512), h = px(1024), r = rng(seed);
  const [c, g] = makeCanvas(w, h);
  const cx = w * (0.4 + r() * 0.2), tw = w * (0.14 + r() * 0.08);
  const bark = g.createLinearGradient(cx - tw, 0, cx + tw, 0);
  bark.addColorStop(0, `rgb(${60 + tone * 30},${70 + tone * 40},${48 + tone * 20})`);
  bark.addColorStop(0.35, 'rgb(30,38,26)');
  bark.addColorStop(1, 'rgb(10,16,11)');
  g.fillStyle = bark;
  g.beginPath();
  g.moveTo(cx - tw * 0.8, 0);
  g.bezierCurveTo(cx - tw * 1.1, h * 0.4, cx - tw * 0.6, h * 0.7, cx - tw * 1.4, h);
  g.lineTo(cx + tw * 1.5, h);
  g.bezierCurveTo(cx + tw * 0.7, h * 0.7, cx + tw * 1.2, h * 0.35, cx + tw * 0.8, 0);
  g.closePath(); g.fill();

  // a branch reaching out to one side
  const dir = r() > 0.5 ? 1 : -1, by = h * (0.35 + r() * 0.2);
  g.strokeStyle = 'rgb(24,30,20)'; g.lineCap = 'round';
  g.lineWidth = tw * 0.35;
  g.beginPath(); g.moveTo(cx, by); g.quadraticCurveTo(cx + dir * w * 0.25, by - h * 0.06, cx + dir * w * 0.55, by - h * 0.02); g.stroke();

  // moss
  for (let i = 0; i < 70; i++) {
    g.fillStyle = `rgba(${70 + r() * 50},${110 + r() * 60},${40 + r() * 30},${0.25 + r() * 0.35})`;
    g.beginPath();
    g.ellipse(cx + (r() - 0.5) * tw * 1.8, r() * h, (4 + r() * 14) * SCALE, (6 + r() * 20) * SCALE, 0, 0, Math.PI * 2);
    g.fill();
  }
  // vines
  g.lineWidth = 2 * SCALE;
  for (let i = 0; i < 6; i++) {
    const x = cx + dir * r() * w * 0.5;
    g.strokeStyle = `rgba(30,60,30,${0.5 + r() * 0.4})`;
    g.beginPath(); g.moveTo(x, by - 10); g.bezierCurveTo(x + 20, h * 0.6, x - 20, h * 0.75, x + (r() - 0.5) * 40, h * (0.75 + r() * 0.25)); g.stroke();
  }
  // foliage clumps near the top and along the branch
  for (let i = 0; i < 90; i++) {
    const onBranch = i % 3 === 0;
    const x = onBranch ? cx + dir * r() * w * 0.55 : r() * w;
    const y = onBranch ? by - r() * h * 0.08 : r() * h * 0.28;
    leaf(g, x, y, (30 + r() * 60) * SCALE, (10 + r() * 16) * SCALE, r() * Math.PI * 2, green(r, 0.1, 0.6));
  }
  const out = blurred(c, 2.5);
  edgeMask(out.getContext('2d'), w, h, 0, 0.1);
  return toTexture(out);
}

/* ---------- bird on a branch (transparent, sharp) ---------- */
export function birdPlaceholder(p) {
  const s = px(512);
  const [c, g] = makeCanvas(s, s);
  const u = s / 512;
  g.save(); g.scale(u, u);

  // branch
  g.strokeStyle = '#3a2c1e'; g.lineCap = 'round'; g.lineWidth = 22;
  g.beginPath(); g.moveTo(-20, 405); g.quadraticCurveTo(260, 380, 540, 420); g.stroke();
  g.strokeStyle = 'rgba(110,150,70,0.7)'; g.lineWidth = 8;
  g.beginPath(); g.moveTo(40, 398); g.quadraticCurveTo(260, 374, 470, 404); g.stroke();
  for (let i = 0; i < 6; i++) leaf(g, 60 + i * 80, 400, 50, 16, -0.6 - (i % 2) * 2.1, '#2f5a2c', 'rgba(255,255,255,0.08)');

  g.translate(256, 250);
  g.rotate(-0.18);
  // tail
  const tl = 120 * p.tailLen;
  const tg = g.createLinearGradient(0, 40, 0, 40 + tl);
  tg.addColorStop(0, p.tail); tg.addColorStop(1, p.tailTip);
  g.fillStyle = tg;
  g.beginPath(); g.moveTo(-26, 60); g.lineTo(-10, 60 + tl); g.lineTo(18, 60 + tl * 0.92); g.lineTo(26, 60); g.closePath(); g.fill();
  // body
  g.fillStyle = p.body;
  g.beginPath(); g.ellipse(0, 0, 58, 92, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = p.belly;
  g.beginPath(); g.ellipse(14, 18, 34, 66, 0, 0, Math.PI * 2); g.fill();
  // wing
  const wg = g.createLinearGradient(-40, -40, -10, 110);
  wg.addColorStop(0, p.wing); wg.addColorStop(1, p.wingTip);
  g.fillStyle = wg;
  g.beginPath(); g.ellipse(-22, 26, 36, 84, 0.18, 0, Math.PI * 2); g.fill();
  // head
  g.fillStyle = p.head;
  g.beginPath(); g.arc(14, -96, 44, 0, Math.PI * 2); g.fill();
  if (p.crown) { g.fillStyle = p.crown; g.beginPath(); g.ellipse(22, -134, 26, 12, 0.3, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = p.face;
  g.beginPath(); g.ellipse(32, -96, 22, 20, 0, 0, Math.PI * 2); g.fill();
  // beak
  const bl = 46 * p.beakLen;
  g.fillStyle = p.beak;
  g.beginPath(); g.moveTo(44, -112); g.quadraticCurveTo(52 + bl, -116, 50 + bl * 0.9, -78); g.quadraticCurveTo(54, -92, 46, -82); g.closePath(); g.fill();
  g.fillStyle = p.beakLow;
  g.beginPath(); g.moveTo(46, -86); g.quadraticCurveTo(56 + bl * 0.4, -84, 50 + bl * 0.45, -74); g.lineTo(44, -78); g.closePath(); g.fill();
  if (p.beakTip) { g.fillStyle = p.beakTip; g.beginPath(); g.ellipse(48 + bl * 0.88, -88, 8, 10, 0, 0, Math.PI * 2); g.fill(); }
  // eye
  g.fillStyle = p.eyeRing || '#ffffff';
  g.beginPath(); g.arc(30, -102, 9, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#0b0b0b';
  g.beginPath(); g.arc(31, -102, 5, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.8)';
  g.beginPath(); g.arc(33, -104, 1.6, 0, Math.PI * 2); g.fill();
  // feet
  g.fillStyle = '#2b2b2b';
  g.beginPath(); g.ellipse(0, 94, 16, 7, 0, 0, Math.PI * 2); g.ellipse(26, 92, 14, 6, 0, 0, Math.PI * 2); g.fill();
  g.restore();
  return toTexture(c);
}

/* ---------- foreground leaves framing the edges (very blurred) ---------- */
export function foregroundLeaves({ seed = 1 } = {}) {
  const w = px(1024), h = px(576), r = rng(seed);
  const [c, g] = makeCanvas(w, h);
  const anchors = [
    [0, h * 0.2, 0.2], [0, h * 0.85, -0.3], [w, h * 0.15, Math.PI - 0.3],
    [w, h * 0.9, Math.PI + 0.35], [w * 0.15, h, -1.1], [w * 0.85, 0, 2.2],
  ];
  for (const [ax, ay, base] of anchors) {
    const n = 7 + Math.floor(r() * 5);
    for (let i = 0; i < n; i++) {
      const ang = base + (r() - 0.5) * 1.3;
      const len = (180 + r() * 220) * SCALE;
      leaf(g, ax + (r() - 0.5) * 40, ay + (r() - 0.5) * 60, len, len * (0.2 + r() * 0.1), ang, green(r, 0.0, 0.35), 'rgba(140,190,120,0.18)');
    }
  }
  return toTexture(blurred(c, 9));
}

/* ---------- cloud bank (transparent) ---------- */
export function cloudBank({ seed = 1, puffs = 70 } = {}) {
  const w = px(1024), h = px(512), r = rng(seed);
  const [c, g] = makeCanvas(w, h);
  // billows: each puff is a shaded disc with a lit cap offset upward, drawn
  // back to front (lowest first) so the tops overlap like cumulus
  const list = [];
  for (let i = 0; i < puffs * SCALE + 10; i++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r());
    list.push({
      x: w * 0.5 + Math.cos(a) * d * w * 0.34,
      y: h * 0.55 + Math.sin(a) * d * h * 0.2,
      rad: (40 + r() * 90) * SCALE * (1.2 - d * 0.5),
    });
  }
  list.sort((p, q) => q.y - p.y);
  for (const { x, y, rad } of list) {
    const sg = g.createRadialGradient(x, y, rad * 0.2, x, y, rad);
    sg.addColorStop(0, 'rgba(170,186,206,0.95)');
    sg.addColorStop(0.7, 'rgba(176,192,212,0.7)');
    sg.addColorStop(1, 'rgba(176,192,212,0)');
    g.fillStyle = sg;
    g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.fill();
    const cx = x - rad * 0.12, cy = y - rad * 0.3, cr = rad * 0.78;
    const lg = g.createRadialGradient(cx, cy, cr * 0.1, cx, cy, cr);
    lg.addColorStop(0, 'rgba(255,255,255,1)');
    lg.addColorStop(0.65, 'rgba(250,251,253,0.85)');
    lg.addColorStop(1, 'rgba(240,244,250,0)');
    g.fillStyle = lg;
    g.beginPath(); g.arc(cx, cy, cr, 0, Math.PI * 2); g.fill();
  }
  // grey-blue underside and a few darker pockets so the bank has form
  g.globalCompositeOperation = 'source-atop';
  const sh = g.createLinearGradient(0, h * 0.3, 0, h * 0.8);
  sh.addColorStop(0, 'rgba(150,166,186,0)');
  sh.addColorStop(1, 'rgba(118,134,158,0.45)');
  g.fillStyle = sh; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 14; i++) {
    const x = w * (0.2 + r() * 0.6), y = h * (0.45 + r() * 0.3), rad = (60 + r() * 90) * SCALE;
    const pg = g.createRadialGradient(x, y, 0, x, y, rad);
    pg.addColorStop(0, 'rgba(120,136,160,0.35)');
    pg.addColorStop(1, 'rgba(120,136,160,0)');
    g.fillStyle = pg; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  g.globalCompositeOperation = 'source-over';
  edgeMask(g, w, h, 0.18, 0.22);
  return toTexture(c);
}

/* ---------- butterfly wing, hinge on the left edge ---------- */
export function butterflyWing(kind) {
  const s = px(256);
  const [c, g] = makeCanvas(s, s);
  const u = s / 256;
  g.scale(u, u);
  const morpho = kind === 'morpho';
  const shape = () => {
    g.beginPath();
    g.moveTo(0, 128);
    g.bezierCurveTo(60, 10, 210, -10, 240, 70);   // forewing (toward +v, the front)
    g.bezierCurveTo(250, 110, 150, 128, 120, 132);
    g.bezierCurveTo(200, 150, 210, 230, 140, 246); // hindwing
    g.bezierCurveTo(80, 256, 20, 200, 0, 132);
    g.closePath();
  };
  shape();
  const fill = g.createRadialGradient(30, 128, 10, 60, 120, 230);
  if (morpho) {
    fill.addColorStop(0, '#7fe0ff'); fill.addColorStop(0.45, '#1e8bff'); fill.addColorStop(1, '#0b2a8a');
  } else {
    fill.addColorStop(0, '#ffc36b'); fill.addColorStop(0.5, '#ff7a12'); fill.addColorStop(1, '#a83a00');
  }
  g.fillStyle = fill; g.fill();
  g.lineWidth = 12; g.strokeStyle = '#0a0a10'; g.stroke();
  if (!morpho) {
    g.strokeStyle = 'rgba(10,10,10,0.75)'; g.lineWidth = 3;
    for (let i = 0; i < 6; i++) {
      g.beginPath(); g.moveTo(4, 128); g.quadraticCurveTo(80, 128 - 60 + i * 24, 220 - i * 10, 50 + i * 36); g.stroke();
    }
  }
  g.fillStyle = 'rgba(255,255,255,0.85)';
  for (let i = 0; i < 7; i++) { g.beginPath(); g.arc(150 + i * 13, 46 + i * 8, 3.2, 0, Math.PI * 2); g.fill(); }
  return toTexture(c);
}

/* ---------- light ray (soft vertical shaft) ---------- */
export function lightRay() {
  const w = px(128), h = px(512);
  const [c, g] = makeCanvas(w, h);
  const gx = g.createLinearGradient(0, 0, w, 0);
  gx.addColorStop(0, 'rgba(255,255,255,0)');
  gx.addColorStop(0.5, 'rgba(255,255,255,1)');
  gx.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gx; g.fillRect(0, 0, w, h);
  g.globalCompositeOperation = 'destination-in';
  const gy = g.createLinearGradient(0, 0, 0, h);
  gy.addColorStop(0, 'rgba(0,0,0,0.9)');
  gy.addColorStop(0.6, 'rgba(0,0,0,0.35)');
  gy.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gy; g.fillRect(0, 0, w, h);
  return toTexture(c);
}

/* ---------- radial glow (sun / bloom source) ---------- */
export function radialGlow() {
  const s = px(256);
  const [c, g] = makeCanvas(s, s);
  const rg = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  rg.addColorStop(0, 'rgba(255,255,255,1)');
  rg.addColorStop(0.2, 'rgba(255,255,255,0.55)');
  rg.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = rg; g.fillRect(0, 0, s, s);
  return toTexture(c);
}
