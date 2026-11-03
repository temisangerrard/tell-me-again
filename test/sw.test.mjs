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
