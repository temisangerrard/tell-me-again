// Front door. Static files are served by the platform; this Worker only handles /api/*.
// Each family room is one Durable Object, addressed by its code.
import { DurableObject } from "cloudflare:workers";
export { Room } from "./room.js";
import { lore } from "./lore.js";
import { auth } from "./auth.js";
export { Account } from "./account.js";

// Exact, serialised counter for room creation (Cloudflare's built-in limiter is approximate across locations).
// One instance per hashed address; it stores only timestamps and erases itself shortly after the window.
export class Limiter extends DurableObject {
  async hit(limit, windowMs) {
    const now = Date.now(); let t = ((await this.ctx.storage.get("t")) || []).filter((x) => now - x < windowMs);
    const ok = t.length < limit; if (ok) t.push(now);
    await this.ctx.storage.put("t", t); await this.ctx.storage.setAlarm(now + windowMs + 5000); return ok;
  }
  async alarm() { await this.ctx.storage.deleteAll(); }
}
const ipKey = async (ip) => [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode("family-sitting:" + ip))).slice(0, 8)].map((b) => b.toString(16).padStart(2, "0")).join("");
const strict = async (env, name, who, limit, windowMs) => { try { return await env.LIMITER.get(env.LIMITER.idFromName(name + ":" + (await ipKey(who)))).hit(limit, windowMs); } catch { return true; } };

const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"; // no 0/O, 1/I/L: easy to read out over a call
const code6 = () => { const a = new Uint8Array(6); crypto.getRandomValues(a); return [...a].map((x) => ALPHABET[x % ALPHABET.length]).join(""); };
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

// Per-IP brakes. Many people share one carrier address, so these are generous: they stop floods, not families.
const allowed = async (limiter, key) => { if (!limiter) return true; try { return (await limiter.limit({ key })).success; } catch { return true; } };
const tooMany = () => json({ error: "Too many requests. Wait a minute and try again." }, 429);

/* ---------- Transcription ----------
 * The browser posts one recording; we pass it to Cloudflare's speech model and return the words. Nothing is stored and the audio
 * is never logged. Cloudflare's docs describe this model as zero data retention. vad_filter stays ON: without it the model
 * invents words on silence ("Thank you.") and noise, which has no place in a family's record. */
