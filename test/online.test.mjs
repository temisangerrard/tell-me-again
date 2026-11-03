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

test("the microphone message says what to do on this phone, and whether it will ask again", async () => {
  const a = app(); await a.ready; const { w } = a;
  const iphoneChrome = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130 Mobile/15E148 Safari/604.1";
  const iphoneSafari = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
  const android = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/130 Mobile Safari/537.36";
  assert.match(w.micSteps(iphoneChrome), /Settings, find Chrome/); assert.match(w.micSteps(iphoneSafari), /Settings, then Safari, then Microphone/);
  assert.match(w.micSteps(android), /lock icon/); assert.match(w.micSteps("Mozilla/5.0 (Macintosh)"), /lock icon/);
  Object.defineProperty(w.navigator, "userAgent", { value: iphoneSafari, configurable: true });
  Object.defineProperty(w, "isSecureContext", { value: true, configurable: true }); Object.defineProperty(w.navigator, "mediaDevices", { value: {}, configurable: true });
  const denied = w.micMessage({ name: "NotAllowedError" }, "denied"), dismissed = w.micMessage({ name: "NotAllowedError" }, "prompt");
  assert.match(denied, /won't ask again/); assert.match(denied, /Settings, then Safari/); assert.match(denied, /NotAllowedError, denied/);
  assert.match(dismissed, /Tap again and choose Allow/); assert.doesNotMatch(dismissed, /won't ask again/);
  assert.match(w.micMessage({ name: "NotReadableError" }), /Another app/); assert.match(w.micMessage({ name: "NotFoundError" }), /No microphone/);
  await a.close();
});

test("a watcher is only promised a seat next round when the game can actually seat them", async () => {
  const a = app(); await a.ready; const { w } = a;
  const st = (kind, seats, youIdx) => ({ game: { kind }, members: seats.map((s, i) => ({ seat: s, you: i === youIdx })) });
  w.__st = st("ludo", [0, 1, 2], 2); assert.match(w.eval("watchNote(__st)"), /dealt in next round/, "third at a Ludo table: in next round");
  w.__st = st("whot", [0, 1, 2, 3, -1], 4); assert.match(w.eval("watchNote(__st)"), /table is full/, "a member with no seat");
  w.__st = st("ayo", [0, 1], 1); assert.match(w.eval("watchNote(__st)"), /dealt in next round/, "second at an Ayo table: in");
  w.__st = st("ayo", [0, 1, 2], 2); assert.match(w.eval("watchNote(__st)"), /Ayo is for two players/, "third Ayo watcher is not promised a seat");
  w.__st = st("ludo", [3, 0, 1, 2, 4], 0); assert.match(w.eval("watchNote(__st)"), /dealt in next round/, "seats are ordered, not listed order");
  w.__st = st("ludo", [0, 1, 2, 3, 4], 4); assert.match(w.eval("watchNote(__st)"), /table is full/, "a fifth person at a four-seat table");
  await a.close();
});
