// Sound: the rainforest's ambience, the waterfall, rain and bird calls.
//
// Nothing plays until the visitor turns sound on (or taps a bird, which asks
// to hear it). Each stop's ambience is the soundtrack that came with its Veo
// clip, looped, and cross-fades with its neighbours as the camera travels.
// Wind, waterfall and rain are synthesised, so they never loop audibly.

const A = './assets/audio/';
const STOP_INDEX_OFFSET = 2;   // path index of the first stop

function noiseBuffer(ctx, seconds, colour) {
  const n = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let b0 = 0, b1 = 0, b2 = 0, last = 0;
    for (let i = 0; i < n; i++) {
      const w = Math.random() * 2 - 1;
      if (colour === 'pink') {
        b0 = 0.99765 * b0 + w * 0.099; b1 = 0.963 * b1 + w * 0.2965; b2 = 0.57 * b2 + w * 1.0526;
        d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.11;
      } else if (colour === 'brown') {
        last = (last + 0.02 * w) / 1.02;
        d[i] = last * 3.5;
      } else d[i] = w * 0.5;
    }
  }
  return buf;
}

export function createSound(stops) {
  let ctx = null, master = null;
  let enabled = false;
  const buffers = new Map();      // url -> AudioBuffer | Promise
  const ambience = new Map();     // stop index -> { gain, src }
  let waterGain = null, rainGain = null, windGain = null;
  let rain = 0;

  function load(url) {
    if (buffers.has(url)) return buffers.get(url);
    const p = fetch(url)
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(r.status))))
      .then((b) => ctx.decodeAudioData(b))
      .then((buf) => { buffers.set(url, buf); return buf; })
      .catch(() => { buffers.set(url, null); return null; });
    buffers.set(url, p);
    return p;
  }

  function loopNoise(colour, seconds, filters, gainValue) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx, seconds, colour);
    src.loop = true;
    let node = src;
    for (const [type, freq, q] of filters) {
      const f = ctx.createBiquadFilter();
      f.type = type; f.frequency.value = freq; if (q) f.Q.value = q;
      node.connect(f); node = f;
    }
    const g = ctx.createGain();
    g.gain.value = gainValue;
    node.connect(g).connect(master);
    src.start();
    return g;
  }

  function init() {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    // a soft bed of moving air under everything, so short loops never sound bare
    windGain = loopNoise('pink', 6, [['lowpass', 900], ['highpass', 120]], 0.05);
    // the waterfall: deep roar plus a hiss of spray, silent until you're near
    waterGain = loopNoise('brown', 7, [['lowpass', 1200]], 0);
    const spray = loopNoise('white', 5, [['bandpass', 3800, 0.6]], 0);
    waterGain.spray = spray;
    // rain on leaves
    rainGain = loopNoise('white', 5, [['highpass', 900], ['lowpass', 7000]], 0);
    document.addEventListener('visibilitychange', () => {
      if (!enabled) return;
      if (document.hidden) ctx.suspend(); else ctx.resume();
    });
  }

  function setEnabled(on) {
    if (on && !ctx) init();
    enabled = on;
    if (!ctx) return;
    if (on) ctx.resume();
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(on ? 0.9 : 0, ctx.currentTime, on ? 0.6 : 0.2);
  }

  function ensureAmbience(i) {
    if (ambience.has(i)) return;
    const st = stops[i];
    if (!st?.video) return;
    const entry = { gain: ctx.createGain(), src: null };
    entry.gain.gain.value = 0;
    entry.gain.connect(master);
    ambience.set(i, entry);
    load(`${A}${st.video}-amb.mp3`).then((buf) => {
      if (!buf) return;
      const src = ctx.createBufferSource();
      src.buffer = buf; src.loop = true;
      src.connect(entry.gain);
      src.start(0, Math.random() * buf.duration);
      entry.src = src;
    });
  }

  // index: position along the path (2 = first stop). Called every frame.
  function update(index) {
    if (!ctx || !enabled) return;
    const t = ctx.currentTime;
    const k = index - STOP_INDEX_OFFSET;
    for (let i = 0; i < stops.length; i++) {
      const near = Math.abs(k - i) < 1.6;
      if (near) ensureAmbience(i);
      const a = ambience.get(i);
      if (!a) continue;
      const w = Math.max(0, 1 - Math.abs(k - i));
      a.gain.gain.setTargetAtTime(w * w * 0.85, t, 0.25);
    }
    // waterfall rises over the last stretch of the journey
    const last = stops.length - 1;
    const wf = Math.max(0, Math.min(1, 1 - (last - k) / 1.4));
    waterGain.gain.setTargetAtTime(wf * wf * 0.35, t, 0.3);
    waterGain.spray.gain.setTargetAtTime(wf * wf * 0.05, t, 0.3);
    rainGain.gain.setTargetAtTime(rain * 0.16, t, 0.5);
    windGain.gain.setTargetAtTime(0.05 * (1 - rain * 0.6), t, 0.5);
  }

  function call(stop) {
    if (!enabled) setEnabled(true);
    if (!stop?.video) return;
    load(`${A}${stop.video}-call.mp3`).then((buf) => {
      if (!buf) return;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const g = ctx.createGain();
      g.gain.value = 0.9;
      // a touch of stereo placement toward where the bird sits
      const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      if (pan) { pan.pan.value = ((stop.videoX ?? 0.5) - 0.5) * 1.2; src.connect(pan).connect(g); } else src.connect(g);
      g.connect(master);
      src.start();
    });
  }

  // a water drop: a quick falling sine, for ripples
  function plip(strength = 1) {
    if (!enabled || !ctx) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(1100 + Math.random() * 400, t);
    o.frequency.exponentialRampToValueAtTime(260, t + 0.14);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.18 * strength, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
    o.connect(g).connect(master);
    o.start(t); o.stop(t + 0.3);
  }

  return {
    get enabled() { return enabled; },
    setEnabled, update, call, plip,
    setRain(v) { rain = v; },
  };
}
