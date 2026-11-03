import test from "node:test";
import assert from "node:assert/strict";
import { app } from "./app.mjs";

test("two tabs on one device are two people in a room", async () => {
  const a = app(); await a.ready; const { w } = a;
  const first = w.eval('roomPid("ABC234")');
  w.eval('claimRoom("ABC234", ' + JSON.stringify(first) + ')');
  assert.equal(w.eval('roomPid("ABC234")'), first, "same tab keeps its id");
  w.sessionStorage.clear(); // a second tab starts with empty session storage
  const second = w.eval('roomPid("ABC234")');
  assert.notEqual(second, first, "a live claim from another tab is not reused");
  await a.close();
});

test("coming back after closing the app reclaims the seat", async () => {
  const a = app(); await a.ready; const { w } = a;
  w.localStorage.setItem("claim:ABC234", JSON.stringify({ pid: "p".repeat(36), t: Date.now() - 60000 }));
  assert.equal(w.eval('roomPid("ABC234")'), "p".repeat(36));
  await a.close();
});
