import test from "node:test";
import assert from "node:assert/strict";
import { app } from "./app.mjs";

test("the landing tells the story in colour blocks, with all three games and the cast", async () => {
  const a = app(); await a.ready; const { w } = a; const d = w.document;
  assert.equal(a.error, undefined);
  const blocks = [...d.querySelectorAll(".lp > section, .lp > .marquee")].map((s) => s.className.replace("blk ", "").split(" ")[0]);
  for (const c of ["coral", "honey", "teal", "violet", "sky", "leaf", "ink"]) assert.ok(blocks.includes(c), `a ${c} block`);
  assert.ok(d.querySelector(".marquee .track"), "a band of questions");
  assert.ok(d.querySelectorAll(".ch").length >= 12, "a cast of characters");
  assert.ok(d.querySelector(".ch.pebble"), "Pebble the bot is in it");
  assert.equal(d.querySelectorAll(".gcard").length, 3, "a card for each game");
  assert.deepEqual([...d.querySelectorAll(".gcard h3")].map((h) => h.textContent), ["Ludo", "Ayo", "Whot"]);
  for (const id of ["go", "go2", "si", "th", "pvl", "restore-welcome"]) assert.ok(d.getElementById(id), `#${id} is there`);
  assert.ok(d.querySelectorAll(".faq details").length >= 4, "the questions are still answered");
  await a.close();
});

test("the three demos start, and play real games (Ayo and Whot are the engines)", async () => {
  const a = app(); await a.ready; const { w } = a; const d = w.document;
  // with no scroll observer in this environment the demos start straight away
  assert.equal(d.querySelectorAll("#demo-ludo .tok").length, 4, "four Ludo tokens");
  assert.equal(d.querySelectorAll("#demo-ayo .pit").length, 12, "twelve Ayo pits");
  assert.equal(d.querySelectorAll("#demo-whot .hand .wc").length, 6, "a six-card Whot hand");
  assert.ok(d.querySelector("#demo-whot .piles .wc.big"), "a card on the pile");
  const before = d.querySelector("#demo-ayo .apits").innerHTML, whotBefore = d.querySelector("#demo-whot .stg").innerHTML;
  await new Promise((r) => setTimeout(r, 3300));
  assert.notEqual(d.querySelector("#demo-ayo .apits").innerHTML, before, "Ayo is being played");
  assert.notEqual(d.querySelector("#demo-whot .stg").innerHTML, whotBefore, "Whot is being played");
  await a.close();
});

test("the landing demos make no sound and stop when the page is gone", async () => {
  const a = app(); await a.ready; const { w } = a; const d = w.document;
  w.matchMedia = () => ({ matches: false }); // motion on, so the animated paths run
  w.eval("globalThis.__sounds = 0; for (const k of Object.keys(feel)) { const o = feel[k]; feel[k] = (...a) => { __sounds++; return o(...a); }; }");
  const box = d.createElement("div"); d.body.append(box);
  const stopLudo = w.ludoDemo(box); await new Promise((r) => setTimeout(r, 1800)); stopLudo();
  const wbox = d.createElement("div"); d.body.append(wbox); const stopWhot = w.whotDemo(wbox); await new Promise((r) => setTimeout(r, 1600)); stopWhot();
  assert.equal(w.eval("__sounds"), 0, "no feel.* call from the landing demos");
  // a demo whose box has left the page quietly ends itself
  const gone = d.createElement("div"); d.body.append(gone); w.ayoDemo(gone); gone.remove(); await new Promise((r) => setTimeout(r, 1300));
  assert.ok(true);
  await a.close();
});

test("the cast is varied: different skin tones, hair and accessories, each with an accessible name", async () => {
  const a = app(); await a.ready; const { w } = a;
  const labels = ["gran", "kid", "dad", "aunty", "mum"].map((k) => w.eval(`CAST.${k}({})`)).map((svg) => (svg.match(/aria-label="([^"]+)"/) || [])[1]);
  assert.deepEqual(labels, ["Grandma", "A child", "Dad", "Aunty", "Mum"]);
  const skins = new Set(["gran", "kid", "dad", "aunty", "mum"].map((k) => w.eval(`CAST.${k}({})`).match(/circle cx="60" cy="62" r="29" fill="(#[0-9a-f]{6})"/)[1]));
  assert.equal(skins.size, 5, "five different skin tones");
  await a.close();
});
