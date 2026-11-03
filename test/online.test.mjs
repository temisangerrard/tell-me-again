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

test("in-app phone browsers are recognised, real browsers are not", async () => {
  const a = app(); await a.ready; const { w } = a;
  const yes = [
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Twitter for iPhone",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/450]",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
    "Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/AP1A; wv) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36"
  ];
  const no = [
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36"
  ];
  yes.forEach((u) => assert.equal(w.inAppBrowser(u), true, u));
  no.forEach((u) => assert.equal(w.inAppBrowser(u), false, u));
  await a.close();
});
