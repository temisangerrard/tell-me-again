import test from "node:test";
import assert from "node:assert/strict";
import { app } from "./app.mjs";

const token = (w) => { const t = w.document.createElementNS("http://www.w3.org/2000/svg", "g"); w.document.body.append(t); return t; };

test("reduced motion: dice show the face at once and tokens jump to their square", async () => {
  const a = app(); await a.ready; const { w } = a;
  const roll = w.document.createElement("button"); let done = 0;
  w.tumbleDice(roll, 4, () => done++);
  assert.equal(done, 1); assert.equal(roll.querySelectorAll("em.p").length, 4);
  const t = token(w); w.placeTok(t, 0, 5, 0, 1);
  assert.equal(t.style.transform, w.eval("tokTransform(tokPos(0, 5, 0, 1))"));
  assert.equal(t.__q, 5);
  await a.close();
});

test("a token moving forward hops through every square, a capture fades, a first move leaves the base", async () => {
  const a = app(); await a.ready; const { w } = a;
  w.matchMedia = () => ({ matches: false });
  const t = token(w); let frames = null, calls = 0; t.animate = (f) => { frames = f; calls++; return {}; };
  w.placeTok(t, 1, 10, 0, 1); assert.equal(calls, 0, "first placement just appears");
  w.placeTok(t, 1, 13, 0, 1); assert.equal(calls, 1);
  assert.equal(frames.length, 1 + 3 * 2, "start + (mid-air, landed) for each of 3 squares");
  assert.ok(frames[1].transform.includes("scale("), "mid-air frame is scaled up");
  w.placeTok(t, 1, -1, 0, 1); assert.equal(calls, 2); assert.ok(frames.some((f) => f.opacity !== undefined), "capture pulses");
  w.placeTok(t, 1, 0, 0, 1); assert.equal(calls, 3); assert.equal(frames.length, 1 + 2, "leaving the base is a single hop");
  await a.close();
});

test("online Ludo keeps rolls and token moves disabled while the dice tumble", async () => {
  const a = app(); await a.ready; const { w } = a;
  w.matchMedia = () => ({ matches: false });
  const box = w.document.createElement("div"); w.document.body.append(box);
  const sent = [];
  const mk = (dice, turn, last) => ({ seat: 0, names: ["Ade", "Bo"], v: { kind: "ludo", turn, dice, movable: dice ? [0] : [], last, over: null, msg: "", pl: [{ k: 0, t: [-1, -1, -1, -1] }, { k: 2, t: [-1, -1, -1, -1] }] } });
  w.__send = (m) => sent.push(m); w.__box = box;
  const view = w.eval('mountOnlineGame("ludo", __box, __send, { me: { host: true } }, () => {})');
  view.update(mk(null, 0, null));
  view.update(mk(6, 0, null)); // a roll arrives: tumbling starts
  const roll = box.querySelector(".roll");
  assert.equal(roll.disabled, true, "roll disabled during tumble");
  assert.equal(box.querySelectorAll(".tok.go").length, 0, "no token can be picked during tumble");
  await new Promise((r) => setTimeout(r, 1500));
  assert.equal(box.querySelectorAll(".tok.go").length, 1, "the movable token becomes pickable once the dice settle");
  assert.equal(roll.disabled, true, "roll stays disabled: a die is already on the table");
  await a.close();
});

test("online Ayo replays a move seed by seed, then lands on the server's board", async () => {
  const a = app(); await a.ready; const { w } = a;
  w.matchMedia = () => ({ matches: false });
  const box = w.document.createElement("div"); w.document.body.append(box);
  w.__box = box; w.__send = () => {};
  const view = w.eval('mountOnlineGame("ayo", __box, __send, { me: { host: true } }, () => {})');
  const s = w.eval('JSON.parse(JSON.stringify(Engines.ayo.init(["Ade", "Bo"])))');
  view.update({ seat: 0, names: ["Ade", "Bo"], v: JSON.parse(JSON.stringify(s)) });
  const sum = () => [...box.querySelectorAll(".pit")].reduce((t, b) => t + b.querySelectorAll("i, .seed, em").length, 0);
  const err = w.eval("(globalThis.__s = " + JSON.stringify(s) + "), Engines.ayo.act(__s, 0, { a: 'sow', i: 2 })");
  assert.equal(err, null);
  const after = w.eval("JSON.parse(JSON.stringify(__s))");
  view.update({ seat: 0, names: ["Ade", "Bo"], v: after });
  assert.equal([...box.querySelectorAll(".pit")].every((b) => b.disabled), true, "pits locked while the seeds are sown");
  await new Promise((r) => setTimeout(r, 1200));
  const labels = [...box.querySelectorAll(".pit")].map((b) => b.getAttribute("aria-label"));
  assert.ok(labels.length === 12);
  const pit2 = box.querySelector('.pit[data-i="2"]'); assert.match(pit2.getAttribute("aria-label"), /0 seeds/);
  await a.close();
});

test("online Whot: a dealt hand flies from the market, a played card flies from your hand or across the table", async () => {
  const a = app(); await a.ready; const { w } = a;
  w.matchMedia = () => ({ matches: false });
  w.Element.prototype.getBoundingClientRect = function () { return { left: 10, top: 10, width: 50, height: 70 }; };
  const calls = []; w.Element.prototype.animate = function (f, o) { calls.push({ el: this, f, o }); return {}; };
  const mk = (top, hand, pile = true) => { const r = w.document.createElement("div");
    r.innerHTML = `<div class="piles">${pile ? '<div class="wc back"></div>' : ""}<div class="wc big" aria-label="${top}"></div></div><div class="hand">${hand.map((h) => `<button class="wc" aria-label="${h}"></button>`).join("")}</div><span class="need">circle</span>`; return r; };
  // 1. first render with nothing before: a deal
  const empty = w.document.createElement("div"); const s0 = w.cardSnapshot(empty); assert.equal(s0.top, null);
  const r1 = mk("5 of circle", ["1 of star", "2 of star", "3 of star"]); w.cardSettle(r1, s0);
  assert.equal(calls.filter((c) => c.el.matches(".hand .wc")).length, 3, "every dealt card flies in");
  // 2. you play a card from your hand: it flies to the pile
  calls.length = 0; const s1 = w.cardSnapshot(r1);
  const r2 = mk("2 of star", ["1 of star", "3 of star"]); w.cardSettle(r2, s1);
  assert.equal(calls.filter((c) => c.el.matches(".big")).length, 1, "the played card animates onto the pile");
  assert.equal(calls.filter((c) => c.el.matches(".hand .wc")).length, 0, "no hand card flies in");
  // 3. you pick: a new card flies from the market
  calls.length = 0; const s2 = w.cardSnapshot(r2);
  const r3 = mk("2 of star", ["1 of star", "3 of star", "9 of cross"]); w.cardSettle(r3, s2);
  assert.equal(calls.filter((c) => c.el.matches(".hand .wc")).length, 1, "only the picked card flies in");
  // 4. someone else plays: the pile card arrives from across the table
  calls.length = 0; const s3 = w.cardSnapshot(r3);
  const r4 = mk("7 of cross", ["1 of star", "3 of star", "9 of cross"]); w.cardSettle(r4, s3);
  assert.equal(calls.filter((c) => c.el.matches(".big")).length, 1, "an opponent's card animates onto the pile");
  await a.close();
});
