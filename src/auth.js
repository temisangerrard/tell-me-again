// /api/auth/start, /api/auth/verify, /api/auth/logout, /api/me, /api/account/delete
import { normEmail, validEmail, emailKey, emailText } from "./account-core.js";
const COOKIE = "tma_s", MAX_AGE = 30 * 86400;
const cookieOf = (req) => { const m = (req.headers.get("cookie") || "").match(new RegExp("(?:^|; )" + COOKIE + "=([^;]+)")); return m ? decodeURIComponent(m[1]) : ""; };
const setCookie = (v, age) => `${COOKIE}=${encodeURIComponent(v)}; Path=/; Max-Age=${age}; HttpOnly; Secure; SameSite=Lax`;
const stubFor = async (env, email) => env.ACCOUNTS.get(env.ACCOUNTS.idFromName(await emailKey(email)));
const allowed = (env, email) => { const l = String(env.ALLOW_EMAILS || "").split(",").map(normEmail).filter(Boolean); return !l.length || l.includes(email); }; // optional tester list

async function sendCode(env, email, code, url) {
  if (env.MAIL_DRY === "log" && ["localhost", "127.0.0.1"].includes(url.hostname)) { console.log(`[dry run] code for ${email}: ${code}`); return true; } // local testing only; never on a live host
  if (!env.EMAIL || !env.MAIL_DOMAIN) return false;
  const m = emailText(code);
  await env.EMAIL.send({ to: email, from: `Tell Me Again <hello@${env.MAIL_DOMAIN}>`, subject: m.subject, text: m.text, html: m.html });
  return true;
}
export async function auth(req, env, url, ip, strict, json) {
  const p = url.pathname;
  const dry = env.MAIL_DRY === "log" && ["localhost", "127.0.0.1"].includes(url.hostname);
  if (!env.ACCOUNTS || (!dry && (!env.EMAIL || !env.MAIL_DOMAIN))) { // not switched on: nothing is read or stored
    if (p === "/api/me") return json({ error: "No account." }, 401);
    return json({ error: "Accounts open soon. You can start a family without one right now." }, 503);
  }
  if (p === "/api/me") { // who am I, from the session cookie
    const t = cookieOf(req), i = t.indexOf("."); if (i < 1) return json({ error: "No account." }, 401);
    const u = await env.ACCOUNTS.get(env.ACCOUNTS.idFromName(t.slice(0, i))).session(t.slice(i + 1));
    return u ? json({ user: { email: u.email, created: u.created } }) : json({ error: "No account." }, 401);
  }
  if (req.method !== "POST") return json({ error: "Use POST." }, 405);
  const origin = req.headers.get("origin"); if (origin && origin !== url.origin) return json({ error: "Not allowed." }, 403);
  let b; try { b = await req.json(); } catch { return json({ error: "Bad request." }, 400); }
  if (p === "/api/auth/logout" || p === "/api/account/delete") {
    const t = cookieOf(req), i = t.indexOf("."); const clear = { "set-cookie": setCookie("", 0) };
    if (i > 0) { const stub = env.ACCOUNTS.get(env.ACCOUNTS.idFromName(t.slice(0, i))), u = await stub.session(t.slice(i + 1)); if (u) { if (p === "/api/account/delete") await stub.remove(); else await stub.logout(t.slice(i + 1)); } }
    return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json", "cache-control": "no-store", ...clear } });
  }
  const email = normEmail(b.email); if (!validEmail(email)) return json({ error: "That email doesn't look right." }, 400);
  const mode = b.mode === "in" ? "in" : "up";
  if (p === "/api/auth/start") {
    if (!(await strict(env, "auth-ip", ip, 12, 3600e3)) || !(await strict(env, "auth-mail", email, 6, 3600e3))) return json({ error: "Too many tries. Wait a while and try again." }, 429);
    if (mode === "up" && !allowed(env, email)) return json({ error: "Sign-ups are invite-only for now." }, 403);
    const r = await (await stubFor(env, email)).start(email);
    if (r.wait) return json({ error: `Wait ${r.wait} seconds before asking for another code.` }, 429);
    try { await sendCode(env, email, r.code, url); } catch (e) { console.error("email failed:", e && e.message); return json({ error: "We couldn't send the email. Check the address and try again." }, 502); }
    return json({ ok: true }); // the same answer whether or not an account exists
  }
  if (p === "/api/auth/verify") {
    if (!(await strict(env, "auth-verify", ip, 30, 3600e3))) return json({ error: "Too many tries. Wait a while and try again." }, 429);
    const r = await (await stubFor(env, email)).verify(email, String(b.code || "").trim(), mode, allowed(env, email)); // the tester list is enforced where the account is made, whatever mode the code was asked for
    const msg = { expired: "That code has expired. Ask for a new one.", locked: "Too many wrong tries. Ask for a new code.", wrong: "That code isn't right.", noaccount: "No account with that email. Create one instead.", invite: "Sign-ups are invite-only for now." };
    if (r.error) return json({ error: msg[r.error] || "Something went wrong." }, r.error === "noaccount" ? 404 : r.error === "invite" ? 403 : 400);
    return new Response(JSON.stringify({ user: { email: r.user.email, created: r.user.created } }), { headers: { "content-type": "application/json", "cache-control": "no-store", "set-cookie": setCookie((await emailKey(email)) + "." + r.token, MAX_AGE) } });
  }
  return json({ error: "Not found." }, 404);
}
