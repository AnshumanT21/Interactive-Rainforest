// Post chain: Render -> Bloom -> Vignette -> Output (ACES + sRGB) -> Grain.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const passVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const VignetteShader = {
  uniforms: {
    tDiffuse: { value: null },
    uOffset: { value: 0.32 },
    uDarkness: { value: 0.6 },
  },
  vertexShader: passVertex,
  fragmentShader: /* glsl */ `
    precision mediump float;
    uniform sampler2D tDiffuse;
    uniform float uOffset;
    uniform float uDarkness;
    varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      float v = smoothstep(0.82, uOffset, length(vUv - 0.5));
      gl_FragColor = vec4(mix(c.rgb * (1.0 - uDarkness), c.rgb, v), c.a);
    }
  `,
};

const GrainShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uAmount: { value: 0.05 },
  },
  vertexShader: passVertex,
  fragmentShader: /* glsl */ `
    precision highp float;
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uAmount;
    varying vec2 vUv;
    float hash12(vec2 p) {
      vec3 p3 = fract(vec3(p.xyx) * 0.1031);
      p3 += dot(p3, p3.yzx + 33.33);
      return fract((p3.x + p3.y) * p3.z);
    }
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      float n = hash12(gl_FragCoord.xy + fract(uTime * 7.31) * 317.0) - 0.5;
      // grain sits mostly in the mids, as on film
      float lum = dot(c.rgb, vec3(0.299, 0.587, 0.114));
      c.rgb += n * uAmount * (1.0 - abs(lum - 0.5));
      gl_FragColor = c;
    }
  `,
};

export function createPost(renderer, scene, camera, { mobile }) {
  const size = renderer.getSize(new THREE.Vector2());
  const target = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType });
  const composer = new EffectComposer(renderer, target);
  composer.setPixelRatio(renderer.getPixelRatio());
  composer.setSize(size.x, size.y);

  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), mobile ? 0.18 : 0.25, 0.4, 1.0);   // only true highlights glow, never bright mist
  composer.addPass(bloom);
  composer.addPass(new ShaderPass(VignetteShader));
  composer.addPass(new OutputPass());
  const grain = new ShaderPass(GrainShader);
  grain.uniforms.uAmount.value = mobile ? 0.025 : 0.03;
  composer.addPass(grain);

  return {
    render(time) {
      grain.uniforms.uTime.value = time;
      composer.render();
    },
    setSize(w, h) {
      composer.setPixelRatio(renderer.getPixelRatio());
      composer.setSize(w, h);
    },
  };
}
