import test from "node:test";
import assert from "node:assert/strict";
import { app } from "./app.mjs";

async function setup() {
  const a = app(); await a.ready; const { w } = a;
  w.eval('S.name = "Ade"; S.people = [{ n: "Grandma Ese", born: "1950" }, { n: "Uncle Tunde", born: "" }]; S.chapters = ["names", "home"]; sitting = null; clips = []');
  const box = w.document.createElement("div"); w.document.body.append(box); w.__box = box;
  return { a, w, box, txt: () => box.innerText ?? box.textContent };
}

test("the Sit tab rests on the family and activity, not on a sitting", async () => {
  const { a, w, box } = await setup();
  w.eval("renderSit(__box)");
  assert.ok(box.querySelector("#startsit"), "a Start a sitting button");
  assert.equal(box.querySelector("#rec"), null, "no recording screen until you start one");
  assert.deepEqual([...box.querySelectorAll(".sitlist .nm")].map((x) => x.textContent), ["Grandma Ese", "Uncle Tunde"]);
  assert.match(box.textContent, /Nothing yet\. Start a sitting/);
  await a.close();
});

test("tapping a person opens a sitting with them as storyteller; Back returns to the family", async () => {
  const { a, w, box } = await setup();
  w.eval("renderSit(__box)");
  box.querySelectorAll(".sitlist button")[1].click();
  assert.ok(box.querySelector("#rec"), "the sitting screen opens");
  assert.equal(w.eval("S.elder.name"), "Uncle Tunde"); assert.equal(w.eval("S.seats[1]"), "Uncle Tunde");
  assert.equal(w.eval("sitting.join()"), "Uncle Tunde");
  // revisiting the tab while a sitting is in progress keeps it open
  w.eval("renderSit(__box)"); assert.ok(box.querySelector("#rec"));
  box.querySelector(".gback").click();
  assert.equal(box.querySelector("#rec"), null); assert.ok(box.querySelector("#startsit"));
  assert.equal(w.eval("sitting"), null);
  await a.close();
});

test("activity lists recordings and sittings, newest first, with who and when", async () => {
  const { a, w, box } = await setup();
  const now = Date.now();
  w.eval(`clips = [{ id: "a", q: "Where did you grow up?", who: "Grandma Ese", at: ${now - 3600e3}, dur: 95, blob: new Blob(["x"]), url: "blob:a" }, { id: "b", q: "Your first job?", who: "Uncle Tunde", at: ${now - 60e3}, dur: 40, blob: new Blob(["x"]), url: "blob:b" }]; S.sittings = [{ d: new Date(${now - 7200e3}).toISOString(), r: "up", t: ["Lots of laughs"] }]`);
  w.eval("renderSit(__box)");
  const rows = [...box.querySelectorAll(".feed li")].map((li) => li.textContent);
  assert.equal(rows.length, 3);
  assert.match(rows[0], /Your first job\?.*Uncle Tunde.*just now|1 min ago/);
  assert.match(rows[2], /Sitting wrapped up.*Good one.*Lots of laughs/);
  assert.match(box.querySelector(".sitlist li:nth-child(1) em").textContent, /1 story/);
  await a.close();
});

test("the family list can grow from the home view", async () => {
  const { a, w, box } = await setup();
  w.eval("renderSit(__box)");
  const input = box.querySelector(".padd input"); input.value = "Aunty Bisi"; box.querySelector(".padd .btn").click();
  assert.deepEqual([...box.querySelectorAll(".sitlist .nm")].map((x) => x.textContent).at(-1), "Aunty Bisi");
  assert.equal(w.eval("S.people.length"), 3);
  await a.close();
});
