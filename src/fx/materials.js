// Shader materials for the photo layers.
//   plate  – a background photo with feathered edges (and optional moving water)
//   bird   – a perched-bird cut-out that breathes, sways and bobs its head;
//            motion is masked to the bird, so the branch stays still
//   flyer  – a flying bird that flaps by cross-fading two wing poses, or by
//            a quick flutter squash when there's only one pose
import * as THREE from 'three';

const vertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const noise = /* glsl */ `
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
`;

export const MAX_RIPPLES = 6;

export function plateMaterial(map, { water = null, pool = null, aspect = 16 / 9 } = {}) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: map },
      uOpacity: { value: 0 },
      uTint: { value: new THREE.Color(1, 1, 1) },
      uTime: { value: 0 },
      uWater: { value: water ? new THREE.Vector4(...water) : new THREE.Vector4(0, 0, 0, 0) },
      uDecode: { value: 0 },   // 1 for video: decode its sRGB colours here (see makeVideo)
      // ripples on the pool: (u, v, start time, strength); strength 0 = unused
      uRipples: { value: Array.from({ length: MAX_RIPPLES }, () => new THREE.Vector4(0, 0, -100, 0)) },
      uPool: { value: pool ? new THREE.Vector4(...pool) : new THREE.Vector4(0, 0, 0, 0) },
      uAspect: { value: aspect },
    },
    vertexShader: vertex,
    fragmentShader: /* glsl */ `
      precision mediump float;
      uniform sampler2D uMap;
      uniform float uOpacity, uTime;
      uniform vec3 uTint;
      uniform vec4 uWater;   // x0, y0, x1, y1 of the falling water in uv
      uniform float uDecode;
      uniform vec4 uRipples[${MAX_RIPPLES}];
      uniform vec4 uPool;
      uniform float uAspect;
      varying vec2 vUv;
      ${noise}
      vec3 srgbToLinear(vec3 c) {
        return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c));
      }
      void main() {
        vec2 uv = vUv;
        float glint = 0.0;
        if (uPool.z > 0.0) {
          // Expanding rings from each tap: bend the photo along the wave front
          // (refraction) and catch a little light on the crests.
          float inPool = smoothstep(uPool.x, uPool.x + 0.04, vUv.x) * smoothstep(uPool.z, uPool.z - 0.04, vUv.x)
                       * smoothstep(uPool.y, uPool.y + 0.02, vUv.y) * smoothstep(uPool.w, uPool.w - 0.04, vUv.y);
          for (int i = 0; i < ${MAX_RIPPLES}; i++) {
            vec4 r = uRipples[i];
            float age = uTime - r.z;
            if (r.w <= 0.0 || age < 0.0 || age > 4.0) continue;
            // rings look flattened on water seen at a low angle
            vec2 d = (vUv - r.xy) * vec2(uAspect, uAspect * 2.6);
            float dist = length(d);
            float front = age * 0.16;
            float env = exp(-age * 1.1) * smoothstep(front + 0.05, front, dist) * smoothstep(0.0, 0.02, dist);
            float wave = sin((dist - front) * 140.0) * env * r.w;
            uv += normalize(d + 1e-5) / vec2(uAspect, uAspect * 2.6) * wave * 0.004 * inPool;
            glint += max(wave, 0.0) * inPool;
          }
        }
        vec3 c = texture2D(uMap, uv).rgb;
        if (uDecode > 0.5) c = srgbToLinear(c);
        c += glint * 0.12;
        if (uWater.z > 0.0) {
          vec2 lo = uWater.xy, hi = uWater.zw;
          float inRect = smoothstep(lo.x - 0.02, lo.x + 0.01, vUv.x) * smoothstep(hi.x + 0.02, hi.x - 0.01, vUv.x)
                       * smoothstep(lo.y - 0.03, lo.y + 0.03, vUv.y) * smoothstep(hi.y + 0.03, hi.y - 0.02, vUv.y);
          float white = smoothstep(0.35, 0.7, dot(c, vec3(0.333)));
          float m = inRect * white;
          // Flow: thin vertical streaks scrolling continuously downward, faster
          // as the water falls, brightening and darkening the photo's own sheet.
          // (One continuous scroll, so there is no cycle to pulse or band.)
          float drop = clamp((hi.y - vUv.y) / (hi.y - lo.y), 0.0, 1.0);
          float y = vUv.y * 6.0 + uTime * (1.6 + drop * 1.4);
          float streak = noise(vec2(vUv.x * 260.0, y)) * 0.55
                       + noise(vec2(vUv.x * 110.0 + 3.1, y * 0.7 + uTime * 0.4)) * 0.3
                       + noise(vec2(vUv.x * 40.0 - 7.0, y * 0.45)) * 0.15;
          c *= 0.82 + streak * 0.42 * m + (1.0 - m) * 0.18;
          // churning foam where the water lands
          float foam = smoothstep(lo.y + 0.1, lo.y + 0.02, vUv.y) * inRect;
          float churn = noise(vec2(vUv.x * 80.0 + uTime * 0.9, vUv.y * 50.0 - uTime * 1.3))
                      * noise(vec2(vUv.x * 30.0 - uTime * 0.6, vUv.y * 20.0 + uTime));
          c += churn * 0.22 * foam * white;
        }
        // feathered edges so a plate seen from further back melts into the dark
        float e = smoothstep(0.0, 0.06, vUv.x) * smoothstep(1.0, 0.94, vUv.x)
                * smoothstep(0.0, 0.08, vUv.y) * smoothstep(1.0, 0.92, vUv.y);
        gl_FragColor = vec4(c * uTint, uOpacity * e);
      }
    `,
    transparent: true,
    depthWrite: false,
  });
}

