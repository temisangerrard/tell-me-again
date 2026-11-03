// Run against `wrangler dev`:  BASE=http://localhost:8787 node test/room.test.mjs
import "../engines.js";
// FULL=1 plays every game to the end (start the server with --var MSG_LIMIT:100000). Without it, a QUICK run plays short stretches
// under the real production limits, which is what we run against the live site.
const FULL = !!process.env.FULL;
const E = globalThis.Engines, BASE = process.env.BASE || "http://localhost:8787", WS = BASE.replace(/^http/, "ws");
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log("FAIL", m); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rid = () => crypto.randomUUID();

class Client {
  constructor(code, name, pid = rid()) { this.code = code; this.name = name; this.pid = pid; this.st = null; this.errs = []; this.msgs = 0; }
  connect() {
    return new Promise((res, rej) => {
      this.ws = new WebSocket(`${WS}/api/rooms/${this.code}/ws`);
      this.ws.onopen = () => this.ws.send(JSON.stringify({ t: "join", pid: this.pid, name: this.name }));
      this.ws.onmessage = (e) => { const m = JSON.parse(e.data); this.msgs++; if (m.t === "state") { this.st = m; res(); } else if (m.t === "err") this.errs.push(m.m); };
      this.ws.onerror = () => rej(new Error("ws error"));
    });
  }
  send(o) { this.ws.send(JSON.stringify(o)); }
  async act(a) { const n = this.msgs; this.send({ t: "act", a }); for (let i = 0; i < 600 && this.msgs === n; i++) await sleep(5); }
  close() { try { this.ws.close(); } catch {} }
}
const REMOTE = !/localhost|127\.0\.0\.1/.test(BASE);
const settle = () => sleep(REMOTE ? 1000 : 120); // real latency needs patience
const until = async (fn, ms = 4000) => { const t = Date.now(); while (Date.now() - t < ms) { if (fn()) return true; await sleep(15); } return false; };

// ---- call relay: without a TURN key the server still answers with STUN, and only GET is allowed
{ const r = await fetch(`${BASE}/api/ice`); const j = await r.json();
  ok(r.status === 200 && Array.isArray(j.iceServers) && j.iceServers.length >= 1 && /^stun:/.test([].concat(j.iceServers[0].urls)[0]), "ice servers fall back to STUN");
  ok((await fetch(`${BASE}/api/ice`, { method: "POST" })).status === 405, "ice is GET only"); }

// ---- create room
const created = await (await fetch(`${BASE}/api/rooms`, { method: "POST" })).json();
ok(/^[A-Z2-9]{6}$/.test(created.code), "room code shape " + created.code);
const info0 = await (await fetch(`${BASE}/api/rooms/${created.code}/info`)).json(); ok(info0.exists && info0.players === 0, "fresh room info");
const nope = await fetch(`${BASE}/api/rooms/ZZZZZZ/info`); ok(nope.status === 404, "unknown room is 404");
const crossSite = await fetch(`${BASE}/api/rooms`, { method: "POST", headers: { origin: "https://evil.example" } }); ok(crossSite.status === 403, "cross-site create refused");

// ---- seating
const code = created.code;
const [a, b, c, d, e] = [new Client(code, "Ada"), new Client(code, "Bayo"), new Client(code, "Chi"), new Client(code, "Dayo"), new Client(code, "Eke")];
for (const x of [a, b, c, d, e]) { await x.connect(); await sleep(30); }
await settle();
ok(a.st.me.host && a.st.me.seat === 0, "first joiner is host in seat 0");
ok(!b.st.me.host && b.st.me.seat === 1 && d.st.me.seat === 3, "seats in order");
ok(e.st.me.seat === -1, "fifth person is a spectator");
ok(a.st.members.length === 5 && a.st.members.every((m) => m.online), "everyone online");
ok(!JSON.stringify(a.st).includes(b.pid), "other people's ids are never sent");

// ---- host-only, validation
b.send({ t: "start", game: "ludo" }); await settle(); ok(b.errs.some((m) => /host/i.test(m)), "non-host can't start");
a.send({ t: "start", game: "poker" }); await settle(); ok(a.errs.some((m) => /unknown/i.test(m)), "unknown game rejected");
a.send({ t: "act", a: { a: "roll" } }); await settle(); ok(a.errs.some((m) => /no game/i.test(m)), "act without game rejected");
a.ws.send("x".repeat(5000)); a.ws.send("not json"); await settle(); ok(a.ws.readyState === 1, "junk input is ignored, socket survives");
const bad = new Client(code, "Short", "tooshort"); await Promise.race([bad.connect().catch(() => {}), sleep(400)]); ok(!bad.st && bad.errs.some((m) => /id/i.test(m)), "short pid refused"); bad.close();

