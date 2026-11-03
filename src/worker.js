// Front door. Static files are served by the platform; this Worker only handles /api/*.
// Each family room is one Durable Object, addressed by its code.
import { DurableObject } from "cloudflare:workers";
export { Room } from "./room.js";

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
const strict = async (env, ip, limit, windowMs) => { try { return await env.LIMITER.get(env.LIMITER.idFromName("create:" + (await ipKey(ip)))).hit(limit, windowMs); } catch { return true; } };

const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"; // no 0/O, 1/I/L: easy to read out over a call
const code6 = () => { const a = new Uint8Array(6); crypto.getRandomValues(a); return [...a].map((x) => ALPHABET[x % ALPHABET.length]).join(""); };
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

// Per-IP brakes. Many people share one carrier address, so these are generous: they stop floods, not families.
const allowed = async (limiter, key) => { if (!limiter) return true; try { return (await limiter.limit({ key })).success; } catch { return true; } };
const tooMany = () => json({ error: "Too many requests. Wait a minute and try again." }, 429);

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    // Browsers attach Origin to WebSocket and POST requests. Refuse other sites so a random page can't open rooms for you.
    const origin = req.headers.get("origin");
    if (origin && new URL(origin).host !== url.host) return json({ error: "Not allowed." }, 403);

    const ip = req.headers.get("cf-connecting-ip") || "unknown";
    if (url.pathname === "/api/rooms" && req.method === "POST") {
      if (!(await strict(env, ip, 20, 60000))) return tooMany(); // 20 new rooms a minute per address
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
