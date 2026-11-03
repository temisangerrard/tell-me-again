import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

function load() {
  const listeners = {}, self = { location: { origin: "http://x" }, addEventListener: (t, f) => (listeners[t] = f), clients: {} };
  runInNewContext(readFileSync(new URL("../sw.js", import.meta.url), "utf8"), { self, caches: {}, fetch: () => {}, URL, Promise });
  return { self, listeners };
}

test("tapping a turn notification focuses an open game window", async () => {
  const { self, listeners } = load(); let closed = false, focused = false, opened = null, wait;
  self.clients.matchAll = async () => [{ focus: async () => { focused = true; } }];
  self.clients.openWindow = async (u) => { opened = u; };
  listeners.notificationclick({ notification: { close: () => { closed = true; } }, waitUntil: (p) => { wait = p; } }); await wait;
  assert.ok(closed && focused && opened === null);
});

test("with no window open, tapping the notification opens the app", async () => {
  const { self, listeners } = load(); let opened = null, wait;
  self.clients.matchAll = async () => [];
  self.clients.openWindow = async (u) => { opened = u; };
  listeners.notificationclick({ notification: { close() {} }, waitUntil: (p) => { wait = p; } }); await wait;
  assert.equal(opened, "/");
});

test("the app only reloads itself for an update when nothing would be lost", async () => {
  const { app } = await import("./app.mjs");
  const a = app(); await a.ready; const { w } = a;
  assert.equal(w.eval("idleForUpdate()"), true, "quiet app: safe to reload");
  w.eval('sitting = ["Ese"]'); assert.equal(w.eval("idleForUpdate()"), false, "a sitting is open");
  w.eval("sitting = null; activeCall = { mode: () => 'live' }"); assert.equal(w.eval("idleForUpdate()"), false, "a call is live");
  w.eval("activeCall = null; currentRoom = { close() {} }"); assert.equal(w.eval("idleForUpdate()"), false, "in a room");
  w.eval("currentRoom = null; restoring = true"); assert.equal(w.eval("idleForUpdate()"), false, "restoring a backup");
  w.eval("restoring = false; activeVoiceRecording = true"); assert.equal(w.eval("idleForUpdate()"), false, "recording a call");
  await a.close();
});
