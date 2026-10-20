// Clouds intro: 3–4 layers set across the start of the camera path. As the
// camera reaches each one its two halves peel apart to the sides while a
// noise dissolve eats them from the edges in.
import * as THREE from 'three';
import { loadTexture } from '../assets.js';

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  precision mediump float;
  uniform sampler2D uMap;
  uniform float uOpacity;
  uniform float uDissolve;
  uniform float uTime;
  uniform float uSeed;
  uniform vec3 uTint;
  varying vec2 vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
    return v;
  }

  void main() {
    vec2 drift = vec2(uTime * 0.006, 0.0);
    vec4 c = texture2D(uMap, vUv + drift * 0.3);
    float n = fbm(vUv * vec2(5.0, 2.6) + drift * 4.0 + uSeed);
    // dissolve from the outer edges inward: the centre holds on longest
    float edge = length((vUv - 0.5) * vec2(1.0, 1.6));
    float d = smoothstep(uDissolve - 0.32, uDissolve + 0.32, n + 0.55 - edge * 0.9);
    float a = c.a * d * uOpacity * smoothstep(0.0, 0.08, vUv.x) * smoothstep(1.0, 0.92, vUv.x);
    if (a < 0.004) discard;
    // wispy edges of the photo are warm and dim; keep them cloud-white so
    // overlapping banks don't show seams
    vec3 col = mix(vec3(0.97, 0.955, 0.93), c.rgb, smoothstep(0.35, 0.95, c.a));
    // the photo's golden rim light reads as a seam where mirrored halves meet
    col = mix(vec3(dot(col, vec3(0.299, 0.587, 0.114))), col, 0.5);
    gl_FragColor = vec4(uTint * col, a);
  }
`;

const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// Sky dome for the intro: blue overhead, pale at the horizon, a low sun for
// bloom. It blends into the fog colour as the camera drops below the clouds.
export function createSky(scene) {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uZenith: { value: new THREE.Color('#3f6f9e') },
      uHorizon: { value: new THREE.Color('#a8bfd1') },
      uFog: { value: new THREE.Color() },
      uFogMix: { value: 0 },
      uSunDir: { value: new THREE.Vector3(0.35, 0.28, -1).normalize() },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      precision mediump float;
      uniform vec3 uZenith, uHorizon, uFog, uSunDir;
      uniform float uFogMix;
      varying vec3 vDir;
      void main() {
        vec3 d = normalize(vDir);
        vec3 col = mix(uHorizon, uZenith, pow(clamp(d.y, 0.0, 1.0), 0.55));
        col = mix(col, uHorizon * 0.92, smoothstep(0.0, -0.3, d.y));
        float s = max(dot(d, uSunDir), 0.0);
        col += vec3(1.0, 0.92, 0.78) * (pow(s, 900.0) * 3.0 + pow(s, 24.0) * 0.18);
        gl_FragColor = vec4(mix(col, uFog, uFogMix), 1.0);
      }
    `,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(450, 32, 16), material);
  mesh.renderOrder = -1;
  mesh.frustumCulled = false;
  scene.add(mesh);
  return {
    update(cameraPos, fogColor, fogMix) {
      mesh.position.copy(cameraPos);
      material.uniforms.uFog.value.copy(fogColor);
      material.uniforms.uFogMix.value = fogMix;
    },
  };
}

// indices: where along the path (in scene-index units) each cloud bank sits
export function createClouds(scene, curve, { lastIndex, indices }) {
  // three photographed clouds, mixed and mirrored across the banks
  const textures = ['c01', 'c02', 'c03'].map((c) => loadTexture(`./assets/clouds/${c}-cloud.webp`, null, { first: true }));
  const layers = [];

  for (let i = 0; i < indices.length; i++) {
    const t = indices[i] / lastIndex;
    const pos = curve.getPoint(t);
    const tan = curve.getTangent(t);
    const group = new THREE.Group();
    group.position.copy(pos);
    group.lookAt(pos.clone().sub(tan));   // front face toward the incoming camera
    scene.add(group);

    const shade = 1.0 - i * 0.035;
    const halves = [-1, 1].map((dir, k) => {
      const mat = new THREE.ShaderMaterial({
        vertexShader, fragmentShader,
        uniforms: {
          uMap: { value: textures[(i + k) % textures.length] },
          uOpacity: { value: 1 },
          uDissolve: { value: 0 },
          uTime: { value: 0 },
          uSeed: { value: i * 3.1 + k * 7.7 },
          uTint: { value: new THREE.Color(shade, shade, shade * 1.02) },
        },
        transparent: true,
        depthWrite: false,
      });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(64, 36), mat);
      const baseX = dir * (19 + (i % 2) * 4);
      // the first bank sits low (a sea seen from above), the rest straddle the path
      m.position.set(baseX, (i === 0 ? -7 : -1) + (k - 0.5) * 3 + (i % 2 ? 2 : -1), k * 0.6);
      if (dir < 0) m.scale.x = -1;   // mirror so the denser side faces inward
      group.add(m);
      return { mesh: m, mat, dir, baseX, baseY: m.position.y };
    });
    layers.push({ group, pos, tan, halves, index: i });
  }

  const _d = new THREE.Vector3();
  function update(cameraPos, time) {
    for (const L of layers) {
      const along = _d.subVectors(cameraPos, L.pos).dot(L.tan);   // < 0 before the layer
      const peel = smoothstep(-17, 3, along);
      const visible = along < 8;
      L.group.visible = visible;
      if (!visible) continue;
      for (const h of L.halves) {
        const drift = Math.sin(time * 0.07 + L.index * 1.9 + h.dir) * 1.6;
        h.mesh.position.x = h.baseX + drift + h.dir * peel * peel * 46;
        h.mesh.position.y = h.baseY + peel * 5;
        h.mesh.rotation.z = -h.dir * peel * 0.18;
        h.mat.uniforms.uTime.value = time;
        h.mat.uniforms.uDissolve.value = peel * 0.95;
        const ready = h.mat.uniforms.uMap.value.userData.ready;
        h.mat.uniforms.uOpacity.value = ready ? 1 - smoothstep(0.75, 1, peel) : 0;
      }
    }
  }

  return { update };
}
