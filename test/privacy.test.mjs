import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";

const read = (p) => readFileSync(new URL("../" + p, import.meta.url), "utf8");

test("pages load nothing from other companies: fonts are our own, and no tracking scripts", () => {
  for (const f of ["index.html", "building.html"]) {
    const h = read(f);
    assert.ok(!/googleapis|gstatic|googletagmanager|google-analytics|cloudflareinsights|facebook|hotjar|segment\.(com|io)|mixpanel|posthog|routingcat/i.test(h), `${f}: no outside hosts`);
    assert.match(h, /css\/fonts\.css/);
  }
  const css = read("css/fonts.css"); for (const [, u] of css.matchAll(/url\(([^)]+)\)/g)) assert.ok(existsSync(new URL("../css/" + u, import.meta.url)), `${u} exists`);
  assert.ok(readdirSync(new URL("../fonts/", import.meta.url)).length >= 10);
});

test("personal names travel in a header, never in the address, and request logs are off", () => {
  assert.match(read("js/transcribe.js"), /"x-names"/); assert.ok(!/q\.set\("names"/.test(read("js/transcribe.js")));
  assert.ok(!/searchParams\.get\("names"\)/.test(read("src/worker.js")));
  assert.match(read("wrangler.jsonc"), /"invocation_logs": false/);
});

test("the notice tells the truth about cookies, email, addresses and the AI helper, and the version moved", () => {
  const p = read("js/privacy.js"); assert.match(p, /PRIVACY_V = "2026-11-05"/);
  assert.ok(!/<p class="para">None\. The app stores/.test(p), "no longer says there are no cookies at all");
  for (const w of ["login cookie", "Cloudflare delivers that email", "scrambled version", "sends nothing to Google"]) assert.ok(p.includes(w), w);
});

test("security headers are set for every page", () => {
  const h = read("_headers"); for (const k of ["X-Content-Type-Options: nosniff", "Referrer-Policy", "X-Frame-Options: DENY", "Permissions-Policy", "microphone=(self)"]) assert.ok(h.includes(k), k);
});
