import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const w = {}; w.window = w; runInNewContext(readFileSync(new URL("../questions.js", import.meta.url), "utf8"), w);
const { QUESTIONS: Q, CHAPTERS: C, RELATIONS: R } = w, rels = R.map(([k]) => k), pages = ["story", "recipe", "timeline", "tree", "saying", "portrait", "object"];

test("every question is complete and well-formed", () => {
  const ids = new Set();
  for (const q of Q) {
    assert.ok(q.id && !ids.has(q.id), `unique id: ${q.id}`); ids.add(q.id);
    assert.ok(C.some((c) => c.id === q.c), `${q.id}: chapter exists`);
    assert.ok([1, 2, 3, 4].includes(q.d), `${q.id}: depth 1 to 4`);
    assert.ok(q.q.length > 15, `${q.id}: a real prompt`); assert.equal((q.q.match(/\?/g) || []).length <= 2, true, `${q.id}: one idea at a time`);
    assert.ok(Array.isArray(q.f) && q.f.length >= 2 && q.f.every((f) => /\?/.test(f)), `${q.id}: follow-ups are questions`);
    assert.ok(q.tip && q.tip.length > 10, `${q.id}: a tip for the asker`);
    assert.ok(pages.includes(q.page), `${q.id}: a book page type`);
    if (q.for) assert.ok(q.for.length && q.for.every((r) => rels.includes(r)), `${q.id}: for uses known relations`);
    if (q.photo !== undefined) assert.ok(typeof q.photo === "string" && q.photo.length > 5, `${q.id}: photo prompt`);
  }
});

test("the writing stays human: no em dashes, no 'not this, it's that', no banned words", () => {
  for (const q of Q) for (const t of [q.q, q.tip, ...q.f]) {
    assert.ok(!/[—–]/.test(t), `${q.id}: no dashes in "${t}"`);
    assert.ok(!/\bnot (just|only|a|an|about)\b[^.?]*[,;] (it'?s|but)/i.test(t), `${q.id}: "${t}"`);
    assert.ok(!/\bmotto\b/i.test(t), `${q.id}: avoid that word`);
  }
});

test("the bank covers every chapter, every kind of relationship and every depth", () => {
  for (const c of C) assert.ok(Q.filter((q) => q.c === c.id).length >= 3, `${c.id} has questions`);
  for (const r of rels.filter((x) => x !== "other")) {
    const mine = w.questionsFor(r); assert.ok(mine.length >= 30, `${r}: ${mine.length} questions`);
    for (const d of [1, 2, 3]) assert.ok(mine.some((q) => q.d === d), `${r}: depth ${d}`);
  }
  assert.ok(Q.filter((q) => q.for && q.for.includes("sibling")).length >= 8, "siblings have questions written for them");
  assert.ok(Q.filter((q) => q.photo).length >= 10, "photo prompts exist for the book");
});

test("questions written for one relationship are not offered to another", () => {
  const sib = w.questionsFor("sibling").map((q) => q.id), gp = w.questionsFor("grandparent").map((q) => q.id);
  assert.ok(sib.includes("us-room") && !gp.includes("us-room"), "shared-room question is for siblings");
  assert.ok(gp.includes("par-grand") && !sib.includes("par-grand"), "grandparent question is for grandparents");
  assert.equal(w.questionsFor("").length, Q.length, "an unknown relationship sees everything");
});
