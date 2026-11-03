"use strict";
// The sounds, synthesised so there's nothing to download. Each one is built from a few layers (a pitched body, a bit of filtered
// noise for texture, a bell for anything that should feel good) and takes an `at` offset in seconds so a run can be scheduled.
// buildSounds works on any audio context, so the same code can be rendered offline and measured.
// Everything is routed through a compressor with a little room echo, so sounds sit together instead of stacking up.
function buildChain(ctx) {
  const master = ctx.createGain(); master.gain.value = 0.75;
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -24; comp.knee.value = 6; comp.ratio.value = 6; comp.attack.value = 0.003; comp.release.value = 0.15;
  const limit = ctx.createDynamicsCompressor(); limit.threshold.value = -6; limit.knee.value = 0; limit.ratio.value = 20; limit.attack.value = 0.001; limit.release.value = 0.08;
  const soft = ctx.createWaveShaper(), curve = new Float32Array(2049); // a gentle tanh curve: anything that still gets through is rounded off, never harsh
  for (let i = 0; i < curve.length; i++) { const x = (i / 1024) - 1; curve[i] = Math.tanh(x * 1.2) / Math.tanh(1.2); } soft.curve = curve;
  const echo = ctx.createDelay(0.5), fb = ctx.createGain(), wet = ctx.createGain(); echo.delayTime.value = 0.085; fb.gain.value = 0.22; wet.gain.value = 0.14;
  master.connect(comp); master.connect(echo); echo.connect(fb); fb.connect(echo); echo.connect(wet); wet.connect(comp);
  comp.connect(limit); limit.connect(soft); soft.connect(ctx.destination);
  return master;
}
function buildSounds(ctx, out) {
  let noiseBuf = null, boost = 1; // per-sound loudness, so a click and a fanfare sit at similar perceived levels
  const noise = () => noiseBuf || (noiseBuf = (() => { const b = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b; })());
  const env = (g, t, a, peak, dur) => { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); };
  // a pitched blip that can glide from f0 to f1
  const tone = (at, f0, f1, dur, peak, type = "sine", a = 0.004) => {
    const t = ctx.currentTime + at, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    env(g, t, a, peak * boost, dur); o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.05);
  };
  // a burst of filtered noise: clicks, rattles, slides, sparkle
  const hiss = (at, dur, freq, q, peak, type = "bandpass", sweepTo) => {
    const t = ctx.currentTime + at, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noise(); s.loop = true; f.type = type; f.Q.value = q; f.frequency.setValueAtTime(freq, t); if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    env(g, t, 0.004, peak * boost, dur); s.connect(f); f.connect(g); g.connect(out); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
  };
  // a struck bell: a fundamental with a few inharmonic partials that die away faster
  const bell = (at, f, peak, dur) => [[1, 1, 1], [2.01, 0.35, 0.55], [3.02, 0.18, 0.4], [4.2, 0.08, 0.3]].forEach(([m, a, d]) => tone(at, f * m, 0, dur * d, peak * a, "sine", 0.003));
  const sounds = {
    rattle(at = 0) { hiss(at, 0.05, 2300 + Math.random() * 900, 4, 0.16); tone(at, 150 + Math.random() * 60, 110, 0.05, 0.1); },        // dice clicking in a cup
    land(at = 0) { tone(at, 190, 90, 0.16, 0.38, "sine", 0.002); hiss(at, 0.04, 3200, 1, 0.18, "highpass"); },                        // the dice settle: a knock
    hop(at = 0, i = 0) { const p = 1 + i * 0.06; tone(at, 560 * p, 300 * p, 0.07, 0.28, "triangle", 0.002); hiss(at, 0.03, 4200, 1, 0.1, "highpass"); }, // a wooden tok, a little higher each step
    card(at = 0) { hiss(at, 0.13, 900, 1.2, 0.18, "bandpass", 3200); tone(at + 0.1, 240, 150, 0.06, 0.16, "triangle"); },            // a card slid across a table, then laid down
    sow(at = 0) { tone(at, 760 + Math.random() * 180, 520, 0.07, 0.2, "sine", 0.002); hiss(at, 0.025, 5000, 1, 0.06, "highpass"); }, // a seed dropping into a clay pit
    capture(at = 0) { tone(at, 140, 70, 0.22, 0.36); [0, 0.05, 0.1].forEach((d) => hiss(at + d, 0.04, 2500, 3, 0.14)); },            // seeds scooped up
    yourTurn(at = 0) { bell(at, 784, 0.2, 0.9); bell(at + 0.14, 1046.5, 0.2, 1); },                                                     // two soft chimes
    win(at = 0) { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => bell(at + i * 0.11, f, 0.18, 1.1)); bell(at + 0.5, 1318.5, 0.16, 1.4); hiss(at + 0.45, 0.6, 6000, 1, 0.04, "highpass"); },
    lose(at = 0) { bell(at, 392, 0.14, 0.7); bell(at + 0.2, 329.63, 0.14, 0.9); },                                                      // a gentle step down, never harsh
    react(at = 0) { tone(at, 520, 980, 0.09, 0.18, "sine", 0.003); },                                                                    // a bubble pop
    tap(at = 0) { tone(at, 900, 700, 0.03, 0.1, "triangle", 0.001); }
  };
  // Measured offline: the short, filtered sounds come out quiet, so lift them to sit with the chimes.
  const LEVEL = { rattle: 7, land: 2.6, hop: 4, card: 2, sow: 4.5, capture: 3.6, yourTurn: 1, win: 1, lose: 1.3, react: 5, tap: 8 };
  Object.keys(sounds).forEach((k) => { const f = sounds[k]; sounds[k] = (...a) => { boost = LEVEL[k] || 1; try { f(...a); } finally { boost = 1; } }; });
  return sounds;
}