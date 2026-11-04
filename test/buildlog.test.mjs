import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { app } from "./app.mjs";

const root = (p) => new URL("../" + p, import.meta.url);

test("the landing page footer links to the build log, and the page exists in the app's design", async () => {
  const a = app(); try { await a.ready; assert.ok(a.w.document.querySelector('.foot a[href="/building"]'), "footer link"); } finally { await a.close(); }
  assert.ok(existsSync(root("building.html")) && existsSync(root("css/log.css")));
  const html = readFileSync(root("building.html"), "utf8");
  assert.match(html, /css\/base\.css/, "uses the app's tokens and themes"); assert.match(html, /sitting-theme/, "follows the chosen theme");
  assert.match(html, /<title>How Tell Me Again was built<\/title>/);
});

test("the build log makes no promises it can't keep, sets no tracking and writes like the rest of the app", () => {
  const html = readFileSync(root("building.html"), "utf8");
  assert.ok(!/<script[^>]+src=/.test(html), "no outside scripts"); assert.ok(!/analytics|gtag|pixel/i.test(html));
  assert.ok(!/[—–]/.test(html), "no dashes in the copy"); assert.ok(!/\bmotto\b/i.test(html));
  const css = readFileSync(root("css/log.css"), "utf8");
  for (const sel of css.match(/^[^@{}\n/][^{}]*(?=\{)/gm) || []) for (const part of sel.split(",")) {
    const s = part.trim(); if (!s || /^(\.logpage|\.log\b|\.logtop|\.logmark)/.test(s) || /^(\.kick|\.lede|\.dots|\.stats?|\.note|\.loop|\.phase|\.pairs?|\.say|\.then|\.table|\.row|\.tag|\.prompts?|\.prompt|\.stack|\.take)/.test(s) || /^from|^to|^\d/.test(s)) continue;
    assert.fail(`unscoped selector in log.css: ${s}`);
  }
});