export function birdMaterial(map, mask, { tint = [1, 1, 1], phase = 0, feet = [0.5, 0.35] } = {}) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: map },
      uMask: { value: mask },
      uOpacity: { value: 0 },
      uTint: { value: new THREE.Color(...tint) },
      uTime: { value: 0 },
      uPhase: { value: phase },
      uHover: { value: 0 },
      uFeet: { value: new THREE.Vector2(...feet) },
      uFade: { value: new THREE.Vector4(0.0, 0.0, 0.0, 0.0) },  // left, right, bottom, top feather
    },
    vertexShader: vertex,
    fragmentShader: /* glsl */ `
      precision mediump float;
      uniform sampler2D uMap, uMask;
      uniform float uOpacity, uTime, uPhase, uHover;
      uniform vec3 uTint;
      uniform vec2 uFeet;
      uniform vec4 uFade;
      varying vec2 vUv;

      vec2 rot(vec2 p, float a) { float s = sin(a), c = cos(a); return vec2(c * p.x - s * p.y, s * p.x + c * p.y); }

      void main() {
        float t = uTime + uPhase;
        float m = texture2D(uMask, vUv).r;           // 1 on the bird, 0 on branch and air
        vec2 p = vUv - uFeet;

        // whole-body sway from the feet, a little livelier when hovered
        float sway = sin(t * 0.9) * 0.010 + sin(t * 2.3) * 0.003 + uHover * sin(t * 7.0) * 0.012;
        vec2 q = rot(p, sway);

        // breathing: the chest swells slightly
        float chest = exp(-dot(p - vec2(0.0, 0.15), p - vec2(0.0, 0.15)) / 0.03);
        q.x /= 1.0 + chest * (0.010 + 0.004 * sin(t * 0.37)) * sin(t * 2.6);

        // head bob and the odd curious tilt, strongest at the top of the bird
        float head = smoothstep(0.25, 0.6, p.y);
        float tilt = (sin(t * 0.55) * 0.5 + 0.5) * smoothstep(0.75, 1.0, sin(t * 0.21 + 1.3)) * 0.06 + uHover * 0.05;
        q = mix(q, rot(q - vec2(0.0, 0.32), tilt) + vec2(0.0, 0.32), head);
        q.y -= head * (sin(t * 1.7) * 0.004 + uHover * abs(sin(t * 5.0)) * 0.008);

        // tail swish below the feet
        float tail = smoothstep(0.0, -0.4, p.y);
        q.x -= tail * sin(t * 1.15 + 0.6) * 0.012;

        vec2 uv = mix(vUv, q + uFeet, m);
        vec4 c = texture2D(uMap, uv);
        float edge = smoothstep(0.0, uFade.x + 1e-4, vUv.x) * smoothstep(1.0, 1.0 - uFade.y - 1e-4, vUv.x)
                   * smoothstep(0.0, uFade.z + 1e-4, vUv.y) * smoothstep(1.0, 1.0 - uFade.w - 1e-4, vUv.y);
        float a = c.a * uOpacity * edge;
        if (a < 0.004) discard;
        gl_FragColor = vec4(c.rgb * uTint, a);
      }
    `,
    transparent: true,
    depthWrite: false,
  });
}

