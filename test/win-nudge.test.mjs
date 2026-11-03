import test from "node:test";
import assert from "node:assert/strict";
import { app } from "./app.mjs";

test("confetti: a canvas appears for a win and is skipped under reduced motion", async () => {
  const a = app(); await a.ready; const { w } = a;
  const root = w.document.createElement("div"); w.document.body.append(root);
  w.celebrate(root); assert.equal(root.querySelectorAll("canvas").length, 0, "reduced motion: nothing drawn");
  w.matchMedia = () => ({ matches: false });
  w.HTMLCanvasElement.prototype.getContext = () => ({ clearRect() {}, save() {}, restore() {}, translate() {}, rotate() {}, fillRect() {}, set globalAlpha(v) {}, set fillStyle(v) {} });
  w.celebrate(root); assert.equal(root.querySelectorAll("canvas.confetti").length, 1, "a canvas is added");
  await a.close();
});

test("your turn: a hidden page flashes its title and notifies when allowed; coming back stops it and pulses the stage", async () => {
  const a = app(); await a.ready; const { w } = a;
  w.document.title = "Tell Me Again";
  Object.defineProperty(w.document, "hidden", { value: true, configurable: true });
  const shown = []; w.Notification = function () {}; w.Notification.permission = "granted"; w.Notification.requestPermission = async () => "granted";
  Object.defineProperty(w.navigator, "serviceWorker", { value: { ready: Promise.resolve({ showNotification: (t, o) => shown.push([t, o]) }) }, configurable: true });
  w.localStorage.setItem("sitting-alerts", "on");
  w.eval("nudge.turn('Ada')"); await new Promise((r) => setTimeout(r, 20));
  assert.equal(w.document.title, "● Your turn"); assert.equal(shown.length, 1); assert.equal(shown[0][0], "Your turn");
  // alerts off: still flashes, no notification
  w.localStorage.setItem("sitting-alerts", "off"); shown.length = 0; w.eval("nudge.turn('Ada')"); await new Promise((r) => setTimeout(r, 20));
  assert.equal(shown.length, 0);
  // back on screen and it's still your turn
  Object.defineProperty(w.document, "hidden", { value: false, configurable: true });
  const stage = w.document.createElement("div"); w.document.body.append(stage);
  w.eval("nudge.back").call(null, stage, true);
  assert.equal(w.document.title, "Tell Me Again", "title restored");
  assert.ok(stage.classList.contains("nudge"), "the stage pulses");
  // a visible page never flashes or notifies
  w.eval("nudge.turn('Ada')"); assert.equal(w.document.title, "Tell Me Again");
  await a.close();
});

test("enabling alerts asks for permission and remembers the answer", async () => {
  const a = app(); await a.ready; const { w } = a;
  w.Notification = function () {}; w.Notification.permission = "default"; w.Notification.requestPermission = async () => { w.Notification.permission = "granted"; return "granted"; };
  assert.equal(await w.eval("nudge.enable()"), true); assert.equal(w.localStorage.getItem("sitting-alerts"), "on");
  w.eval("nudge.disable()"); assert.equal(w.localStorage.getItem("sitting-alerts"), "off");
  w.Notification.permission = "denied"; w.Notification.requestPermission = async () => "denied";
  assert.equal(await w.eval("nudge.enable()"), false);
  await a.close();
});