const MAX_AUDIO = 14 * 1024 * 1024; // about 12 minutes at phone-recording bitrates
const LANGS = new Set(["en", "fr", "pt", "ar", "yo", "ha", "sw"]);
const b64 = (buf) => { let s = ""; const u = new Uint8Array(buf); for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
async function transcribe(req, env, url, ip) {
  if (req.method !== "POST") return json({ error: "Use POST." }, 405);
  if (!env.AI) return json({ error: "Transcription isn't available right now." }, 503);
  const len = Number(req.headers.get("content-length") || 0);
  if (len > MAX_AUDIO) return json({ error: "That recording is too long to turn into text in one go. Try a shorter answer." }, 413);
  const type = req.headers.get("content-type") || "";
  if (!/^(audio|video)\//.test(type) && type !== "application/octet-stream") return json({ error: "That doesn't look like audio." }, 415);
  if (!(await strict(env, "tx-ip", ip, 60, 3600 * 1000))) return json({ error: "That's a lot of transcriptions. Try again in a little while." }, 429);
  if (!(await strict(env, "tx-all", "all", 1000, 24 * 3600 * 1000))) return json({ error: "Transcription is busy today. Please try again tomorrow." }, 429);
  const buf = await req.arrayBuffer();
  if (!buf.byteLength) return json({ error: "No audio came through." }, 400);
  if (buf.byteLength > MAX_AUDIO) return json({ error: "That recording is too long to turn into text in one go. Try a shorter answer." }, 413);
  const lang = (url.searchParams.get("lang") || "").toLowerCase(), names = (url.searchParams.get("names") || "").replace(/[\u0000-\u001f<>]/g, "").slice(0, 180).trim();
  try {
    const r = await env.AI.run("@cf/openai/whisper-large-v3-turbo", {
      audio: b64(buf), task: "transcribe", vad_filter: true,
      ...(LANGS.has(lang) ? { language: lang } : {}),
      ...(names ? { initial_prompt: `A family conversation. Names and places: ${names}.` } : {}) // helps with names, which the model otherwise spells by sound
    });
    return json({ text: String((r && r.text) || "").trim(), words: (r && r.word_count) || 0 });
  } catch (e) { console.error("transcribe failed:", e && e.message); return json({ error: "The speech service had a problem. Please try again in a minute." }, 502); }
}

/* ---------- Call relay ----------
 * Voice calls go straight between phones. Some networks block that, so when a Cloudflare Realtime TURN key is configured
 * (TURN_KEY_ID as a variable, TURN_KEY_API_TOKEN as a secret) we hand out short-lived relay credentials. Without it, or if
 * Cloudflare is unreachable, callers get the public STUN server only, which is what the app used before. The relay carries
 * audio between the two phones and Cloudflare keeps nothing. */
const STUN_ONLY = { iceServers: [{ urls: "stun:stun.cloudflare.com:3478" }], relay: false };
async function iceServers(req, env, ip) {
  if (req.method !== "GET") return json({ error: "Use GET." }, 405);
  if (!env.TURN_KEY_ID || !env.TURN_KEY_API_TOKEN) return json(STUN_ONLY);
  if (!(await strict(env, "ice-ip", ip, 120, 3600 * 1000))) return json(STUN_ONLY); // over the limit: still give them STUN
  try {
    const r = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(env.TURN_KEY_ID)}/credentials/generate-ice-servers`, {
      method: "POST", headers: { authorization: `Bearer ${env.TURN_KEY_API_TOKEN}`, "content-type": "application/json" }, body: JSON.stringify({ ttl: 3600 })
    });
    if (!r.ok) throw new Error("turn " + r.status);
    const j = await r.json(); const list = Array.isArray(j.iceServers) ? j.iceServers : j.iceServers ? [j.iceServers] : [];
    if (!list.length) throw new Error("no servers");
    return json({ iceServers: list, relay: true });
  } catch (e) { console.error("ice failed:", e && e.message); return json(STUN_ONLY); }
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    // Browsers attach Origin to WebSocket and POST requests. Refuse other sites so a random page can't open rooms for you.
    const origin = req.headers.get("origin");
    if (origin && new URL(origin).host !== url.host) return json({ error: "Not allowed." }, 403);

    const ip = req.headers.get("cf-connecting-ip") || "unknown";
    if (url.pathname.startsWith("/api/auth/") || url.pathname === "/api/me" || url.pathname === "/api/account/delete") return auth(req, env, url, ip, strict, json);
    if (url.pathname === "/api/ice") return iceServers(req, env, ip);
    if (url.pathname === "/api/transcribe") return transcribe(req, env, url, ip);
    if (url.pathname === "/api/lore") return lore(req, env, ip, strict, json);
    if (url.pathname === "/api/rooms" && req.method === "POST") {
      if (!(await strict(env, "create", ip, 20, 60000))) return tooMany(); // 20 new rooms a minute per address
      for (let i = 0; i < 6; i++) {
        const code = code6();
        const r = await env.ROOMS.get(env.ROOMS.idFromName(code)).fetch(new Request(`https://room/init?code=${code}`, { method: "POST" }));
        if (r.status === 200) return json({ code });
      }
      return json({ error: "Couldn't make a room. Try again." }, 503);
    }
    const m = url.pathname.match(/^\/api\/rooms\/([A-Z0-9]{6})\/(info|ws)$/i);
    if (m) {
      if (!(await allowed(env.ROOM_JOIN, ip))) return tooMany();
      const code = m[1].toUpperCase();
      return env.ROOMS.get(env.ROOMS.idFromName(code)).fetch(new Request(`https://room/${m[2]}`, req));
    }
    return json({ error: "Not found." }, 404);
  }
};