// A bird in flight, flapped from a single photo. The wings are everything on
// one side of the body line; each frame their distance from that line is
// scaled by cos(beat), which is how a wing rotating about the body looks from
// the side: full height at the top of the stroke, shrinking to nothing as it
// passes the body, then reappearing below on the downstroke.
// line: a point on the body axis and the axis direction, in the photo's uv.
// Without a line (a whole flock in one image) the photo just drifts.
export function flyerMaterial(map, { line = null, tint = [1, 1, 1] } = {}) {
  const p = line ? line.p : [0, 0];
  const dir = line ? new THREE.Vector2(...line.dir).normalize() : new THREE.Vector2(1, 0);
  let n = new THREE.Vector2(-dir.y, dir.x);
  if (line && n.dot(new THREE.Vector2(...line.wingSide)) < 0) n.negate();
  return new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: map },
      uOpacity: { value: 0 },
      uTint: { value: new THREE.Color(...tint) },
      uBeat: { value: 0 },          // wing angle: 0 = top of the stroke
      uLineP: { value: new THREE.Vector2(...p) },
      uLineN: { value: n },          // unit normal pointing toward the wings
      uLineD: { value: dir },
      uHasLine: { value: line ? 1 : 0 },
      uShoulder: { value: line ? line.shoulder : 0.5 },  // along-axis position of the wing roots
    },
    vertexShader: /* glsl */ `
      uniform float uBeat, uHasLine, uShoulder;
      uniform vec2 uLineP, uLineN, uLineD;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec2 q = uv;
        if (uHasLine > 0.5) {
          vec2 rel = uv - uLineP;
          float d = dot(rel, uLineN);                // height above the body line
          float along = dot(rel, uLineD);
          // the back of the body stays put; only what rises past it is wing
          float w = smoothstep(0.03, 0.1, d);
          float k = cos(uBeat);
          float d2 = mix(d, 0.04 + (d - 0.04) * k, w);
          // wingtips trail a little behind the stroke, and sweep back on the upstroke
          float tip = smoothstep(0.1, 0.45, d);
          d2 += tip * sin(uBeat) * 0.035;
          along += tip * (1.0 - k) * 0.04 * sign(along - uShoulder);
          q = uLineP + uLineD * along + uLineN * d2;
        }
        vec3 pos = vec3(q - 0.5, 0.0);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      precision mediump float;
      uniform sampler2D uMap;
      uniform float uOpacity;
      uniform vec3 uTint;
      varying vec2 vUv;
      void main() {
        vec4 c = texture2D(uMap, vUv);
        // the cut-out keeps a faint haze of studio backdrop; clip it away
        float a = smoothstep(0.12, 0.4, c.a);
        float o = a * uOpacity;
        if (o < 0.004) discard;
        gl_FragColor = vec4(c.rgb * uTint, o);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}
