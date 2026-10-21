// The journey: stop data, the camera path, scroll-progress mapping and the
// photo layers (background plate, bird, foreground leaves) of every stop.
//
// How a transition works: each stop's background plate sits a fixed distance
// in front of that stop's camera position, and the next stop's plate sits
// further down the path, hidden behind it. Flying forward, the camera reaches
// the current plate, which dissolves to reveal the next one, so scrolling
// feels like pushing through the forest from one clearing to the next.
import * as THREE from 'three';
import * as tex from './fx/textures.js';
import { plateMaterial, birdMaterial } from './fx/materials.js';
import { loadTexture } from './assets.js';
import BIRDS from './content/birds.json';

const UP = new THREE.Vector3(0, 1, 0);
const A = './assets/';

const LIGHT = {
  dawn: [0.94, 0.97, 1.0],
  day: [1.0, 1.0, 0.97],
  golden: [1.08, 0.92, 0.78],
  late: [1.06, 0.86, 0.7],
  dusk: [0.66, 0.72, 0.84],
};

// Each bird sits on a real branch in its background photo, so it is placed
// in the photo's own coordinates and moves with it.
// perch: the spot on the photo's branch, in the photo's uv (0,0 = bottom left).
// feet:  where the bird grips, in the cut-out's uv. The two are pinned together.
// hf:    bird height as a fraction of the photo's height.
// side:  which half of the screen the bird is in (+1 right); the card takes the other.
// video: a looping Veo clip of the bird already in its scene. When present it
//        replaces the photo and the cut-out bird; videoX is where the bird is
//        across the clip (0..1), used to frame it.
const STOP_DEFS = {
  macaw:      { plate: 'p01-macaw-canopy',      bird: 'b01-macaw-perched',  side: -1, perch: [0.31, 0.49], feet: [0.38, 0.46], hf: 0.36, light: 'dawn', video: 'v01-macaw', videoX: 0.21 },
  toucan:     { plate: 'p02-toucan-high-branch', bird: 'b02-toucan',         side: -1, perch: [0.4, 0.388],  feet: [0.47, 0.31], hf: 0.33, light: 'dawn', video: 'v02-toucan', videoX: 0.45 },
  amazon:     { plate: 'p03-amazon-mossy-limb',  bird: 'b03-amazon',         side: -1, perch: [0.42, 0.27],   feet: [0.55, 0.3],  hf: 0.34, light: 'dawn', video: 'v03-amazon', videoX: 0.45 },
  sunconure:  { plate: 'p04-sunconure-clearing', bird: 'b04-sun-conures',    side: -1, perch: [0.4, 0.335],  feet: [0.5, 0.37],  hf: 0.3,  light: 'day', video: 'v04-sunconures', videoX: 0.25 },
  ringneck:   { plate: 'p05-ringneck-vines',     bird: 'b05-ringneck',       side: -1, perch: [0.38, 0.37],    feet: [0.37, 0.53], hf: 0.33, light: 'day', video: 'v05-ringneck', videoX: 0.28 },
  greencheek: { plate: 'p06-greencheek-leaves',  bird: 'b06-green-cheeks',   side: -1, perch: [0.45, 0.375],    feet: [0.5, 0.37],  hf: 0.32, light: 'day', video: 'v06-greencheekedconures', videoX: 0.36 },
  quaker:     { plate: 'p07-quaker-nest-tree',   bird: 'b07-quakers',        side: 1,  perch: [0.675, 0.625], feet: [0.48, 0.37], hf: 0.25, light: 'day', video: 'v07-quakers', videoX: 0.65 },
  budgie:     { plate: 'p08-budgie-bush',        bird: 'b08-budgies-perched', side: -1, perch: [0.4, 0.6], feet: [0.5, 0.42], hf: 0.24, light: 'day', weight: 1.6, video: 'v08-budgies', videoX: 0.3 },
  lovebird:   { plate: 'p09-lovebird-golden',    bird: 'b09-lovebirds',      side: 1,  perch: [0.6, 0.365],   feet: [0.5, 0.2],   hf: 0.27, light: 'golden' },
  cockatiel:  { plate: 'p10-cockatiel-golden',   bird: 'b10-cockatiel',      side: 1,  perch: [0.6, 0.39],   feet: [0.6, 0.36],  hf: 0.32, light: 'late', flyers: 'budgie-cameo' },
  owl:        { plate: 'p11-owl-dusk-hollow',    bird: 'b11-barn-owl',       side: 1,  perch: [0.615, 0.44],  feet: [0.5, 0.08],  hf: 0.31, light: 'dusk' },
  waterfall:  { plate: 'p12-waterfall', bird: null, side: -1, light: 'dusk', flyers: 'finale', weight: 1.4,
                water: [0.23, 0.18, 0.37, 0.74], plateShift: 0.07, portraitShift: 0.2 },
};