// ---- hostile house rules are sanitised, not trusted
a.send({ t: "start", game: "whot", rules: { hand: 1e9, stack: "yes", evil: true, noPowerFinish: true } }); await settle();
ok(a.st.game && a.st.game.kind === "whot", "hostile rules don't break the deal");
ok(a.st.game.v.hand.length === 5 && a.st.game.v.R.stack === false && a.st.game.v.R.noPowerFinish === true && !("evil" in a.st.game.v.R), "rules sanitised: hand size ignored, non-booleans ignored, unknown keys dropped");
a.send({ t: "stop" }); await settle();

// ---- Whot: privacy, turns, play to the end
a.send({ t: "start", game: "whot", rules: { stack: true, whotBlock: true, lastCard: true, passSuspend: true } }); await settle();
const players = [a, b, c, d];
ok(players.every((p) => p.st.game && p.st.game.kind === "whot"), "everyone sees the whot game");
for (const p of players) {
  const raw = JSON.stringify(p.st.game.v);
  ok(!raw.includes('"hands"') && !raw.includes('"deck"'), `${p.name} view has no hands or deck`);
  ok(p.st.game.v.hand.length === 5 && p.st.game.v.counts.every((n) => n === 5), `${p.name} sees own 5 cards and counts`);
}
const myCards = (p) => JSON.stringify(p.st.game.v.hand);
ok(new Set(players.map(myCards)).size === 4, "every hand differs");
ok(e.st.game.v.hand.length === 0 && e.st.game.seat === -1, "spectator sees no hand");
// out-of-turn
const turn0 = a.st.game.v.turn, off = players[(turn0 + 1) % 4];
await off.act({ a: "draw" }); ok(off.errs.some((m) => /turn/i.test(m)), "out-of-turn action refused over the wire");
// a spectator can't act
e.send({ t: "act", a: { a: "draw" } }); await settle(); ok(e.errs.some((m) => /watching/i.test(m)), "spectator can't act");

// reconnect mid-game: Chi drops, comes back with the same pid, same seat and same hand
const chiHand = myCards(c); c.close(); await until(() => a.st.members.find((m) => m.name === "Chi").online === false, 3000);
ok(a.st.members.find((m) => m.name === "Chi").online === false, "others see Chi go offline");
const c2 = new Client(code, "Chi", c.pid); await c2.connect(); await settle();
ok(c2.st.me.seat === 2 && myCards(c2) === chiHand, "reconnect keeps seat and hand");
players[2] = c2;

const bot = async (p) => {
  const v = p.st.game.v;
  if (v.over !== null) return false;
  // call/catch the last-card rule sometimes
  if (v.last && v.last.seat === p.st.game.seat && !v.last.called) p.send({ t: "act", a: { a: "call" } });
  if (v.turn !== p.st.game.seat) return true;
  if (v.pickShape) { await p.act({ a: "shape", s: E.whot.WSHAPES[E.rnd(5)] }); return true; }
  const okIdx = v.hand.map((card, i) => E.whot.playableCard(v, card) ? i : -1).filter((i) => i >= 0);
  if (okIdx.length && E.rnd(10)) await p.act({ a: "play", i: okIdx[E.rnd(okIdx.length)] }); else await p.act({ a: "draw" });
  return true;
};
let rounds = 0; const t0 = Date.now();
while (players[0].st.game.v.over === null && rounds++ < (FULL ? 4000 : 30) && Date.now() - t0 < 120000) {
  const turn = a.st.game.v.turn, cur = players[turn];                    // seats are 0..3 in join order
  await until(() => cur.st.game.v.turn === turn && cur.st.game.id === a.st.game.id);   // wait for that phone to catch up
  await bot(cur);
}
const over = a.st.game.v.over;
if (FULL) { ok(over !== null, "whot game finished over the wire"); await settle();
  const winnerName = a.st.game.names[over]; ok(a.st.members.find((m) => m.name === winnerName).wins === 1, "winner's tally is 1");
  ok(a.st.game.v.counts[over] === 0, "winner has no cards"); }
