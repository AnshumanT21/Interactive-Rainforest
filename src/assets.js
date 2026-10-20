// Texture loading in journey order. Everything is requested up front, but
// one at a time from the start of the journey, so the first stops are ready
// first and later ones stream in while the visitor is still above the clouds.
import * as THREE from 'three';

const loader = new THREE.TextureLoader();
const queue = [];
let active = 0;
const MAX_PARALLEL = 3;
let done = 0, total = 0;
const listeners = new Set();
let renderer = null;
// upload each image to the GPU as it arrives, not on the frame it first shows
export function setRenderer(r) { renderer = r; }

function pump() {
  while (active < MAX_PARALLEL && queue.length) {
    const job = queue.shift();
    active++;
    loader.load(job.url, (t) => {
      job.texture.anisotropy = 4;
      job.texture.image = t.image;
      job.texture.needsUpdate = true;
      renderer?.initTexture(job.texture);
      job.texture.userData.ready = true;
      finish(job);
    }, undefined, () => finish(job));
  }
}

function finish(job) {
  active--; done++;
  job.onLoad?.(job.texture);
  for (const fn of listeners) fn(done, total);
  pump();
}

// Returns a texture immediately; its image arrives later. Materials check
// texture.userData.ready before showing anything that uses it.
export function loadTexture(url, onLoad, { data = false, first = false } = {}) {
  const texture = new THREE.Texture();
  // masks are data, not colour: keep them out of sRGB decoding
  texture.userData.colorSpace = data ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  texture.colorSpace = texture.userData.colorSpace;
  texture.userData.ready = false;
  total++;
  queue[first ? 'unshift' : 'push']({ url, texture, onLoad });
  pump();
  return texture;
}

export function onProgress(fn) { listeners.add(fn); fn(done, total); }
