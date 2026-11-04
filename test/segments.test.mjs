import test from "node:test";
import assert from "node:assert/strict";
import { app } from "./app.mjs";

async function withApp(fn) { const a = app(); try { await a.ready; await fn(a.w); } finally { await a.close(); } }
const fake = (w) => w.eval(`globalThis.__n = 0; globalThis.MediaRecorder = class { constructor() { this.state = "inactive"; this.mimeType = "audio/webm"; __n++; }
  start() { this.state = "recording"; } pause() { this.state = "paused"; } resume() { this.state = "recording"; }
  stop() { this.state = "inactive"; setTimeout(() => { this.ondataavailable && this.ondataavailable({ data: new Blob(["x"]) }); this.onstop && this.onstop(); }, 0); } };
  IV_MIN = 0; clips.length = 0; globalThis.__r = segmentRecorder({}, { who: () => "Gran", method: "remote" });`);

test("cut hands the stream to a new recorder first, and each answer becomes a clip with its question", () => withApp(async (w) => {
  fake(w); w.eval(`__r.start("One?")`); assert.equal(w.eval("__n"), 1); assert.equal(w.eval("__r.question"), "One?");
  w.eval(`__r.cut("Two?")`); assert.equal(w.eval("__n"), 2, "a second recorder is already running"); assert.equal(w.eval("__r.question"), "Two?");
  const r = await w.eval("__r.stop()"); assert.equal(r.made.length, 2);
  assert.deepEqual(w.eval("clips.map((c) => c.q)").reverse ? [...w.eval("clips.map((c) => c.q)")].reverse() : [], ["One?", "Two?"]);
  assert.ok(w.eval(`clips.every((c) => c.who === "Gran" && c.recordingConsent.method === "remote")`));
  assert.equal(w.eval("__r.active"), false);
}));

test("a recording with no question is saved as a free story, and short answers are skipped", () => withApp(async (w) => {
  fake(w); w.eval(`__r.start(null)`); await w.eval("__r.stop()"); assert.equal(w.eval("clips[0].q"), "Free story");
  w.eval(`IV_MIN = 5; clips.length = 0; __r = segmentRecorder({}, { who: "x" }); __r.start("Q?")`); const r = await w.eval("__r.stop()"); assert.equal(r.made.length, 0);
}));
