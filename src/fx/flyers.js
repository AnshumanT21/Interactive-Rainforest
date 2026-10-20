// Birds in flight: a macaw pair crossing the canopy, Uma's budgie flock
// (a whole flock sweeping past plus single budgies fluttering around),
// budgie cameos at a couple of other stops, and a last flock at the finale.
import * as THREE from 'three';
import { flyerMaterial } from './materials.js';
import { loadTexture } from '../assets.js';

const A = './assets/birds/';
const PLANE = new THREE.PlaneGeometry(1, 1);
const TAU = Math.PI * 2;
const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// Body lines of the wings-up photos (uv, y up): a point on the body axis,
// the axis direction, which side the wings are on, and how far along the
// axis the wing roots sit. Measured from the cut-outs.
const LINES = {
  'f-macaw-1-up': { p: [0.3, 0.5], dir: [0.25, -0.15], wingSide: [0, 1], shoulder: 0.11 },
  'f-budgie-1-up': { p: [0.72, 0.5], dir: [-0.27, -0.14], wingSide: [0, 1], shoulder: 0.11 },
};
LINES['f-budgie-green-1-up'] = LINES['f-budgie-1-up'];
LINES['f-budgie-yellow-1-up'] = LINES['f-budgie-1-up'];
const GRID = new THREE.PlaneGeometry(1, 1, 40, 40);

export function createFlyers(scene, frames, { mobile, occlusion }) {
  const tex = {};
  const t = (name) => (tex[name] ||= loadTexture(`${A}${name}.webp`));
  const flyers = [];

  // a flyer crosses the view along its stop's frame, looping every `period` s
  function add(frame, { maps, size, aspect = 1, d, y, period, delay = 0, dir = 1, faces = 1, flap, rate = 2, tint = [1, 1, 1], arc = 0.6 }) {
    const mat = flyerMaterial(t(maps[0]), { line: flap === 'drift' ? null : LINES[maps[0]], tint });
    const mesh = new THREE.Mesh(flap === 'drift' ? PLANE : GRID, mat);
    mesh.frustumCulled = false;
    mesh.renderOrder = 0.5;
    scene.add(mesh);
    flyers.push({ mesh, mat, frame, size, aspect, d, y, period, delay, dir, faces, flap, rate, arc, phase: Math.random() * TAU });
  }

  // A flock: individual budgies, each flapping on its own beat, spread
  // through depth and height, crossing together with a little stagger.
  const COLOURS = ['f-budgie-1-up', 'f-budgie-green-1-up', 'f-budgie-yellow-1-up'];
  function flock(fr, { n, d, y, period, delay, tint = [1, 1, 1] }) {
    for (let i = 0; i < n; i++) {
      const r1 = Math.sin(i * 12.9898) * 0.5 + 0.5, r2 = Math.sin(i * 78.233) * 0.5 + 0.5;
      add(fr, {
        maps: [COLOURS[i % 3]], size: 0.6 + r1 * 0.45, d: d + (r2 - 0.5) * 6, y: y + (r1 - 0.5) * 2.4,
        period, delay: delay + r2 * 0.9 + (i % 4) * 0.12, dir: 1, faces: 1, flap: 'flap', rate: 6 + r1 * 2.5, arc: 0.8 + r2, tint,
      });
    }
  }

  for (const fr of frames) {
    const kind = fr.stop.flyers;
    if (kind === 'macaws') {
      add(fr, { maps: ['f-macaw-1-up'], size: 4.2, d: 16, y: 3.2, period: 11, dir: -1, faces: -1, flap: 'flap', rate: 1.6 });
      add(fr, { maps: ['f-macaw-1-up'], size: 3.6, d: 19, y: 4.4, period: 11, delay: 1.1, dir: -1, faces: -1, flap: 'flap', rate: 1.75 });
    } else if (kind === 'budgies') {
      flock(fr, { n: mobile ? 7 : 12, d: 17, y: 3.6, period: 12, delay: 2 });
      const solo = ['f-budgie-1-up', 'f-budgie-green-1-up', 'f-budgie-yellow-1-up'];
      solo.forEach((m, i) => add(fr, { maps: [m], size: 1.25 - i * 0.12, d: 10 + i * 2.5, y: 1.6 + i * 0.7, period: 7 + i * 1.7, delay: i * 2.3, dir: i % 2 ? -1 : 1, faces: 1, flap: 'flap', rate: 7, arc: 1.4 }));
    } else if (kind === 'budgie-cameo') {
      add(fr, { maps: ['f-budgie-1-up'], size: 0.9, d: 15, y: 3.5, period: 15, delay: 4, dir: 1, faces: 1, flap: 'flap', rate: 7, tint: fr.stop.light === 'late' ? [1.05, 0.88, 0.72] : [1, 1, 1] });
    } else if (kind === 'finale') {
      flock(fr, { n: mobile ? 6 : 10, d: 21, y: 5.6, period: 16, delay: 0, tint: [0.85, 0.85, 0.9] });
      if (!mobile) add(fr, { maps: ['f-budgie-yellow-1-up'], size: 1.1, d: 12, y: 2.4, period: 10, delay: 5, dir: -1, faces: 1, flap: 'flap', rate: 7, tint: [0.9, 0.9, 0.95] });
    }
  }

  const _d = new THREE.Vector3();
  function update(camera, time) {
    const tanH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    for (const f of flyers) {
      const fr = f.frame;
      _d.subVectors(camera.position, fr.C);
      const along = -_d.dot(fr.f);              // > 0 once the camera has passed the stop
      const dist = _d.length();
      const near = smoothstep(26, 10, dist) * smoothstep(6, 1, along) * occlusion[fr.index];
      const ready = f.mat.uniforms.uMap.value.userData.ready;
      if (near < 0.01 || !ready) { f.mesh.visible = false; continue; }

      // progress across the screen, 0 -> 1, then a pause before the next pass
      const cycle = ((time + f.delay) / f.period) % 1;
      const u = cycle / 0.75;
      if (u > 1) { f.mesh.visible = false; continue; }
      const halfW = tanH * f.d * camera.aspect * 1.25 + f.size * f.aspect * 0.5;
      const x = (u * 2 - 1) * halfW * f.dir;
      const bob = Math.sin(u * Math.PI) * f.arc - f.arc * 0.5 + Math.sin(time * 2.1 + f.phase) * 0.12;
      f.mesh.position.copy(fr.at(f.d, x, f.y + bob));
      f.mesh.quaternion.copy(camera.quaternion);
      // tip slightly with the arc
      f.mesh.rotateZ(Math.cos(u * Math.PI) * 0.12 * f.dir * -1);

      const sx = f.size * f.aspect, sy = f.size;
      if (f.flap === 'flap') {
        // wing angle 0 (top) -> 2.3 rad (bottom of the stroke) and back; the
        // downstroke takes a little less time than the recovery
        const c = (time * f.rate + f.phase) % 1;
        const s = c < 0.45 ? smoothstep(0, 0.45, c) : 1 - smoothstep(0.45, 1, c);
        f.mat.uniforms.uBeat.value = s * 2.3;
      }
      // face the direction of travel
      f.mesh.scale.set(sx * (f.dir === f.faces ? 1 : -1), sy, 1);
      f.mat.uniforms.uOpacity.value = near * smoothstep(0, 0.06, u) * smoothstep(1, 0.94, u);
      f.mesh.visible = true;
    }
  }

  return { update };
}
