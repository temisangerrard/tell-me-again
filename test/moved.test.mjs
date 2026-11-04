import test from "node:test";
import assert from "node:assert/strict";
import { app } from "./app.mjs";

async function withApp(fn) { const a = app(); try { await a.ready; await fn(a.w, a.w.document); } finally { await a.close(); } }

test("only the old workers.dev address counts as the old home", () => withApp((w) => {
  assert.equal(w.eval(`/\\.workers\\.dev$/.test("family-sitting.peppera.workers.dev")`), true);
  assert.equal(w.eval("onOldHome()"), false, "the test page is not on workers.dev");
  assert.equal(w.eval(`NEW_HOME`), "https://tellagain.app");
}));

test("a family with data is told how to move it; nobody is redirected away from their data", () => withApp((w, d) => {
  w.eval(`onOldHome = () => true; localStorage.setItem(KEY, JSON.stringify({ step: 7 }))`);
  assert.equal(w.eval("hasLocalFamily()"), true); w.eval("movedNotice()");
  const n = d.querySelector("#moved"); assert.ok(n, "the notice shows"); assert.match(n.textContent, /Restore backup/); assert.ok(n.querySelector('a[href="https://tellagain.app"]'));
  w.eval("movedNotice()"); assert.equal(d.querySelectorAll("#moved").length, 1, "only one");
  w.eval(`localStorage.clear()`); assert.equal(w.eval("hasLocalFamily()"), false, "nothing stored means nothing to lose, so a redirect is safe");
}));
