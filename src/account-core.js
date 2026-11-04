// Accounts, kept deliberately small: an email address, a one-time code, and a session. The account holds nothing else yet; a
// family still lives on the device. These functions take any storage with get/put/delete, so they run the same in tests.
const enc = new TextEncoder();
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
export const sha = async (s) => hex(await crypto.subtle.digest("SHA-256", enc.encode(s)));
export const normEmail = (e) => String(e || "").trim().toLowerCase();
export const validEmail = (e) => e.length <= 254 && /^[^@\s]{1,64}@[^@\s]{1,190}\.[^@\s]{2,}$/.test(e);
export const emailKey = async (email) => (await sha("tma-account:" + email)).slice(0, 32); // names the Durable Object; never the address itself
export const newCode = () => String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, "0");
const randomHex = (n) => hex(crypto.getRandomValues(new Uint8Array(n)));
const same = (a, b) => { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; };
export const OTP_MS = 10 * 60e3, RESEND_MS = 30e3, MAX_TRIES = 5, SESSION_MS = 30 * 864e5;

export async function startOtp(st, email, now = Date.now()) {
  const o = await st.get("otp");
  if (o && now - o.at < RESEND_MS) return { wait: Math.ceil((RESEND_MS - (now - o.at)) / 1000) };
  const code = newCode(); await st.put("otp", { h: await sha(code + ":" + email), at: now, exp: now + OTP_MS, tries: 0 });
  return { code };
}
export async function verifyOtp(st, email, code, mode, now = Date.now()) {
  const o = await st.get("otp");
  if (!o || now > o.exp) return { error: "expired" };
  if (o.tries >= MAX_TRIES) { await st.delete("otp"); return { error: "locked" }; }
  if (!/^\d{6}$/.test(String(code || "")) || !same(await sha(code + ":" + email), o.h)) { o.tries++; await st.put("otp", o); return { error: "wrong" }; }
  await st.delete("otp");
  let user = await st.get("user");
  if (!user) { if (mode === "in") return { error: "noaccount" }; user = { id: crypto.randomUUID(), email, created: now }; await st.put("user", user); }
  const token = randomHex(32), list = ((await st.get("sessions")) || []).filter((s) => s.exp > now).slice(-9);
  list.push({ h: await sha(token), exp: now + SESSION_MS }); await st.put("sessions", list);
  return { user: { id: user.id, email: user.email, created: user.created }, token };
}
export async function checkSession(st, token, now = Date.now()) {
  if (!token) return null; const h = await sha(token), list = (await st.get("sessions")) || [];
  if (!list.some((s) => s.exp > now && same(s.h, h))) return null;
  const u = await st.get("user"); return u ? { id: u.id, email: u.email, created: u.created } : null;
}
export async function endSession(st, token) { const h = await sha(token || ""); await st.put("sessions", ((await st.get("sessions")) || []).filter((s) => !same(s.h, h))); }
export async function wipeAccount(st) { for (const k of ["otp", "user", "sessions"]) await st.delete(k); }

export const emailText = (code) => ({
  subject: `Your Tell Me Again code: ${code}`,
  text: `Your code is ${code}\n\nIt works for 10 minutes. If you didn't ask for it, ignore this email and nothing happens.\n\nTell Me Again, by Settley Studio`,
  html: `<div style="font-family:system-ui,sans-serif;max-width:420px;margin:0 auto;padding:24px;color:#1d1d1f"><p style="margin:0 0 8px;color:#555">Your code is</p><p style="margin:0 0 20px;font:800 38px/1 ui-monospace,monospace;letter-spacing:6px">${code}</p><p style="margin:0 0 8px;color:#555">It works for 10 minutes. If you didn't ask for it, ignore this email and nothing happens.</p><p style="margin:24px 0 0;color:#888;font-size:13px">Tell Me Again, by Settley Studio</p></div>`
});
