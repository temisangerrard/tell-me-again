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

test("a backup brings back people, avatars and lore, and never grants consent to send text", () => withApp((w) => {
  w.eval(`S.me.name = "Ada"; S.me.av = avDefault(); S.people = [{ n: "Papa", born: "1950", av: avDefault() }, { n: "Ini", born: "" }];
    S.consent.lore = true; S.lore = { clips: { a: { who: "Papa", q: "House?", at: 5, tl: 30, people: [{ n: "Ekaette", rel: "sister" }], places: ["Uyo"], years: ["1974"], foods: [], sayings: [], themes: [] } } };`);
  const text = w.eval(`JSON.stringify({ app: "Tell Me Again", version: 1, exportedAt: "x", family: structuredClone(S), theme: "white", recordings: [] })`);
  const got = w.eval(`parseBackup(${JSON.stringify(text)})`).family;
  assert.equal(got.people.length, 2); assert.ok(got.people[0].av && got.me.av, "avatars survive");
  assert.equal(got.lore.clips.a.places[0], "Uyo"); assert.equal(got.consent.lore, undefined, "lore consent is never restored");
}));

test("after a good sign-in code the screen says so, and Continue opens the Family tab", () => withApp((w, d) => {
  w.eval(`S.step = 7; account = { email: "ada@example.com" }; signedInScreen()`);
  assert.match(d.querySelector(".authwrap").textContent, /You're in[\s\S]*ada@example\.com/); d.querySelector("#ok").click();
  assert.ok(d.querySelector('[data-t="family"]'), "the tab bar is back");
}));
