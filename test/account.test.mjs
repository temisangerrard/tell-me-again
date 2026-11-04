import test from "node:test";
import assert from "node:assert/strict";
import { startOtp, verifyOtp, checkSession, endSession, wipeAccount, validEmail, normEmail, emailKey, emailText, MAX_TRIES } from "../src/account-core.js";
import { auth } from "../src/auth.js";

const mem = () => { const m = new Map(); return { get: async (k) => m.get(k), put: async (k, v) => void m.set(k, structuredClone(v)), delete: async (k) => void m.delete(k), m }; };

test("a code works once, for the right address, and signs you in", async () => {
  const st = mem(), r = await startOtp(st, "a@b.co", 1000); assert.match(r.code, /^\d{6}$/);
  assert.ok(!JSON.stringify([...st.m]).includes(r.code), "the code itself is never stored");
  const v = await verifyOtp(st, "a@b.co", r.code, "up", 2000); assert.equal(v.user.email, "a@b.co"); assert.ok(v.token.length >= 60);
  assert.equal((await verifyOtp(st, "a@b.co", r.code, "up", 3000)).error, "expired", "a used code is gone");
  assert.equal((await checkSession(st, v.token, 4000)).email, "a@b.co");
  assert.equal(await checkSession(st, "nope", 4000), null);
});

test("wrong codes are limited, and old or resent codes behave", async () => {
  const st = mem(), r = await startOtp(st, "a@b.co", 0);
  assert.ok((await startOtp(st, "a@b.co", 5000)).wait > 0, "no spamming resend");
  for (let i = 0; i < MAX_TRIES; i++) assert.equal((await verifyOtp(st, "a@b.co", "000000", "up", 100)).error, "wrong");
  assert.equal((await verifyOtp(st, "a@b.co", r.code, "up", 200)).error, "locked", "even the right code is refused after too many wrong ones");
  const s2 = mem(); const r2 = await startOtp(s2, "a@b.co", 0); assert.equal((await verifyOtp(s2, "a@b.co", r2.code, "up", 11 * 60e3)).error, "expired");
});

test("signing in needs an account; sessions end and accounts can be deleted", async () => {
  const st = mem(), r = await startOtp(st, "a@b.co", 0);
  assert.equal((await verifyOtp(st, "a@b.co", r.code, "in", 10)).error, "noaccount");
  const r2 = await startOtp(st, "a@b.co", 60e3), v = await verifyOtp(st, "a@b.co", r2.code, "up", 60e3 + 10);
  await endSession(st, v.token); assert.equal(await checkSession(st, v.token, 70e3), null);
  const r3 = await startOtp(st, "a@b.co", 120e3), v3 = await verifyOtp(st, "a@b.co", r3.code, "in", 120e3 + 10); assert.ok(v3.user, "now in works");
  await wipeAccount(st); assert.equal(await checkSession(st, v3.token, 130e3), null);
});

test("emails are normalised and checked; the account is named by a hash", async () => {
  assert.equal(normEmail("  Ada@Example.COM "), "ada@example.com"); assert.ok(validEmail("ada@example.com")); assert.ok(!validEmail("ada@") && !validEmail("a b@c.de") && !validEmail("x".repeat(260) + "@a.bc"));
  const k = await emailKey("ada@example.com"); assert.equal(k.length, 32); assert.ok(!k.includes("ada"));
  assert.match(emailText("123456").subject, /123456/); assert.ok(!/http/i.test(emailText("123456").html), "no links to click in the email");
});

// The routes, with an in-memory stand-in for the Durable Object and the mail binding.
function world(extra = {}) {
  const stubs = new Map(), sent = [];
  const env = { MAIL_DOMAIN: "example.com", EMAIL: { send: async (m) => void sent.push(m) }, ...extra,
    ACCOUNTS: { idFromName: (n) => n, get: (n) => { if (!stubs.has(n)) { const st = mem(); stubs.set(n, { start: (e) => startOtp(st, e, Date.now()), verify: (e, c, m, cc) => verifyOtp(st, e, c, m, Date.now(), cc), session: (t) => checkSession(st, t, Date.now()), logout: (t) => endSession(st, t), remove: () => wipeAccount(st) }); } return stubs.get(n); } } };
  const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json" } });
  const call = (path, body, cookie = "", method = "POST", origin = "https://x.test") => auth(new Request("https://x.test" + path, { method, headers: { "content-type": "application/json", cookie, origin }, body: method === "POST" ? JSON.stringify(body) : undefined }), env, new URL("https://x.test" + path), "1.1.1.1", async () => true, json);
  return { env, sent, call };
}

test("start, verify, then /api/me knows you; logout and delete clear the cookie", async () => {
  const w = world(); assert.equal((await w.call("/api/auth/start", { email: "Ada@Example.com", mode: "up" })).status, 200);
  const code = w.sent[0].text.match(/\d{6}/)[0]; assert.equal(w.sent[0].to, "ada@example.com"); assert.match(w.sent[0].from, /@example\.com>$/);
  const v = await w.call("/api/auth/verify", { email: "ada@example.com", code, mode: "up" }); assert.equal(v.status, 200);
  const sc = v.headers.get("set-cookie"); assert.match(sc, /HttpOnly/); assert.match(sc, /Secure/); assert.match(sc, /SameSite=Lax/);
  const cookie = sc.split(";")[0]; const me = await w.call("/api/me", null, cookie, "GET"); assert.equal((await me.json()).user.email, "ada@example.com");
  assert.equal((await w.call("/api/me", null, "", "GET")).status, 401);
  const out = await w.call("/api/auth/logout", {}, cookie); assert.match(out.headers.get("set-cookie"), /Max-Age=0/); assert.equal((await w.call("/api/me", null, cookie, "GET")).status, 401);
});

test("the tester list, bad addresses, other origins and a switched-off service are all refused", async () => {
  const w = world({ ALLOW_EMAILS: "ada@example.com" });
  assert.equal((await w.call("/api/auth/start", { email: "bob@example.com", mode: "up" })).status, 403);
  assert.equal((await w.call("/api/auth/start", { email: "ada@example.com", mode: "up" })).status, 200);
  assert.equal((await w.call("/api/auth/start", { email: "nope" })).status, 400);
  assert.equal((await w.call("/api/auth/start", { email: "ada@example.com" }, "", "POST", "https://evil.test")).status, 403);
  const off = world({ EMAIL: undefined }); assert.equal((await off.call("/api/auth/start", { email: "ada@example.com" })).status, 503); assert.equal((await off.call("/api/me", null, "", "GET")).status, 401);
});

test("the tester list holds even when the code was asked for in the other mode", async () => {
  const w = world({ ALLOW_EMAILS: "ada@example.com" });
  await w.call("/api/auth/start", { email: "bob@example.com", mode: "in" }); const code = w.sent[0].text.match(/\d{6}/)[0];
  assert.equal((await w.call("/api/auth/verify", { email: "bob@example.com", code, mode: "up" })).status, 403, "no account is made for an unlisted address");
});

test("the same answer whether or not an account exists", async () => {
  const w = world(); const a = await w.call("/api/auth/start", { email: "new@example.com", mode: "in" }); assert.equal(a.status, 200);
  const code = w.sent[0].text.match(/\d{6}/)[0]; const v = await w.call("/api/auth/verify", { email: "new@example.com", code, mode: "in" }); assert.equal(v.status, 404);
});
