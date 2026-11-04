import "../engines.js";
const E = globalThis.Engines; const pickR = (a) => a[E.rnd(a.length)];
let fails = 0; const fail = (m) => { fails++; console.log("FAIL", m); };

// ---- Ludo
for (const n of [2, 3, 4]) for (let g = 0; g < 40; g++) {
  const s = E.ludo.init(Array.from({ length: n }, (_, i) => "P" + i)); let steps = 0;
  while (s.over === null && steps++ < 20000) {
    const seat = s.turn;
    // a non-turn seat must always be rejected
    if (E.ludo.act(s, (seat + 1) % n, { a: "roll" }) === null) fail("ludo accepted out-of-turn");
    if (s.dice === null) { const e = E.ludo.act(s, seat, { a: "roll" }); if (e) fail("ludo roll err " + e); }
    else { const e = E.ludo.act(s, seat, { a: "move", i: pickR(s.movable) }); if (e) fail("ludo move err " + e); }
    for (const p of s.pl) for (const q of p.t) if (q < -1 || q > 56) fail("ludo range " + q);
  }
  if (s.over === null) fail("ludo unfinished n=" + n);
  if (E.ludo.act(s, s.over, { a: "roll" }) === null) fail("ludo accepted after over");
}
console.log("ludo ok");

// ---- Ayo
let draws = 0, caps = 0;
for (let g = 0; g < 300; g++) {
  const s = E.ayo.init(["A", "B"]); let steps = 0;
  while (s.over === null && steps++ < 3000) {
    const m = E.ayo.moves(s);
    if (E.ayo.act(s, 1 - s.turn, { a: "sow", i: m[0] }) === null) fail("ayo accepted out-of-turn");
    const illegal = [0,1,2,3,4,5,6,7,8,9,10,11].find((i) => !m.includes(i)); if (illegal !== undefined && E.ayo.act(s, s.turn, { a: "sow", i: illegal }) === null) fail("ayo accepted illegal pit");
    const before = s.sc[0] + s.sc[1];
    const e = E.ayo.act(s, s.turn, { a: "sow", i: pickR(m) }); if (e) fail("ayo err " + e);
    if (s.sc[0] + s.sc[1] > before) caps++;
    if (s.p.reduce((a, b) => a + b, 0) + s.sc[0] + s.sc[1] !== 48) { fail("ayo seeds"); break; }
  }
  if (s.over === null) fail("ayo unfinished"); if (s.over === "draw") draws++;
}
console.log("ayo ok; draws", draws, "capture events", caps);

// ---- Whot
const combos = [{}, { stack: true }, { whotBlock: true }, { passSuspend: true }, { lastCard: true }, { noPowerFinish: true, hand: 4 }, { stack: true, whotBlock: true, passSuspend: true, lastCard: true, pickSkips: false, marketAgain: false, hand: 7 }];
for (const R of combos) for (const n of [2, 3, 4]) for (let g = 0; g < 12; g++) {
  const s = E.whot.init(Array.from({ length: n }, (_, i) => "P" + i), R); let steps = 0, hidden = true;
  const total = () => s.hands.reduce((a, h) => a + h.length, 0) + s.deck.length + s.disc.length;
  while (s.over === null && steps++ < 8000) {
    const seat = s.turn;
    if (E.whot.act(s, (seat + 1) % n, { a: "draw" }) === null) fail("whot accepted out-of-turn draw");
    if (s.pickShape) { const e = E.whot.act(s, seat, { a: "shape", s: pickR(E.whot.WSHAPES) }); if (e) fail("shape err " + e); }
    else {
      const v = E.whot.view(s, seat);
      if (JSON.stringify(v).includes('"deck"') || v.hands) hidden = false;
      for (let k = 0; k < n; k++) if (k !== seat && JSON.stringify(E.whot.view(s, seat)).length > 0 && E.whot.view(s, seat).hand === s.hands[k]) hidden = false;
      const ok = s.hands[seat].map((c, i) => E.whot.playableCard({ R: s.R, pend: s.pend, susp: s.susp, top: s.top, shape: s.shape, handN: s.hands[seat].length }, c) ? i : -1).filter((i) => i >= 0);
      // an unplayable card must be rejected
      const bad = s.hands[seat].findIndex((c, i) => !ok.includes(i)); if (bad >= 0 && E.whot.act(s, seat, { a: "play", i: bad }) === null) fail("whot accepted unplayable " + JSON.stringify(R));
      // last-card interplay
      if (s.last && E.rnd(2)) E.whot.act(s, s.last.seat, { a: "call" });
      if (s.last && E.rnd(3) === 0) { const c = (s.last.seat + 1) % n; E.whot.act(s, c, { a: "catch" }); }
      const e = ok.length && E.rnd(10) ? E.whot.act(s, s.turn, { a: "play", i: pickR(ok) }) : E.whot.act(s, s.turn, { a: "draw" }); if (e) fail("whot err " + e + " " + JSON.stringify(R));
    }
    if (total() !== 54) { fail("whot cards " + total() + " " + JSON.stringify(R)); break; }
    // only a win by emptying the hand counts; a game that ends because the market ran out can leave any card on top
    if (R.noPowerFinish && s.over !== null && s.over !== "draw" && s.hands[s.over].length === 0 && E.whot.POWER.includes(s.top.n)) fail("whot finished on power card");
  }
  if (!hidden) fail("whot view leaked");
  if (s.over === null) fail("whot unfinished " + JSON.stringify(R) + " n=" + n);
}
console.log("whot ok");
console.log(fails ? fails + " FAILURES" : "ALL ENGINE TESTS PASSED");
process.exit(fails ? 1 : 0);
