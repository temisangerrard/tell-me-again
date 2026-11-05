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

import { runInNewContext } from "node:vm";
const ctx = { crypto: globalThis.crypto, TextEncoder, TextDecoder, atob, btoa, Uint8Array, JSON, String, Number, Error, document: {}, console };
runInNewContext(read("js/crypt.js") + "\nthis.seal = sealBackup; this.open = openBackup; this.isSealed = isSealed;", ctx);

test("a sealed backup hides everything, opens only with the passphrase, and is detected", async () => {
  const text = JSON.stringify({ app: "Tell Me Again", family: { name: "Okonkwo", people: [{ n: "Ekaette" }] }, recordings: [{ audio: "AAAA" }] });
  const sealed = await ctx.seal(text, "correct horse battery");
  assert.ok(ctx.isSealed(sealed) && !ctx.isSealed(text)); assert.ok(!/Okonkwo|Ekaette|AAAA/.test(sealed), "nothing readable in the file");
  assert.equal(await ctx.open(sealed, "correct horse battery"), text);
  await assert.rejects(() => ctx.open(sealed, "wrong passphrase!"), /doesn't open/);
  await assert.rejects(() => ctx.seal(text, "short"), /at least 8/);
  const again = await ctx.seal(text, "correct horse battery"); assert.notEqual(sealed, again, "a fresh salt and nonce each time");
  const tampered = JSON.parse(sealed); tampered.data = tampered.data.slice(0, -8) + "AAAAAAAA"; await assert.rejects(() => ctx.open(JSON.stringify(tampered), "correct horse battery"), /doesn't open/, "tampering is caught");
});

import { createHash } from "node:crypto";
test("the content policy allows only our own scripts, and its hash matches the one inline script", () => {
  const h = read("_headers"), csp = h.match(/Content-Security-Policy: (.*)/)[1];
  assert.match(csp, /default-src 'self'/); assert.match(csp, /object-src 'none'/); assert.match(csp, /frame-ancestors 'none'/); assert.ok(!/script-src[^;]*unsafe-inline/.test(csp), "no inline scripts allowed in general");
  for (const f of ["index.html", "building.html"]) {
    const inline = [...read(f).matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]); assert.equal(inline.length, 1, `${f}: one inline script`);
    assert.ok(csp.includes("'sha256-" + createHash("sha256").update(inline[0]).digest("base64") + "'"), `${f}: the policy pins the inline theme script`);
    assert.ok(!/\son[a-z]+="/.test(read(f)), `${f}: no inline event handlers`);
  }
});
