import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import test from "node:test";
import { runInContext } from "node:vm";
import { JSDOM } from "jsdom";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)[1];
function app() {
  const dom = new JSDOM('<div id="app"></div>', { url: "http://localhost:8787", runScripts: "outside-only", pretendToBeVisual: true });
  const w = dom.window;
  w.eval = code => runInContext(code, dom.getInternalVMContext());
  w.structuredClone = structuredClone;
  w.matchMedia = () => ({ matches: true });
  w.scrollTo = () => {};
  w.eval(readFileSync(new URL("../questions.js", import.meta.url), "utf8"));
  w.eval(readFileSync(new URL("../engines.js", import.meta.url), "utf8"));
  let error;
  try { w.eval(script); } catch (e) { error = e; }
  return { w, error, close: () => setTimeout(() => w.close(), 0) };
}

test("landing initialises every control without an exception", () => {
  const a = app();
  try {
    assert.equal(a.error, undefined);
    a.w.document.querySelector("#th").click();
    assert.ok(a.w.document.querySelector('[role="dialog"]'));
  } finally { a.close(); }
});

test("clearing the profile name clears the saved online display name", () => {
  const a = app();
  try {
    a.w.eval('S.step = 7; S.name = "Etim"; S.me.name = "Ada"; S.elder.name = "Papa"; reseat(); render(); lsSet("sitting-name", "Ada"); renderFamily(document.querySelector("#family"));');
    const input = [...a.w.document.querySelectorAll("#family label")].find(l => l.textContent.trim() === "Your name").querySelector("input");
    input.value = "";
    input.dispatchEvent(new a.w.Event("input"));
    assert.equal(a.w.localStorage.getItem("sitting-name"), "");
    assert.equal(a.w.eval("S.seats[0]"), "You");
  } finally { a.close(); }
});

for (const winner of [0, 1, "draw"]) {
  test(`finished Ayo (${winner}) stays finished after reopening`, () => {
    const a = app();
    try {
      a.w.eval(`S.step = 7; S.name = "Etim"; S.seats = ["Ada", "Papa"]; render(); ayo = { names: ["Ada", "Papa"], p: Array(12).fill(1), sc: ${JSON.stringify(winner === 0 ? [25,11] : winner === 1 ? [11,25] : [18,18])}, turn: 0, busy: false, over: ${JSON.stringify(winner)} }; renderAyo(document.querySelector("#play"));`);
      const box = a.w.document.querySelector("#play");
      assert.ok([...box.querySelectorAll(".pit")].every(p => p.disabled), "no moves after a result");
      assert.match(box.querySelector(".win")?.textContent || "", winner === "draw" ? /draw/i : /wins/);
      assert.equal(a.w.eval("S.wins.length"), 0, "reopening must not count another win");
    } finally { a.close(); }
  });
}
