import { DurableObject } from "cloudflare:workers";
import "../engines.js";
const E = globalThis.Engines;

const MAX_SEATS = 4, MAX_MEMBERS = 12, KEEP_MS = 24 * 3600 * 1000; // rooms (and everything in them) are deleted after a day of quiet
// A host sends house rules for Whot. Accept only known switches and a sane hand size, whatever the client claims.
const RULE_KEYS = ["stack", "pickSkips", "marketAgain", "noPowerFinish", "whotBlock", "passSuspend", "lastCard"];
const cleanRules = (r) => { const o = {}; if (r && typeof r === "object") { for (const k of RULE_KEYS) if (typeof r[k] === "boolean") o[k] = r[k]; if ([0, 4, 5, 6, 7].includes(r.hand)) o.hand = r.hand; } return o; };
const BOT_NAMES = ["Pebble", "Comet", "Biscuit", "Maple", "Juniper", "Mango"];
const clean = (s, n) => String(s ?? "").replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, n);

// One family room. The Durable Object is the single source of truth: it holds who is seated, runs the game engines,
// and sends each person only what they may see (a Whot hand goes to its owner and nobody else).
export class Room extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => { this.s = (await ctx.storage.get("s")) || null; });
  }
  async save() {
    await this.ctx.storage.put("s", this.s);
    // push the cleanup alarm out, but not on every move: once an hour is plenty for a 24 hour window
    if (!this.alarmAt || Date.now() - this.alarmAt > 3600 * 1000) { this.alarmAt = Date.now(); await this.ctx.storage.setAlarm(Date.now() + KEEP_MS); }
  }

  async fetch(req) {
    const url = new URL(req.url), path = url.pathname;
    if (path === "/init") {
      if (this.s) return Response.json({ error: "exists" }, { status: 409 });
      this.s = { code: url.searchParams.get("code"), created: Date.now(), members: [], game: null };
      await this.save(); return Response.json({ ok: true });
    }
    if (!this.s) return Response.json({ exists: false }, { status: 404 });
    if (path === "/info") return Response.json({ exists: true, players: this.s.members.filter((m) => m.seat >= 0).length, playing: !!this.s.game && this.s.game.s.over === null });
    if (path === "/ws") {
      if (req.headers.get("upgrade") !== "websocket") return new Response("Expected a WebSocket.", { status: 426 });
      const pair = new WebSocketPair(); this.ctx.acceptWebSocket(pair[1]);
      return new Response(null, { status: 101, webSocket: pair[0] });
    }
    return new Response("Not found", { status: 404 });
  }

  pidOf(ws) { return (ws.deserializeAttachment() || {}).pid || null; }
  online(pid) { return this.ctx.getWebSockets().some((w) => w !== this.closing && this.pidOf(w) === pid); }

  view(pid) {
    const s = this.s, me = s.members.find((m) => m.pid === pid);
    const g = s.game, seat = g ? g.pids.indexOf(pid) : -1;
    return {
      t: "state", code: s.code,
      me: me ? { seat: me.seat, host: s.members[0].pid === pid, name: me.name } : null,
      members: s.members.map((m, i) => ({ name: m.name, seat: m.seat, host: i === 0, bot: !!m.bot, online: !!m.bot || this.online(m.pid), wins: m.wins || 0, you: m.pid === pid })),
      game: g ? { id: g.id, kind: g.kind, seat, names: g.s.names, v: E[g.kind].view(g.s, seat) } : null
    };
  }
  broadcast() { for (const ws of this.ctx.getWebSockets()) { const pid = this.pidOf(ws); if (pid) { try { ws.send(JSON.stringify(this.view(pid))); } catch {} } } }
  err(ws, m) { try { ws.send(JSON.stringify({ t: "err", m })); } catch {} }

  // At most 60 messages per 10 seconds per connection (MSG_LIMIT overrides it for load tests). A person tapping never gets near this.
  throttled(ws) {
    this.buckets ??= new WeakMap(); const now = Date.now(); let b = this.buckets.get(ws);
    if (!b || now - b.t > 10000) { b = { t: now, n: 0 }; this.buckets.set(ws, b); }
    return ++b.n > (Number(this.env.MSG_LIMIT) || 60);
  }
  async webSocketMessage(ws, raw) {
    try { await this.handle(ws, raw); } catch (e) { console.error("room error", e && e.message); this.err(ws, "Something went wrong. Try again."); }
  }
  async handle(ws, raw) {
    if (typeof raw !== "string" || raw.length > 4096) return;
    if (this.throttled(ws)) return this.err(ws, "Slow down a little.");
    let m; try { m = JSON.parse(raw); } catch { return; }
    const s = this.s; if (!s) return;

    if (m.t === "join") {
      const pid = clean(m.pid, 64); if (pid.length < 16 || this.isBot(pid)) return this.err(ws, "Bad id.");
      let mem = s.members.find((x) => x.pid === pid);
      const name = clean(m.name, 30) || "Guest";
      if (!mem) {
        if (s.members.length >= MAX_MEMBERS) return this.err(ws, "This room is full.");
        const used = new Set(s.members.map((x) => x.seat)); let seat = -1;
        for (let i = 0; i < MAX_SEATS; i++) if (!used.has(i)) { seat = i; break; }
        mem = { pid, name, seat, wins: 0 }; s.members.push(mem);
      } else mem.name = name; // a rejoin keeps your seat
      ws.serializeAttachment({ pid }); await this.save(); this.broadcast(); this.botKick(); return;
    }

    const pid = this.pidOf(ws); if (!pid) return this.err(ws, "Join first.");
    const isHost = s.members[0] && s.members[0].pid === pid;

    // Voice calls are peer to peer. The room only passes the setup notes between phones and keeps nothing.
    if (m.t === "sig") {
      if (typeof m.d !== "string" || m.d.length > 3500) return;
      const out = JSON.stringify({ t: "sig", d: m.d });
      for (const o of this.ctx.getWebSockets()) if (o !== ws && this.pidOf(o)) { try { o.send(out); } catch {} }
      return;
    }

    // Emoji reactions are passed on to everyone else and never stored.
    if (m.t === "react") {
      if (!["😂", "👏", "😮", "❤️", "🔥"].includes(m.e)) return;
      const me = s.members.find((x) => x.pid === pid), out = JSON.stringify({ t: "react", e: m.e, n: me ? me.name : "" });
      for (const o of this.ctx.getWebSockets()) if (o !== ws && this.pidOf(o)) { try { o.send(out); } catch {} }
      return;
    }

    if (m.t === "start") {
      if (!isHost) return this.err(ws, "Only the host can start a game.");
      if (!["ludo", "ayo", "whot"].includes(m.game)) return this.err(ws, "Unknown game.");
      let seated = s.members.filter((x) => x.seat >= 0).sort((a, b) => a.seat - b.seat);
      if (m.game === "ayo") seated = seated.slice(0, 2);
      if (seated.length < 2) return this.err(ws, "You need at least two players.");
      const names = seated.map((x) => x.name);
      const gs = m.game === "whot" ? E.whot.init(names, cleanRules(m.rules)) : E[m.game].init(names);
      s.game = { id: Date.now(), kind: m.game, pids: seated.map((x) => x.pid), s: gs, counted: false };
      await this.save(); this.broadcast(); this.botKick(); return;
    }
    // Bots: the host fills empty seats so a game can start without more people. They play on the server by the same rules.
    if (m.t === "addbot") {
      if (!isHost) return this.err(ws, "Only the host can add a bot.");
      if (s.game && s.game.s.over === null) return this.err(ws, "Add a bot between games.");
      if (s.members.filter((x) => x.seat >= 0).length >= MAX_SEATS || s.members.length >= MAX_MEMBERS) return this.err(ws, "The table is full.");
      const used = new Set(s.members.map((x) => x.name)), name = BOT_NAMES.find((n) => !used.has(n)) || `Bot ${s.members.length}`;
      const taken = new Set(s.members.map((x) => x.seat)); let seat = -1; for (let i = 0; i < MAX_SEATS; i++) if (!taken.has(i)) { seat = i; break; }
      s.members.push({ pid: "bot-" + crypto.randomUUID().slice(0, 12), name, seat, wins: 0, bot: true }); await this.save(); this.broadcast(); return;
    }
    if (m.t === "rmbot") {
      if (!isHost) return this.err(ws, "Only the host can remove a bot.");
      if (s.game && s.game.s.over === null) return this.err(ws, "Remove a bot between games.");
      const i = s.members.findIndex((x) => x.bot && x.name === clean(m.name, 30)); if (i < 0) return;
      s.members.splice(i, 1); await this.save(); this.broadcast(); return;
    }
    if (m.t === "stop") { if (!isHost) return this.err(ws, "Only the host can end the game."); s.game = null; await this.save(); this.broadcast(); return; }

    if (m.t === "act") {
      const g = s.game; if (!g) return this.err(ws, "No game is running.");
      const seat = g.pids.indexOf(pid); if (seat < 0) return this.err(ws, "You're watching this one.");
      const a = m.a && typeof m.a === "object" ? { a: String(m.a.a || ""), i: Number.isInteger(m.a.i) ? m.a.i : undefined, s: typeof m.a.s === "string" ? m.a.s : undefined } : {};
      const e = E[g.kind].act(g.s, seat, a);
      if (e) return this.err(ws, e);
      this.tally(g);
      await this.save(); this.broadcast(); this.botKick(); return;
    }
  }
  tally(g) { // tally the win once
    if (g.s.over !== null && !g.counted) {
      g.counted = true;
      if (g.s.over !== "draw") { const w = this.s.members.find((x) => x.pid === g.pids[g.s.over]); if (w) w.wins = (w.wins || 0) + 1; }
    }
  }
  isBot(pid) { return typeof pid === "string" && pid.startsWith("bot-"); }
  // If a bot has something to do, do it after a beat so the table can follow what happened.
  botKick() {
    const g = this.s && this.s.game; if (!g || g.s.over !== null || this.botTimer) return;
    if (!g.pids.some((pid, i) => this.isBot(pid) && E[g.kind].bot(g.s, i))) return;
    this.botTimer = setTimeout(() => { this.botTimer = null; this.botStep().catch((e) => console.error("bot", e && e.message)); }, 900 + Math.floor(Math.random() * 700));
  }
  async botStep() {
    const g = this.s && this.s.game; if (!g || g.s.over !== null) return;
    for (let i = 0; i < g.pids.length; i++) {
      if (!this.isBot(g.pids[i])) continue;
      const a = E[g.kind].bot(g.s, i); if (!a) continue;
      const e = E[g.kind].act(g.s, i, a);
      if (e) { console.error("bot move refused:", e); this.botBad = (this.botBad || 0) + 1; if (this.botBad > 3) return; } else this.botBad = 0;
      this.tally(g); await this.save(); this.broadcast(); break;
    }
    this.botKick();
  }
  async webSocketClose(ws) { this.closing = ws; try { ws.close(); } catch {} this.broadcast(); this.closing = null; } // the closing socket is still listed while this runs
  async webSocketError(ws) { this.closing = ws; this.broadcast(); this.closing = null; }

  // Privacy by default: a room nobody has touched for a day is erased, game and names included.
  async alarm() {
    if (this.ctx.getWebSockets().length) { await this.ctx.storage.setAlarm(Date.now() + KEEP_MS); return; }
    await this.ctx.storage.deleteAll(); this.s = null;
  }
}
