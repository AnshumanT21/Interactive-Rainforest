// Butterflies on looping Lissajous paths around anchors near each stop.
// Each one checks its screen position against the cursor and darts away,
// then drifts back to its path.
import * as THREE from 'three';
import { butterflyWing, rng } from './textures.js';

const _ndc = new THREE.Vector3();
const _right = new THREE.Vector3();
const _up = new THREE.Vector3();
const _fwd = new THREE.Vector3();
const _push = new THREE.Vector3();
const _target = new THREE.Vector3();
const TAU = Math.PI * 2;

export function createButterflies(scene, anchors, { perAnchor = 5, occlusion = null } = {}) {
  const geo = new THREE.PlaneGeometry(1, 1);
  geo.rotateX(Math.PI / 2);     // lie flat, forewing toward +z (forward)
  geo.translate(0.5, 0, 0);     // hinge on the body
  const mats = {
    morpho: new THREE.MeshBasicMaterial({ map: butterflyWing('morpho'), transparent: true, side: THREE.DoubleSide, depthWrite: false, color: new THREE.Color(1.35, 1.35, 1.35) }),
    orange: new THREE.MeshBasicMaterial({ map: butterflyWing('orange'), transparent: true, side: THREE.DoubleSide, depthWrite: false }),
  };

  const r = rng(91);
  const flock = [];
  anchors.forEach((anchor) => {
    for (let i = 0; i < perAnchor; i++) {
      const mat = r() > 0.45 ? mats.morpho : mats.orange;
      const group = new THREE.Group();
      const right = new THREE.Mesh(geo, mat);
      const left = new THREE.Mesh(geo, mat);
      left.scale.x = -1;
      group.add(right, left);
      const size = 0.22 + r() * 0.14;
      group.scale.setScalar(size);
      scene.add(group);
      flock.push({
        group, right, left, anchor,
        amp: new THREE.Vector3(anchor.spread * (0.5 + r() * 0.5), 0.5 + r() * 0.9, anchor.spread * (0.3 + r() * 0.5)),
        freq: new THREE.Vector3(0.05 + r() * 0.06, 0.09 + r() * 0.08, 0.04 + r() * 0.06),
        phase: new THREE.Vector3(r() * TAU, r() * TAU, r() * TAU),
        flap: 9 + r() * 5, flapPhase: r() * TAU, fright: 0,
        offset: new THREE.Vector3(), vel: new THREE.Vector3(),
        pos: new THREE.Vector3(), heading: new THREE.Vector3(0, 0, 1),
      });
    }
  });

  function pathPoint(b, t, out) {
    return out.set(
      Math.sin(t * b.freq.x * TAU + b.phase.x) * b.amp.x,
      Math.sin(t * b.freq.y * TAU + b.phase.y) * b.amp.y + Math.sin(t * 0.7 + b.phase.z) * 0.15,
      Math.sin(t * b.freq.z * TAU + b.phase.z) * b.amp.z,
    ).add(b.anchor.pos);
  }

  function update(camera, mouse, time, dt) {
    camera.matrixWorld.extractBasis(_right, _up, _fwd);
    const camPos = camera.position;
    for (const b of flock) {
      // near the camera, and not hidden behind a plate in front of its stop
      const near = b.anchor.pos.distanceToSquared(camPos) < 45 * 45 && (!occlusion || occlusion[b.anchor.scene] > 0.5);
      b.group.visible = near;
      if (!near) continue;

      pathPoint(b, time, _target).add(b.offset);

      // cursor scatter, measured in screen space so it matches what you see
      _ndc.copy(_target).project(camera);
      if (mouse.active && _ndc.z < 1) {
        const dx = (_ndc.x - mouse.x) * camera.aspect, dy = _ndc.y - mouse.y;
        const d = Math.hypot(dx, dy), R = 0.28;
        if (d < R) {
          const k = (1 - d / R) ** 2 * 26;
          _push.copy(_right).multiplyScalar(dx / (d + 1e-4)).addScaledVector(_up, dy / (d + 1e-4)).addScaledVector(_fwd, 0.3);
          b.vel.addScaledVector(_push, k * dt);
          b.fright = Math.min(1, b.fright + dt * 4);
        }
      }
      b.vel.multiplyScalar(Math.exp(-2.2 * dt));
      b.offset.addScaledVector(b.vel, dt).multiplyScalar(Math.exp(-0.3 * dt));
      b.fright = Math.max(0, b.fright - dt * 0.6);

      // face the direction of travel, smoothed so turns are lazy
      if (b.pos.lengthSq() === 0) b.pos.copy(_target);
      _push.subVectors(_target, b.pos);
      if (_push.lengthSq() > 1e-8) b.heading.lerp(_push.normalize(), 1 - Math.exp(-5 * dt)).normalize();
      b.pos.copy(_target);
      b.group.position.copy(b.pos);
      b.group.lookAt(_push.copy(b.pos).add(b.heading));

      const rate = b.flap * (1 + b.fright * 0.9);
      b.flapPhase += rate * dt;
      const a = 0.25 + (Math.sin(b.flapPhase) * 0.5 + 0.5) * 1.05;
      b.right.rotation.z = a;
      b.left.rotation.z = -a;
    }
  }

  return { update };
}
