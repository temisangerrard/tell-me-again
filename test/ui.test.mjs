import assert from "node:assert/strict";
import test from "node:test";
import { app } from "./app.mjs";

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