export const STOPS = BIRDS.map((b) => ({ ...b, ...STOP_DEFS[b.id] }));

// Path layout. Index 0: above the clouds, 1: the title over the canopy,
// 2…13: the stops. Each entry: camera position, view direction, how far in
// front of it its plate sits.
const SPACING = 22;      // distance between stop cameras
const PLATE_D = 20;      // plate distance in front of a stop camera
const FADE_NEAR = 13;    // a plate dissolves as the camera closes from 13 to ~3 units

const SCENES = [
  { cam: [0, 34, 0], dir: [0, -0.18, -1], plate: '01-sky-above-clouds', d: 58 },
  { cam: [0, 6, -80], dir: [0, -0.06, -1], plate: '02-canopy-reveal', d: 45 },
  ...STOPS.map((s, k) => ({
    cam: [Math.sin(k * 1.7) * 3.5, 4 - k * 0.8, -128 - k * SPACING],
    dir: [Math.sin(k * 2.3) * 0.08, -0.02, -1],
    plate: s.plate, d: PLATE_D, stop: s,
  })),
];
export const LAST_INDEX = SCENES.length - 1;

// Scroll progress -> path index. Each stop gets a transit (camera moving)
// then a hold (camera settled, card showing). Budgies, Uma's favourite, and
// the finale hold longer.
const INTRO = [[0, 0], [0.012, 0], [0.085, 1], [0.13, 1]];
const KEYS = (() => {
  const keys = [...INTRO];
  const start = 0.13;
  const weights = STOPS.map((s) => s.weight || 1);
  const sum = weights.reduce((a, b) => a + b, 0);
  let p = start;
  STOPS.forEach((s, k) => {
    const len = ((1 - start) * weights[k]) / sum;
    const arrive = p + Math.min(0.045, len * 0.5);
    s.hold = [arrive, p + len];
    keys.push([arrive, k + 2], [p + len, k + 2]);
    p += len;
  });
  return keys;
})();
export const TITLE_WINDOW = { in: [0.055, 0.085], out: [0.13, 0.15] };

// Background (clear) colour along the scroll: pale sky, then deep forest.
const BG_KEYS = [
  [0.0, '#cbd8e1'],
  [0.07, '#c3cfd6'],
  [0.1, '#0d1d15'],
  [0.85, '#0b1810'],
  [1.0, '#08130f'],
];

const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const smootherstep = (t) => t * t * t * (t * (t * 6 - 15) + 10);

export function progressToIndex(p) {
  for (let i = 0; i < KEYS.length - 1; i++) {
    const [p0, i0] = KEYS[i], [p1, i1] = KEYS[i + 1];
    if (p <= p1) {
      const t = p1 === p0 ? 1 : (p - p0) / (p1 - p0);
      return i0 + (i1 - i0) * smootherstep(Math.min(1, Math.max(0, t)));
    }
  }
  return LAST_INDEX;
}

const _a = new THREE.Color(), _b = new THREE.Color();
export function backgroundAt(p, out) {
  for (let i = 0; i < BG_KEYS.length - 1; i++) {
    const [p0, c0] = BG_KEYS[i], [p1, c1] = BG_KEYS[i + 1];
    if (p <= p1 || i === BG_KEYS.length - 2) {
      return out.copy(_a.set(c0)).lerp(_b.set(c1), smoothstep(p0, p1, p));
    }
  }
  return out.set(BG_KEYS[0][1]);
}

