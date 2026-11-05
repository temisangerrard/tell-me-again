import test from "node:test";
import assert from "node:assert/strict";
import { app } from "./app.mjs";

async function withApp(fn) { const a = app(); try { await a.ready; await fn(a.w, a.w.document); } finally { await a.close(); } }
const fam = (w, d) => { const box = d.createElement("div"); d.body.append(box); w.eval("renderFamily").call(w, box); return box; };

test("the backup nudge waits for a recording, then asks, then goes quiet after a backup or Later", () => withApp((w, d) => {
  w.eval("clips = []");
  assert.equal(fam(w, d).querySelector(".nudge"), null, "nothing to lose yet");
  w.eval("clips = [{ id: 1, at: 1 }]");
  const box = fam(w, d);
  assert.match(box.querySelector(".nudge").textContent, /only on this phone/);
  w.localStorage.setItem("sitting-lastbackup", String(Date.now()));
  assert.equal(fam(w, d).querySelector(".nudge"), null, "just backed up");
  w.localStorage.setItem("sitting-lastbackup", String(Date.now() - 20 * 864e5));
  const old = fam(w, d); assert.match(old.querySelector(".nudge").textContent, /been a while/);
  [...old.querySelectorAll(".nudge button")].find((b) => b.textContent === "Later").click();
  assert.equal(old.querySelector(".nudge"), null);
  assert.equal(fam(w, d).querySelector(".nudge"), null, "snoozed for a week");
}));

test("Tell us what's wrong opens an email with device details and no personal ones", () => withApp(async (w, d) => {
  w.eval(`account = { email: "ada@example.com" }; S.me = S.me || {}; S.me.name = "Ada";`);
  const body = await w.eval("feedbackBody")();
  assert.match(body, /App version:/); assert.match(body, /Device:/); assert.match(body, /Screen:/);
  assert.ok(!/ada/i.test(body), "no name or email in the report");
  assert.ok([...fam(w, d).querySelectorAll("button")].some((b) => b.textContent === "Tell us what's wrong"));
}));

test("signing out from the Family tab lands on the landing page, and Open my family returns to the app", () => withApp(async (w, d) => {
  w.eval(`account = { email: "ada@example.com" }; S.step = 7;`);
  w.fetch = async () => ({ ok: true }); w.eval("fetch = window.fetch");
  const box = fam(w, d); box.querySelector(".acctbar button").click();
  await new Promise((r) => setTimeout(r, 30));
  assert.equal(w.eval("account"), null);
  assert.ok(w.eval("app").classList.contains("landing"), "landing page shown");
  const go = w.eval("app").querySelector("#go"); assert.equal(go.textContent, "Open my family");
  go.click(); assert.equal(w.eval("app").className, "app room", "back in the app");
  assert.equal(w.eval("S.step"), 7, "the family was never touched");
}));
