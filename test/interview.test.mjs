import test from "node:test";
import assert from "node:assert/strict";
import { app } from "./app.mjs";

async function withApp(fn) { const a = app(); try { await a.ready; await fn(a.w, a.w.document); } finally { await a.close(); } }
// A recorder that records nothing but behaves like one: start, pause, resume, stop (which flushes a chunk, then fires onstop).
const fake = (w) => { w.eval(`globalThis.__recs = []; globalThis.MediaRecorder = class { constructor(s) { this.state = "inactive"; this.mimeType = "audio/webm"; __recs.push(this); }
  start() { this.state = "recording"; } pause() { this.state = "paused"; } resume() { this.state = "recording"; }
  stop() { this.state = "inactive"; setTimeout(() => { this.ondataavailable && this.ondataavailable({ data: new Blob(["x"]) }); this.onstop && this.onstop(); }, 0); } };
  globalThis.__tracks = 0; globalThis.__stream = { getTracks: () => [{ stop() { __tracks++; } }] }; IV_MIN = 0; S.asked = []; S.chapters = ["names","home","food"]; clips.length = 0;`); };

test("one start, then Next question moves on with a new recorder and no countdown", () => withApp(async (w, d) => {
  fake(w);
  const done = w.eval(`runInterview(__stream, "Grandma", nextQuestion())`);
  const ov = d.querySelector(".iv"); assert.ok(ov, "the interview screen is up at once"); assert.ok(!d.querySelector(".rov .cd"), "no 3-2-1");
  const first = ov.querySelector(".q").textContent; assert.ok(first.length > 10);
  assert.equal(w.eval("__recs.length"), 1, "recording started straight away");
  ov.querySelector(".ivnext").click();
  assert.equal(w.eval("__recs.length"), 2, "a second recorder took over without stopping the microphone");
  assert.equal(w.eval("__tracks"), 0, "the microphone stays on between questions");
  assert.notEqual(ov.querySelector(".q").textContent, first, "the next question is showing");
  ov.querySelector(".ivend").click(); ov.querySelector(".ivend").click();
  const made = await done; assert.equal(made.length, 2, "each answer is its own recording");
  assert.equal(w.eval("__tracks"), 1, "the microphone is released at the end"); assert.ok(!d.querySelector(".iv"));
  assert.equal(w.eval("clips.length"), 2); assert.equal(w.eval("S.asked.length"), 2);
  assert.notEqual(w.eval("clips[0].q"), w.eval("clips[1].q"), "each is tied to its own question");
}));

test("an answer under a few seconds counts as a skip and is not kept", () => withApp(async (w, d) => {
  fake(w); w.eval("IV_MIN = 3");
  const done = w.eval(`runInterview(__stream, "Grandma", nextQuestion())`);
  d.querySelector(".ivnext").click(); d.querySelector(".ivend").click(); d.querySelector(".ivend").click();
  assert.equal((await done).length, 0); assert.equal(w.eval("S.asked.length"), 2, "both questions count as asked");
}));

test("pause holds the recorder, and Finish needs a second tap", () => withApp(async (w, d) => {
  fake(w); const done = w.eval(`runInterview(__stream, "Grandma", nextQuestion())`);
  const ov = d.querySelector(".iv"); ov.querySelector(".ivpause").click();
  assert.equal(w.eval("__recs[0].state"), "paused"); assert.match(ov.querySelector(".ivstate").textContent, /Paused/);
  ov.querySelector(".ivpause").click(); assert.equal(w.eval("__recs[0].state"), "recording");
  ov.querySelector(".ivend").click(); assert.ok(d.querySelector(".iv"), "one tap does not end it"); assert.match(ov.querySelector(".ivend").textContent, /again/);
  ov.querySelector(".ivend").click(); await done; assert.ok(!d.querySelector(".iv"));
}));

test("when someone has covered every topic, the fallback question still suits their relationship", () => withApp((w) => {
  w.eval(`S.chapters = ["us", "parent"]; S.asked = []; S.people = [{ n: "Gran", rel: "grandparent" }, { n: "Sis", rel: "sibling" }]; sitting = ["Gran"]; S.elder = { name: "Gran", born: "" };`);
  const q = w.eval(`nextQuestion("Sis")`); assert.ok(!q.for || q.for.includes("sibling"), "the question is one a sibling can be asked");
  assert.equal(w.eval(`questionFor(S.people[1], { covered: new Set(["us", "parent"]) })`).for === undefined || w.eval(`questionFor(S.people[1], { covered: new Set(["us", "parent"]) }).for.includes("sibling")`), true);
}));
