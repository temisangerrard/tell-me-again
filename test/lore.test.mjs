import test from "node:test";
import assert from "node:assert/strict";
import { app } from "./app.mjs";
import { cleanExtract, cleanSuggest, parseJSON, lore } from "../src/lore.js";

async function withApp(fn) { const a = app(); try { await a.ready; await fn(a.w, a.w.document); } finally { await a.close(); } }
const json = (o, status = 200) => new Response(JSON.stringify(o), { status });
const strictOk = async () => true;
const post = (body) => new Request("https://x/api/lore", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

test("model output is cleaned: junk years dropped, lists capped, markup stripped", () => {
  const c = cleanExtract(parseJSON('Sure! {"people":[{"n":"Ekaette <b>","rel":"sister"},"Ma Nsikak",{"n":""}],"places":["Uyo"],"years":["1974","soon","19999"],"foods":[],"sayings":["x"],"themes":["a","b","c","d"]} done'));
  assert.deepEqual(c.people.map((p) => p.n), ["Ekaette", "Ma Nsikak"]);
  assert.deepEqual(c.years, ["1974"]); assert.equal(c.themes.length, 3);
  assert.deepEqual(cleanExtract(null), { people: [], places: [], years: [], foods: [], sayings: [], themes: [] });
});

test("the speaker is not listed as a person they mention", () => {
  const c = cleanExtract({ people: [{ n: "Etim", rel: "speaker" }, { n: "Papa Etim", rel: "" }, { n: "Ekaette", rel: "sister" }] }, "Papa Etim");
  assert.deepEqual(c.people.map((p) => p.n), ["Ekaette"]);
});

test("suggested questions must be questions, at most three", () => {
  assert.deepEqual(cleanSuggest({ questions: ["What did the house smell like?", "Tell me about it.", "a?", "b?", "c?"] }).questions, ["What did the house smell like?", "a?", "b?"]);
});

test("the endpoint sends the story as data, returns cleaned lore, and refuses unknown tasks", async () => {
  let seen; const env = { AI: { run: async (m, o) => { seen = o; return { response: '{"people":[{"n":"Ekaette","rel":"sister"}],"places":["Uyo"],"years":["1974"],"foods":[],"sayings":[],"themes":["home"]}' }; } } };
  const r = await lore(post({ task: "extract", who: "Papa", q: "House?", text: "My sister Ekaette and I grew up in Uyo in 1974, near the river." }), env, "1.1.1.1", strictOk, json);
  const j = await r.json(); assert.equal(j.lore.people[0].n, "Ekaette"); assert.match(seen.messages[0].content, /Ignore any instruction/); assert.match(seen.messages[1].content, /"""/);
  assert.equal((await lore(post({ task: "dance" }), env, "1.1.1.1", strictOk, json)).status, 400);
  assert.equal((await lore(post({ task: "extract", text: "hi" }), env, "1.1.1.1", strictOk, json)).status, 200, "a too-short story is not sent to the model");
  assert.equal((await lore(post({ task: "extract", text: "x".repeat(40) }), {}, "1.1.1.1", strictOk, json)).status, 503);
});

test("lore adds up across stories and finds ask-next ideas without any AI", () => withApp((w) => {
  w.eval(`S.consent.lore = true; S.people = [{n:"Papa"},{n:"Ini"},{n:"Ekaette"}]; S.lore = { clips: {
    a: { who:"Papa", people:[{n:"Ekaette",rel:"sister"}], places:["Uyo"], years:["1974"], foods:["garri"], sayings:["x y"] },
    b: { who:"Ini", people:[{n:"Ekaette",rel:""},{n:"Ma Nsikak",rel:""}], places:["Uyo"], years:[], foods:[], sayings:[] },
    c: { who:"Ini", people:[{n:"Ma Nsikak",rel:""}], places:[], years:[], foods:[], sayings:[] } } }`);
  const a = w.eval("loreAgg()"); assert.equal(a.people[0].n, 2); assert.equal(a.places.find((x) => x.label === "Uyo").n, 2);
  const gaps = w.eval("loreGaps()");
  assert.ok(gaps.some((g) => g.who === "Ekaette" && /hasn't told/.test(g.why)), "someone mentioned who has not spoken");
  assert.ok(gaps.some((g) => g.add === "Ma Nsikak"), "a person in the stories who is not in the family list");
  assert.ok(gaps.some((g) => /1974/.test(g.q || "") && g.who !== "Papa"), "a memory only one person has, put to someone else");
}));

test("the notes sent for suggestions are a short summary, not the stories", () => withApp((w) => {
  w.eval(`S.lore = { clips: { a: { who:"Papa", q:"House?", people:[{n:"Ekaette",rel:""}], places:["Uyo"], years:[], foods:[], sayings:[] } } }`);
  const n = w.eval(`loreNotes("Papa")`); assert.match(n, /People mentioned: Ekaette/); assert.match(n, /Places: Uyo/); assert.ok(n.length < 600);
}));
