import test from "node:test";
import assert from "node:assert/strict";
import { app } from "./app.mjs";

// A stand-in for the browser's audio: counts what gets built so we can tell whether a sound was scheduled.
function fakeAudio(w) {
  const made = { ctx: 0, osc: 0, src: 0, resumed: 0 };
  const node = () => ({ connect(n) { return n; }, gain: { value: 1, setValueAtTime() {}, exponentialRampToValueAtTime() {} }, frequency: { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} }, Q: {}, threshold: {}, knee: {}, ratio: {}, attack: {}, release: {}, delayTime: {}, start() {}, stop() {}, curve: null });
  w.AudioContext = function () {
    made.ctx++; this.state = "suspended"; this.currentTime = 0; this.sampleRate = 8000; this.destination = node();
    this.resume = () => { made.resumed++; this.state = "running"; };
    this.createGain = node; this.createDynamicsCompressor = node; this.createDelay = node; this.createWaveShaper = node; this.createBiquadFilter = node;
    this.createOscillator = () => { made.osc++; return node(); };
    this.createBufferSource = () => { made.src++; return node(); };
    this.createBuffer = () => ({ getChannelData: () => new Float32Array(8000) });
  };
  return made;
}

test("the first touch creates and unlocks the audio, so sound works on a phone", async () => {
  const a = app(); await a.ready; const { w } = a; const made = fakeAudio(w);
  assert.equal(made.ctx, 0, "nothing is created before a touch");
  w.dispatchEvent(new w.Event("pointerdown")); w.dispatchEvent(new w.Event("touchstart"));
  assert.equal(made.ctx, 0, "touching down doesn't count as a tap on a phone, so it doesn't pretend to unlock");
  w.dispatchEvent(new w.Event("touchend"));
  assert.equal(made.ctx, 1, "context created when the finger lifts"); assert.equal(made.resumed, 1, "and resumed if the phone locked it");
  w.dispatchEvent(new w.Event("pointerup")); assert.equal(made.ctx, 1, "only one context for the whole app");
  w.dispatchEvent(new w.Event("click")); assert.equal(made.ctx, 1);
  await a.close();
});

test("every game sound schedules audio, and nothing plays with sound off", async () => {
  const a = app(); await a.ready; const { w } = a; const made = fakeAudio(w);
  for (const n of ["yourTurn", "move", "win", "lose", "rattle", "land", "card", "sow", "capture", "react"]) {
    const before = made.osc + made.src; w.eval(`feel.${n}()`); assert.ok(made.osc + made.src > before, `${n} makes a sound`);
  }
  const before = made.osc + made.src; w.eval("feel.hop(2, 0.1)"); assert.ok(made.osc + made.src > before, "hop makes a sound");
  w.eval("setSound(false)"); const muted = made.osc + made.src;
  for (const n of ["yourTurn", "win", "rattle", "card", "sow", "capture", "react", "move"]) w.eval(`feel.${n}()`); w.eval("feel.hop(1, 0.1)");
  assert.equal(made.osc + made.src, muted, "sound off: not a single node");
  await a.close();
});

test("with no audio support the app carries on silently", async () => {
  const a = app(); await a.ready; const { w } = a; w.AudioContext = undefined; w.webkitAudioContext = undefined;
  assert.doesNotThrow(() => { w.eval("feel.win(); feel.hop(1, 0.1); feel.card()"); });
  await a.close();
});

test("the sound setting is in Family and mutes the game", async () => {
  const a = app(); await a.ready; const { w } = a; fakeAudio(w);
  w.eval("S.step = 7; S.name = 'Ade'"); const box = w.document.createElement("div"); w.document.body.append(box); w.__box = box;
  w.eval("renderFamily(__box)");
  const chips = [...box.querySelectorAll(".chip")].filter((c) => /^(On|Off)$/.test(c.textContent));
  assert.equal(chips.length, 2, "an On and an Off chip");
  chips.find((c) => c.textContent === "Off").click(); assert.equal(w.eval("soundOn()"), false);
  chips.find((c) => c.textContent === "On").click(); assert.equal(w.eval("soundOn()"), true);
  await a.close();
});

test("a context the phone suspended again is resumed on the next tap", async () => {
  const a = app(); await a.ready; const { w } = a; const made = fakeAudio(w);
  w.dispatchEvent(new w.Event("touchend")); assert.equal(made.resumed, 1);
  w.eval('audioCtx.state = "interrupted"'); // after a phone call or an app switch
  w.dispatchEvent(new w.Event("click")); assert.equal(made.resumed, 2, "resumed again");
  assert.equal(w.eval("audioCtx.state"), "running");
  await a.close();
});
