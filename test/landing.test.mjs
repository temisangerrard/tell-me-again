import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, statSync } from "node:fs";
import { app } from "./app.mjs";

// Always closes the page, even when an assertion fails, so a failing test can't leave timers running and hang the run.
async function withApp(fn) { const a = app(); try { await a.ready; await fn(a.w, a.w.document, a); } finally { await a.close(); } }

test("the landing tells the story in colour blocks, with all three games and the cast", () => withApp((w, d, a) => {
  assert.equal(a.error, undefined);
  const blocks = [...d.querySelectorAll(".lp > section, .lp > .marquee")].map((s) => s.className.replace("blk ", "").split(" ")[0]);
  for (const c of ["coral", "honey", "teal", "violet", "sky", "leaf", "ink"]) assert.ok(blocks.includes(c), `a ${c} block`);
  assert.ok(d.querySelector(".marquee .track"), "a band of questions");
  assert.ok(d.querySelectorAll(".ch3d").length >= 12, "a cast of characters");
  assert.ok(d.querySelector('.ch3d img[alt="Pebble, the bot"]'), "Pebble the bot is in it");
  assert.equal(d.querySelectorAll(".gcard").length, 3, "a card for each game");
  assert.deepEqual([...d.querySelectorAll(".gcard h3")].map((h) => h.textContent), ["Ludo", "Ayo", "Whot"]);
  for (const id of ["go", "go2", "si", "th", "pvl", "restore-welcome"]) assert.ok(d.getElementById(id), `#${id} is there`);
  assert.ok(d.querySelectorAll(".faq details").length >= 4, "the questions are still answered");
}));

test("the three demos start, and play real games (Ayo and Whot are the engines)", () => withApp(async (w, d) => {
  assert.equal(d.querySelectorAll("#demo-ludo .tok").length, 4, "four Ludo tokens");
  assert.equal(d.querySelectorAll("#demo-ayo .pit").length, 12, "twelve Ayo pits");
  assert.equal(d.querySelectorAll("#demo-whot .hand .wc").length, 6, "a six-card Whot hand");
  assert.ok(d.querySelector("#demo-whot .piles .wc.big"), "a card on the pile");
  const before = d.querySelector("#demo-ayo .apits").innerHTML, whotBefore = d.querySelector("#demo-whot .stg").innerHTML;
  await new Promise((r) => setTimeout(r, 3300));
  assert.notEqual(d.querySelector("#demo-ayo .apits").innerHTML, before, "Ayo is being played");
  assert.notEqual(d.querySelector("#demo-whot .stg").innerHTML, whotBefore, "Whot is being played");
}));

test("the landing demos make no sound and stop when the page is gone", () => withApp(async (w, d) => {
  w.matchMedia = () => ({ matches: false }); // motion on, so the animated paths run
  w.eval("globalThis.__sounds = 0; for (const k of Object.keys(feel)) { const o = feel[k]; feel[k] = (...a) => { __sounds++; return o(...a); }; }");
  const box = d.createElement("div"); d.body.append(box);
  const stopLudo = w.ludoDemo(box); await new Promise((r) => setTimeout(r, 1800)); stopLudo();
  const wbox = d.createElement("div"); d.body.append(wbox); const stopWhot = w.whotDemo(wbox); await new Promise((r) => setTimeout(r, 1600)); stopWhot();
  assert.equal(w.eval("__sounds"), 0, "no feel.* call from the landing demos");
  const gone = d.createElement("div"); d.body.append(gone); w.ayoDemo(gone); gone.remove(); await new Promise((r) => setTimeout(r, 1300));
}));

test("the 3D cast: every character has a looping animation and a still for reduced motion, with names and sizes", () => withApp((w, d) => {
  for (const n of ["gran", "dad", "aunty", "mum", "kid", "pebble"]) {
    for (const f of [`art/characters/${n}.webp`, `art/characters/${n}-still.webp`]) {
      const path = new URL(`../${f}`, import.meta.url); assert.ok(existsSync(path), `${f} exists`);
      assert.ok(statSync(path).size < 400 * 1024, `${f} is light enough to load on a phone`);
    }
  }
  const pics = [...d.querySelectorAll(".ch3d")], img = (p) => p.querySelector("img");
  assert.ok(pics.every((p) => img(p).alt.length > 2 && img(p).getAttribute("width") && img(p).getAttribute("loading") === "lazy"), "named, sized and lazy-loaded");
  assert.ok(pics.every((p) => /-still\.webp$/.test(p.querySelector("source").getAttribute("srcset")) && p.querySelector("source").getAttribute("media").includes("reduced-motion")), "reduced motion gets the still");
  assert.deepEqual([...new Set(pics.map((p) => img(p).alt))].sort(), ["A child", "Aunty", "Dad", "Grandma", "Mum", "Pebble, the bot"]);
}));