const PLANE = new THREE.PlaneGeometry(1, 1);
const PLATE_ASPECT = 2752 / 1536;

// A muted, inline, looping <video> feeding a texture. It only downloads and
// plays while its stop is close (see update), so a dozen clips never decode at once.
function makeVideo(src, mat) {
  const el = document.createElement('video');
  Object.assign(el, { muted: true, loop: true, playsInline: true, preload: 'none', crossOrigin: 'anonymous' });
  el.setAttribute('muted', '');
  el.setAttribute('playsinline', '');
  const texture = new THREE.VideoTexture(el);
  // three can't hand video frames to the GPU as sRGB the way it does images,
  // and a custom shader gets the raw values, so the plate shader decodes
  // them itself (uDecode); untouched, the video renders washed out and grey.
  texture.colorSpace = THREE.NoColorSpace;
  texture.userData.ready = true;
  const v = { el, texture, src, loaded: false, playing: false };
  // swap from the still to the video only once a real frame is on the GPU
  v.swap = () => { mat.uniforms.uMap.value = texture; mat.uniforms.uDecode.value = 1; };
  return v;
}

export function createJourney(scene, { mobile }) {
  const cams = SCENES.map((s) => new THREE.Vector3(...s.cam));
  const curve = new THREE.CatmullRomCurve3(cams, false, 'centripetal');
  // the look-at curve runs a fixed distance ahead of each scene camera
  const looks = SCENES.map((s, i) => cams[i].clone().addScaledVector(new THREE.Vector3(...s.dir).normalize(), 20));
  const lookCurve = new THREE.CatmullRomCurve3(looks, false, 'centripetal');

  const layers = [];   // planes that dissolve as the camera reaches them
  const plates = [];
  const birds = [];
  const anchors = [];  // butterfly anchors
  const frames = [];   // per-stop coordinate frames, for flyers

  const size = mobile ? '-sm' : '';
  const shadowTex = tex.radialGlow();
  const mists = [];
  SCENES.forEach((sc, si) => {
    const C = cams[si];
    const f = new THREE.Vector3(...sc.dir).normalize();
    const right = new THREE.Vector3().crossVectors(f, UP).normalize();
    const up = new THREE.Vector3().crossVectors(right, f).normalize();
    const at = (d, ox = 0, oy = 0) => C.clone().addScaledVector(f, d).addScaledVector(right, ox).addScaledVector(up, oy);
    const group = new THREE.Group();
    scene.add(group);

    const addLayer = (mesh, pos, fadeNear) => {
      mesh.position.copy(pos);
      mesh.lookAt(C);
      mesh.userData.normal = new THREE.Vector3(0, 0, 1).applyQuaternion(mesh.quaternion);
      mesh.userData.fadeNear = fadeNear;
      mesh.userData.scene = si;
      mesh.frustumCulled = false;
      group.add(mesh);
      layers.push(mesh);
      return mesh;
    };

    // background plate (drawn first, furthest back)
    const stop = sc.stop;
    // a stop with a video starts on the clip's first frame, then swaps to the
    // playing video once it has loaded
    const still = stop?.video ? `${A}video/${stop.video}.webp` : `${A}plates/${sc.plate}${size}.webp`;
    const mat = plateMaterial(loadTexture(still), { water: stop?.video ? null : stop?.water });
    mat.uniforms.uTint.value.set(...(stop?.light === 'dusk' ? [0.92, 0.95, 1.0] : [1, 1, 1]));
    const plate = addLayer(new THREE.Mesh(PLANE, mat), at(sc.d), si === 0 ? 22 : FADE_NEAR);
    plate.userData.isPlate = true;
    plate.renderOrder = -10 - si * 0.01;   // furthest first, so nearer plates cover it
    const entry = { mesh: plate, index: si, d: sc.d, base: plate.position.clone(), right, stop, aspect: PLATE_ASPECT };
    plates.push(entry);
    if (stop?.video) {
      entry.aspect = 16 / 9;
      entry.video = makeVideo(`${A}video/${stop.video}${mobile ? '-sm' : ''}.mp4`, mat);
    }

    if (!stop) return;
    const k = si - 2;

    // mist rising off the plunge pool, drifting up and away
    if (stop.water) {
      const [x0, y0, x1] = stop.water;
      for (let i = 0; i < (mobile ? 5 : 9); i++) {
        const puff = new THREE.Mesh(PLANE, new THREE.MeshBasicMaterial({
          map: shadowTex, color: new THREE.Color(0.85, 0.9, 0.92), transparent: true, depthWrite: false, fog: false, opacity: 0,
        }));
        puff.renderOrder = plate.renderOrder + 0.006;
        puff.frustumCulled = false;
        plate.add(puff);
        mists.push({ mesh: puff, plate, x: (x0 + x1) / 2 + (i / 8 - 0.5) * 0.22, y: y0 + 0.02, life: 7 + (i % 3) * 2, t0: i * 0.83 });
      }
    }
    frames.push({ at, C, f, right, up, stop, index: si });

    // the bird, pinned to its perch on the photo (a child of the plate, so the
    // two move as one and the feet never slide off the branch)
    if (stop.bird && !stop.video) {
      const map = loadTexture(`${A}birds/${stop.bird}.webp`, (t) => {
        b.aspect = t.image.width / t.image.height;
        placeBird(b);
      });
      const mask = loadTexture(`${A}birds/${stop.bird}-mask.webp`, null, { data: true });
      const bm = birdMaterial(map, mask, { tint: LIGHT[stop.light], phase: k * 1.7, feet: stop.feet });
      const mesh = new THREE.Mesh(PLANE, bm);
      mesh.renderOrder = plate.renderOrder + 0.005;
      mesh.frustumCulled = false;
      // soft contact shadow where the feet meet the branch
      const shadow = new THREE.Mesh(PLANE, new THREE.MeshBasicMaterial({
        map: shadowTex, color: 0x000000, transparent: true, depthWrite: false, fog: false, opacity: 0,
      }));
      shadow.renderOrder = plate.renderOrder + 0.004;
      shadow.frustumCulled = false;
      plate.add(shadow, mesh);
      const b = { mesh, shadow, plate, stop, aspect: 0.75, hover: 0 };
      birds.push(b);
    }

    // foreground leaves framing the view; the camera glides through them
    const leaves = addLayer(new THREE.Mesh(PLANE, new THREE.MeshBasicMaterial({
      map: tex.foregroundLeaves({ seed: k * 7 + 5 }), transparent: true, depthWrite: false, fog: false,
      color: new THREE.Color(...LIGHT[stop.light]).multiplyScalar(stop.light === 'dusk' ? 0.4 : 0.75),
    })), at(4.4), 2.6);
    leaves.scale.set(9.4, 5.3, 1);
    leaves.renderOrder = 2;
    leaves.userData.baseOpacity = 0.55;

    anchors.push({ pos: at(8, -stop.side * 1.4, 0.8), spread: 3, scene: si });
    anchors.push({ pos: at(14, stop.side * 3.5, 1.5), spread: 4.5, scene: si });
  });
  // one anchor in the open air beneath the clouds, near the title
  anchors.push({ pos: cams[1].clone().add(new THREE.Vector3(0, -2, -12)), spread: 6, scene: 1 });

  // How far back a plate is when it first appears (the moment the plate in
  // front of it is half dissolved). It must cover the screen from there.
  plates.forEach((p, i) => {
    if (i === 0) { p.reveal = p.d; return; }
    const prev = plates[i - 1].mesh;
    const revealAt = prev.position.clone().addScaledVector(prev.userData.normal, FADE_NEAR * 0.6);
    // video scenes are framed wider: their bird is already composed in the shot
    p.reveal = Math.min(p.mesh.position.distanceTo(revealAt), p.d * (p.video ? 1.08 : 1.45));
  });

  // Plate-local units: the plate is a 1x1 quad scaled to the photo, so
  // (u - 0.5, v - 0.5) is a point on the photo; children undo the plate's
  // non-uniform scale through their own scale.
  function placeBird(b) {
    const { perch, feet, hf } = b.stop;
    const wl = (hf * b.aspect) / PLATE_ASPECT;
    b.mesh.scale.set(wl, hf, 1);
    b.mesh.position.set(perch[0] - 0.5 - (feet[0] - 0.5) * wl, perch[1] - 0.5 - (feet[1] - 0.5) * hf, 0.002);
    b.shadow.scale.set(wl * 0.55, hf * 0.07, 1);
    b.shadow.position.set(perch[0] - 0.5, perch[1] - 0.5 - hf * 0.012, 0.001);
  }

  function layout(camera) {
    const tanH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const portrait = camera.aspect < 0.8;
    for (const p of plates) {
      // cover the viewport (plus a margin for mouse parallax) from the reveal distance
      const viewH = 2 * tanH * p.reveal * 1.1;
      const viewW = viewH * camera.aspect;
      const PA = p.aspect;
      let w = Math.max(viewH, viewW / PA) * PA;

      // Slide the photo sideways so its bird lands on its own side of the
      // screen (centred on phones), whatever the screen shape.
      const st = p.stop;
      let shift = 0;
      const birdX = st?.video ? st.videoX : st?.perch?.[0];
      if (birdX != null) {
        const visible = (2 * tanH * p.d * camera.aspect) / w;   // share of the photo's width on screen at the stop
        const target = portrait ? 0.5 : st.side < 0 ? 0.3 : 0.7;
        const a = (target - 0.5) * visible;
        shift = (a + 0.5 - birdX) / (1 + 2 * a);
        // photos may enlarge to slide further; videos are already composed, so
        // they only slide as far as their spare width allows at the stop
        const limit = p.video ? Math.max(0, (1 - visible) / 2 - 0.01) : portrait ? 0.32 : 0.09;
        shift = Math.max(-limit, Math.min(limit, shift));
      } else if (st) {
        shift = portrait ? st.portraitShift ?? 0 : st.plateShift ?? 0;
      }
      // a slid photo must still cover the screen when it first appears
      if (!p.video) w = Math.max(w, viewW / (1 - 2 * Math.abs(shift)));
      const h = w / PA;
      p.mesh.scale.set(w, h, 1);
      p.mesh.position.copy(p.base).addScaledVector(p.right, w * shift);
    }
  }

  const occlusion = new Float32Array(SCENES.length).fill(1);
  const _d = new THREE.Vector3();
  const _ndc = new THREE.Vector3();
  const _corner = new THREE.Vector3();
  const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
  function update(camera, mouse, time, dt) {
    const cameraPos = camera.position;
    for (const m of layers) {
      _d.subVectors(cameraPos, m.position);
      const ahead = _d.dot(m.userData.normal);   // > 0 while the plane is in front
      const ready = m.material.uniforms ? (m.material.uniforms.uMap || m.material.uniforms.uMapA).value.userData.ready !== false : true;
      const base = m.userData.baseOpacity ?? 1;
      const o = ready ? base * smoothstep(m.userData.fadeNear * 0.25, m.userData.fadeNear, ahead) : 0;
      if (m.material.uniforms) {
        m.material.uniforms.uOpacity.value = o;
        if (m.material.uniforms.uTime) m.material.uniforms.uTime.value = time;
      } else m.material.opacity = o;
      m.visible = o > 0.003 && ahead > 0;
    }
    // Things behind a plate are hidden by it. occlusion[j] is how much of
    // scene j shows through every plate in front of it.
    let through = 1;
    for (let i = 0; i < plates.length; i++) {
      occlusion[i] = through;
      const o = plates[i].mesh.visible ? plates[i].mesh.material.uniforms.uOpacity.value : 0;
      through *= 1 - o;
    }
    for (const m of layers) {
      if (m.userData.isPlate || !m.visible) continue;
      const k = occlusion[m.userData.scene];
      if (m.material.uniforms) m.material.uniforms.uOpacity.value *= k;
      else m.material.opacity *= k;
      if (k < 0.003) m.visible = false;
    }

    // Only the first few plates still ahead of the camera can be seen; the
    // rest are hidden behind them, so don't spend fill-rate drawing them.
    let shown = 0;
    for (const p of plates) {
      if (!p.mesh.visible) continue;
      if (shown >= 3) p.mesh.visible = false;
      else if (p.mesh.material.uniforms.uOpacity.value > 0.98) shown += 2;
      else shown++;
    }
    // Play the videos of the plate on screen and the next one; pause the rest.
    let first = -1;
    for (let i = 0; i < plates.length; i++) if (plates[i].mesh.visible) { first = i; break; }
    for (let i = 0; i < plates.length; i++) {
      const v = plates[i].video;
      if (!v) continue;
      const want = first >= 0 && i >= first - 1 && i <= first + 2;
      if (want && !v.loaded) { v.el.src = v.src; v.el.preload = 'auto'; v.loaded = true; }
      const play = want && i <= first + 1;
      if (play && !v.playing && time > (v.retryAt || 0)) {
        v.playing = true;
        // if the browser refuses (e.g. power saving), keep the still and try again later
        v.el.play().catch(() => { v.playing = false; v.retryAt = time + 2; });
      }
      else if (!play && v.playing) { v.playing = false; v.el.pause(); }
      // Push each new frame to the GPU ourselves: three waits for the browser's
      // video-frame callback, which some browsers skip (background tabs, some
      // power-saving modes), leaving the texture black.
      if (v.playing && v.el.readyState >= 2) {
        v.texture.needsUpdate = true;
        if (!v.swapped) { v.swapped = true; v.swap(); }
      }
    }
    for (const m of mists) {
      const po = m.plate.visible ? m.plate.material.uniforms.uOpacity.value * occlusion[m.plate.userData.scene] : 0;
      const a = ((time + m.t0) % m.life) / m.life;          // 0 -> 1 over each puff's life
      m.mesh.position.set(m.x - 0.5 + Math.sin(time * 0.3 + m.t0) * 0.02 + a * 0.06, m.y - 0.5 + a * 0.3, 0.003);
      const sz = 0.06 + a * 0.12;
      m.mesh.scale.set(sz, sz * PLATE_ASPECT * 0.6, 1);
      m.mesh.material.opacity = po * Math.sin(a * Math.PI) * 0.07;
      m.mesh.visible = po > 0.003;
    }
    for (const b of birds) {
      // a bird is part of its photo: same opacity, same visibility
      const u = b.plate.material.uniforms;
      const ready = b.mesh.material.uniforms.uMap.value.userData.ready;
      const o = b.plate.visible && ready ? u.uOpacity.value * occlusion[b.plate.userData.scene] : 0;
      b.mesh.visible = b.shadow.visible = o > 0.003;
      b.mesh.material.uniforms.uOpacity.value = o;
      b.mesh.material.uniforms.uTime.value = time;
      b.shadow.material.opacity = o * (b.stop.light === 'dusk' ? 0.5 : 0.38);

      // hover: is the pointer over the middle of the bird on screen?
      let over = false;
      if (b.mesh.visible && mouse.active) {
        b.mesh.updateWorldMatrix(true, false);
        _ndc.set(0, 0, 0).applyMatrix4(b.mesh.matrixWorld).project(camera);
        _corner.set(0.35, 0.4, 0).applyMatrix4(b.mesh.matrixWorld).project(camera);
        const rx = Math.abs(_corner.x - _ndc.x), ry = Math.abs(_corner.y - _ndc.y);
        over = Math.abs(mouse.x - _ndc.x) < rx && Math.abs(mouse.y - _ndc.y) < ry;
      }
      b.hover = damp(b.hover, over ? 1 : 0, over ? 6 : 2, dt);
      b.mesh.material.uniforms.uHover.value = b.hover;
    }
  }

  return { curve, lookCurve, anchors, frames, layout, update, birds, occlusion, videos: plates.filter((p) => p.video).map((p) => p.video) };
}
