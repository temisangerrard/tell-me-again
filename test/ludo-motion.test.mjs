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