else ok(a.st.game.v.counts.reduce((x, y) => x + y, 0) + a.st.game.v.deckN + 1 <= 54 + 0, "whot card counts stay sane mid-game");

// ---- Ludo with 3 players
a.send({ t: "start", game: "ludo" }); await settle();
ok(a.st.game.kind === "ludo" && a.st.game.names.length === 4, "ludo starts for 4 seats");
let lr = 0; const l0 = Date.now();
while (a.st.game.v.over === null && lr++ < (FULL ? 20000 : 25) && Date.now() - l0 < 120000) {
  const v = a.st.game.v, p = players[v.turn];
  await until(() => p.st.game.v.turn === v.turn && p.st.game.v.dice === v.dice && p.st.game.id === a.st.game.id);
  if (v.dice === null) await p.act({ a: "roll" }); else await p.act({ a: "move", i: v.movable[E.rnd(v.movable.length)] });
}
if (FULL) ok(a.st.game.v.over !== null, "ludo finished over the wire");

// ---- Ayo (first two seats only)
a.send({ t: "start", game: "ayo" }); await settle();
ok(a.st.game.kind === "ayo" && a.st.game.names.length === 2, "ayo seats two players");
ok(c2.st.game.seat === -1, "third person watches ayo");
let ar = 0; const y0 = Date.now();
while (a.st.game.v.over === null && ar++ < (FULL ? 3000 : 20) && Date.now() - y0 < 120000) {
  const v = a.st.game.v, p = v.turn === 0 ? a : b, mv = E.ayo.moves(v);
  await until(() => p.st.game.v.turn === v.turn && p.st.game.id === a.st.game.id);
  await p.act({ a: "sow", i: mv[E.rnd(mv.length)] });
}
if (FULL) ok(a.st.game.v.over !== null, "ayo finished over the wire");
ok(a.st.game.v.p.reduce((x, y) => x + y, 0) + a.st.game.v.sc[0] + a.st.game.v.sc[1] === 48, "ayo seeds conserved");

// ---- voice call setup notes are relayed to the other phone, not echoed back, and oversize ones are dropped
{ const got = []; const sniff = b.ws.onmessage; b.ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.t === "sig") got.push(m.d); sniff(e); };
  a.send({ t: "sig", d: '{"k":"call"}' }); a.send({ t: "sig", d: "x".repeat(4000) }); await settle();
  ok(got.length === 1 && got[0] === '{"k":"call"}', "voice setup notes reach the other phone, oversize dropped"); }

// ---- reactions reach the other phone with the sender's name, and unknown emoji are dropped
{ const got = []; const sniff = b.ws.onmessage; b.ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.t === "react") got.push(m); sniff(e); };
  a.send({ t: "react", e: "🔥" }); a.send({ t: "react", e: "<script>" }); await settle();
  ok(got.length === 1 && got[0].e === "🔥" && got[0].n === a.name, "reaction relayed once with the sender's name"); }

// ---- host ends game
a.send({ t: "stop" }); await settle(); ok(a.st.game === null && b.st.game === null, "host ends the game for everyone");

// ---- message flood is throttled, the connection survives
if (!FULL) { const before = b.errs.length; await sleep(10500); for (let i = 0; i < 80; i++) b.send({ t: "act", a: { a: "draw" } }); await sleep(500);
  ok(b.errs.slice(before).some((m) => /slow down/i.test(m)), "message flood is throttled"); ok(b.ws.readyState === 1, "flooder isn't dropped, just slowed"); }

[a, b, c2, d, e].forEach((x) => x.close());

// ---- bursts of room creation hit the rate limit (generous: 20 a minute per address)
if (!process.env.SKIP_RATE) {
  const codes = await Promise.all(Array.from({ length: 40 }, () => fetch(`${BASE}/api/rooms`, { method: "POST" }).then((r) => r.status)));
  ok(codes.includes(429), "a burst of 40 room creations is rate limited (got " + [...new Set(codes)].join(",") + ")");
  ok(codes.filter((x) => x === 200).length >= 1, "some creations still succeed");
}

console.log(fails ? `${fails} FAILURES` : "ALL ROOM TESTS PASSED");
process.exit(fails ? 1 : 0);
