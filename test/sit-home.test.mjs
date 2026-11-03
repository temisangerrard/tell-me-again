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
  assert.deepEqual([...box.querySelectorAll(".sitlist .who b")].map((x) => x.textContent), ["Grandma Ese", "Uncle Tunde"]);
  assert.match(box.textContent, /Nothing yet\. Start a sitting/);
  await a.close();
});

test("tapping a person opens a sitting with them as storyteller; Back returns to the family", async () => {
  const { a, w, box } = await setup();
  w.eval("renderSit(__box)");
  box.querySelectorAll(".sitgo")[1].click();
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
  assert.match(box.querySelector(".sitlist .who em").textContent, /1 story/);
  await a.close();
});

test("the family list can grow from the home view", async () => {
  const { a, w, box } = await setup();
  w.eval("renderSit(__box)");
  const input = box.querySelector(".padd input"); input.value = "Aunty Bisi"; box.querySelector(".padd .btn").click();
  assert.deepEqual([...box.querySelectorAll(".sitlist .who b")].map((x) => x.textContent).at(-1), "Aunty Bisi");
  assert.equal(w.eval("S.people.length"), 3);
  await a.close();
});

test("who spoke survives a backup and restore; old archives without it still load; a bad value is refused", async () => {
  const a = app(); await a.ready; const { w } = a;
  w.eval('S.name = "Etim"; S.step = 7');
  w.sample = new w.Blob([new Uint8Array([1, 2, 3])], { type: "audio/webm" });
  await w.eval('clips = [{ id: "c1", q: "First home?", who: "Grandma Ese", at: 1700000000000, dur: 9, blob: sample, url: "blob:1" }, { id: "c2", q: "No speaker", at: 1700000001000, dur: 5, blob: sample, url: "blob:2" }]');
  w.backup = await w.eval("createBackup()");
  const raw = typeof w.backup === "string" ? JSON.parse(w.backup) : w.backup;
  assert.equal(raw.recordings.find((r) => r.id === "c1").who, "Grandma Ese");
  assert.equal("who" in raw.recordings.find((r) => r.id === "c2"), false, "older recordings stay as they were");
  const parsed = w.eval("parseBackup(backup)");
  assert.equal(parsed.recordings.find((r) => r.id === "c1").who, "Grandma Ese");
  assert.equal(parsed.recordings.find((r) => r.id === "c2").who, undefined);
  raw.recordings[0].who = 42; w.bad = typeof w.backup === "string" ? JSON.stringify(raw) : raw;
  assert.throws(() => w.eval("parseBackup(bad)"));
  await a.close();
});

test("the Back button returns after a call ends", async () => {
  const a = app(); await a.ready; const { w } = a;
  w.eval('S.people = [{ n: "Ese", born: "" }]; sitting = ["Ese"]; clips = []');
  const box = w.document.createElement("div"); w.document.body.append(box); w.__box = box;
  w.eval('activeCall = { mode: () => "live", live: () => false, recording: () => false, setQuestion() {} }; renderSitting(__box)');
  assert.equal(box.querySelector(".gback").hidden, true, "hidden while a call is live");
  w.eval('activeCall = { mode: () => "idle", live: () => false, recording: () => false, setQuestion() {} }; onCallChange()');
  assert.equal(box.querySelector(".gback").hidden, false, "back as soon as the call ends");
  await a.close();
});

test("Next up suggests the person who most needs a story, with a question they haven't covered, and starts the sitting with it", async () => {
  const { a, w, box } = await setup();
  w.eval("renderSit(__box)");
  const card = box.querySelector(".nextup"); assert.ok(card);
  assert.match(card.textContent, /Grandma Ese/, "the eldest with no stories comes first");
  assert.match(card.textContent, /No stories yet/);
  const q = card.querySelector("p").textContent; assert.ok(q.length > 10, "a question is suggested");
  card.querySelector("button").click();
  assert.ok(box.querySelector("#rec")); assert.equal(w.eval("S.seats[1]"), "Grandma Ese");
  assert.equal(box.querySelector(".whisper .q").textContent, q, "the sitting asks the suggested question first");
  await a.close();
});

test("the family is ordered by need: someone recorded yesterday sits below someone never recorded", async () => {
  const { a, w, box } = await setup();
  const now = Date.now();
  w.eval(`clips = [{ id: "a", q: "Where did you grow up?", who: "Grandma Ese", at: ${now - 86400e3}, dur: 30, blob: new Blob(["x"]), url: "blob:a" }]`);
  w.eval("renderSit(__box)");
  assert.deepEqual([...box.querySelectorAll(".sitlist .who b")].map((x) => x.textContent), ["Uncle Tunde", "Grandma Ese"]);
  assert.match(box.querySelector(".nextup").textContent, /Uncle Tunde/);
  await a.close();
});

test("a person's page shows their topics covered, their recordings, and goes back to the family", async () => {
  const { a, w, box } = await setup();
  const q = w.eval("QUESTIONS.find((x) => S.chapters.includes(x.c)).q"), ch = w.eval("QUESTIONS.find((x) => S.chapters.includes(x.c)).c");
  w.eval(`clips = [{ id: "a", q: ${JSON.stringify(q)}, who: "Grandma Ese", at: ${Date.now() - 3600e3}, dur: 30, blob: new Blob(["x"]), url: "blob:a" }, { id: "b", q: "Free story", who: "Uncle Tunde", at: ${Date.now()}, dur: 5, blob: new Blob(["x"]), url: "blob:b" }]`);
  w.eval("renderSit(__box)");
  box.querySelectorAll(".sitopen")[0].click();
  assert.equal(box.querySelector("h1").textContent, "Grandma Ese");
  assert.equal(box.querySelectorAll(".clips > li").length, 1, "only her recordings");
  assert.equal(box.querySelectorAll(".cov.on").length, 1, "one topic covered");
  assert.match(box.querySelector(".cnt").textContent, /1 of 2/);
  const label = w.eval(`CHAPTERS.find((c) => c.id === ${JSON.stringify(ch)}).label`);
  assert.equal(box.querySelector(".cov.on").textContent, label);
  // tab revisit keeps the page; back returns to the family
  w.eval("renderSit(__box)"); assert.equal(box.querySelector("h1").textContent, "Grandma Ese");
  box.querySelector(".gback").click(); assert.ok(box.querySelector(".nextup"));
  await a.close();
});

test("removing a person from their page takes them off the family but keeps recordings", async () => {
  const { a, w, box } = await setup();
  w.confirm = () => true;
  w.eval(`clips = [{ id: "a", q: "Free story", who: "Uncle Tunde", at: ${Date.now()}, dur: 5, blob: new Blob(["x"]), url: "blob:a" }]`);
  w.eval("renderSit(__box)");
  [...box.querySelectorAll(".sitopen")].find((b) => /Tunde/.test(b.getAttribute("aria-label"))).click();
  [...box.querySelectorAll(".btn.danger")].find((b) => /Remove/.test(b.textContent)).click();
  assert.equal(w.eval("S.people.map((p) => p.n).join()"), "Grandma Ese"); assert.equal(w.eval("clips.length"), 1);
  assert.ok(box.querySelector(".nextup"), "back on the family view");
  await a.close();
});
