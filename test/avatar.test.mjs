import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { app } from "./app.mjs";

async function withApp(fn) { const a = app(); try { await a.ready; await fn(a.w, a.w.document); } finally { await a.close(); } }
const root = (p) => new URL("../" + p, import.meta.url);

test("every layer the maker can draw exists as a file", () => withApp((w) => {
  const names = new Set(["shirt", "skin", "face", "beard", "glasses", "shades", "earrings"]);
  for (const [s] of w.eval("AV").style) if (s !== "none") names.add("hair-" + s);
  for (const n of names) assert.ok(existsSync(root(`art/avatar/${n}.webp`)), `${n}.webp exists`);
}));

test("a saved avatar is cleaned before it is drawn", () => withApp((w) => {
  const c = w.eval("avClean")({ skin: "javascript:x", style: "mohawk", extra: ["beard", "<script>"], hair: "#e26b3f" });
  assert.equal(c.style, "puff"); assert.deepEqual([...c.extra], ["beard"]); assert.equal(c.hair, "#e26b3f"); assert.ok(w.eval("AV").skin.some((x) => x[0] === c.skin));
  assert.ok(w.eval("avClean")(null).bg, "nothing saved still gives a drawable avatar");
}));

test("layers stack skin under the face under the hair, with the beard behind the mouth", () => withApp((w) => {
  const names = w.eval("avLayers")(w.eval("avClean")({ style: "short", extra: ["beard", "glasses"] })).map((l) => l[0]);
  assert.deepEqual([...names], ["shirt", "skin", "beard", "face", "hair-short", "glasses"]);
  assert.ok(!w.eval("avLayers")(w.eval("avClean")({ style: "none" })).some((l) => l[0].startsWith("hair")), "bald draws no hair");
}));

test("a person without an avatar keeps the letter circle; one with an avatar gets a canvas", () => withApp((w) => {
  assert.match(w.avHTML({ n: "Tunde" }, "Tunde"), /class="av[^"]*"[^>]*>T</);
  assert.match(w.avHTML({ n: "Tunde", av: w.eval("avDefault")() }, "Tunde"), /<canvas class="pic/);
}));

test("the editor stores what you pick, and can go back to the initial", () => withApp((w, d) => {
  let saved; const host = d.createElement("div"); d.body.append(host);
  w.avatarEditor(host, null, (c) => { saved = c; });
  host.querySelector('[data-k="style"][data-v="afro"]').click();
  assert.equal(saved.style, "afro");
  host.querySelector('[data-k="extra"][data-v="glasses"]').click(); assert.deepEqual([...saved.extra], ["glasses"]);
  host.querySelector('[data-k="extra"][data-v="glasses"]').click(); assert.deepEqual([...saved.extra], []);
  host.querySelector('[data-a="clear"]').click(); assert.equal(saved, null);
}));
