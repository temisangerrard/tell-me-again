/* Game engines: Ludo, Ayo (Oware) and Whot as pure state machines.
 * One file, two homes: the browser loads it as a classic script (for rendering helpers),
 * and the Cloudflare Worker imports it so every move is checked on the server.
 * State is plain JSON. act() mutates state and returns null, or an error string. view() is what a seat may see. */
(function () {
  const rnd = (n) => { const a = new Uint32Array(1), lim = 4294967296 - (4294967296 % n); let x; do { crypto.getRandomValues(a); x = a[0]; } while (x >= lim); return x % n; };
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  /* ---------------- Ludo ---------------- */
  const LOOP = [[1,6],[2,6],[3,6],[4,6],[5,6],[6,5],[6,4],[6,3],[6,2],[6,1],[6,0],[7,0],[8,0],[8,1],[8,2],[8,3],[8,4],[8,5],[9,6],[10,6],[11,6],[12,6],[13,6],[14,6],[14,7],[14,8],[13,8],[12,8],[11,8],[10,8],[9,8],[8,9],[8,10],[8,11],[8,12],[8,13],[8,14],[7,14],[6,14],[6,13],[6,12],[6,11],[6,10],[6,9],[5,8],[4,8],[3,8],[2,8],[1,8],[0,8],[0,7],[0,6]];
  const HOME = [[[1,7],[2,7],[3,7],[4,7],[5,7]], [[7,1],[7,2],[7,3],[7,4],[7,5]], [[13,7],[12,7],[11,7],[10,7],[9,7]], [[7,13],[7,12],[7,11],[7,10],[7,9]]];
  const START = [0, 13, 26, 39], SAFE = [0, 13, 26, 39, 8, 21, 34, 47];
  const canMove = (p, d) => p < 0 ? d === 6 : p + d <= 56;
  const ludoNext = (s, extra) => { if (!extra) s.turn = (s.turn + 1) % s.pl.length; s.dice = null; s.movable = []; };
  const ludo = {
    LOOP, HOME, START, SAFE,
    init(names) {
      const ks = names.length === 2 ? [0, 2] : names.length === 3 ? [0, 1, 2] : [0, 1, 2, 3];
      return { kind: "ludo", names: names.slice(), pl: ks.map((k) => ({ k, t: [-1, -1, -1, -1] })), turn: 0, dice: null, movable: [], last: null, over: null, msg: `${names[0]}, you're up. Roll a 6 to get a token out.` };
    },
    act(s, seat, a) {
      if (s.over !== null) return "The game is over.";
      if (seat !== s.turn) return "It's not your turn.";
      const p = s.pl[seat], name = s.names[seat];
      if (a.a === "roll") {
        if (s.dice !== null) return "Move a token first.";
        const d = 1 + rnd(6); s.last = { seat, d };
        const mv = p.t.map((q, i) => canMove(q, d) ? i : -1).filter((i) => i >= 0);
        if (!mv.length) { s.msg = `${name} rolled a ${d}. No move, pass it on.`; ludoNext(s, false); return null; }
        s.dice = d; s.movable = mv;
        if (mv.length === 1) return ludo.act(s, seat, { a: "move", i: mv[0] }); // only one option: make it
        s.msg = `${name} rolled a ${d}. Tap a token to move it.`; return null;
      }
      if (a.a === "move") {
        if (s.dice === null || !s.movable.includes(a.i)) return "That token can't move.";
        const d = s.dice, np = p.t[a.i] < 0 ? 0 : p.t[a.i] + d; p.t[a.i] = np; let hit = null;
        if (np <= 50) {
          const abs = (START[p.k] + np) % 52;
          if (!SAFE.includes(abs)) s.pl.forEach((o, oi) => { if (oi !== seat) o.t.forEach((q, j) => { if (q >= 0 && q <= 50 && (START[o.k] + q) % 52 === abs) { o.t[j] = -1; hit = s.names[oi]; } }); });
        }
        const home = np === 56;
        if (p.t.every((q) => q === 56)) { s.over = seat; s.dice = null; s.movable = []; s.msg = `${name} is home first!`; return null; }
        const extra = d === 6 || !!hit || home;
        s.msg = (hit ? `${name} sent ${hit} back to start.` : home ? `${name} got one home.` : `${name} moved ${d}.`) + (extra ? " Roll again." : "");
        ludoNext(s, extra); return null;
      }
      return "Unknown move.";
    },
    // A bot's next action for this seat, or null if it has none. Plays the legal move a sensible player would.
    bot(s, seat) {
      if (s.over !== null || s.turn !== seat) return null;
      if (s.dice === null) return { a: "roll" };
      const p = s.pl[seat], d = s.dice; let best = s.movable[0], bs = -1e9;
      for (const i of s.movable) {
        const q = p.t[i], np = q < 0 ? 0 : q + d; let sc = np / 2 + rnd(5) * 0.1;
        if (np === 56) sc += 100;
        if (q < 0) sc += 40; // get out of the base
        if (np <= 50) {
          const abs = (START[p.k] + np) % 52;
          if (SAFE.includes(abs)) sc += 15;
          else s.pl.forEach((o, oi) => { if (oi === seat) return; o.t.forEach((x) => {
            if (x < 0 || x > 50) return; const at = (START[o.k] + x) % 52;
            if (at === abs) sc += 80;                                  // a capture
            const behind = (abs - at + 52) % 52; if (behind >= 1 && behind <= 6) sc -= 12; // an opponent can hit us there
          }); });
        }
        if (q >= 0 && q <= 50 && np > 50) sc += 10; // into the home column
        if (sc > bs) { bs = sc; best = i; }
      }
      return { a: "move", i: best };
    },
    view: (s) => s
  };

  /* ---------------- Ayo (Oware) ---------------- */
  // 12 pits, 4 seeds each. Pits 0-5 belong to player 1 (left to right along the bottom), 6-11 to player 2 (right to left along the top).
  const ASIDE = (t) => t === 0 ? [0, 1, 2, 3, 4, 5] : [6, 7, 8, 9, 10, 11];
  function ayoEnd(s) {
    const w = s.sc[0] === s.sc[1] ? null : s.sc[0] > s.sc[1] ? 0 : 1; s.over = w === null ? "draw" : w;
    s.msg = w === null ? "A draw." : `${s.names[w]} wins, ${s.sc[w]} to ${s.sc[1 - w]}.`; return null;
  }
  const ayo = {
    ASIDE,
    moves(s) {
      const mine = ASIDE(s.turn), opp = ASIDE(1 - s.turn); let m = mine.filter((i) => s.p[i] > 0);
      if (opp.every((i) => s.p[i] === 0)) m = m.filter((i) => s.turn === 0 ? i + s.p[i] >= 6 : i + s.p[i] >= 12); // you must give them seeds
      return m;
    },
    init(names) { return { kind: "ayo", names: names.slice(0, 2), p: Array(12).fill(4), sc: [0, 0], turn: 0, over: null, msg: `${names[0]}, your move.`, last: null, seen: {} }; },
    act(s, seat, a) {
      if (s.over !== null) return "The game is over.";
      if (seat !== s.turn) return "It's not your turn.";
      if (a.a !== "sow" || !ayo.moves(s).includes(a.i)) return "That pit can't be played.";
      let n = s.p[a.i], c = a.i; s.p[a.i] = 0; const steps = [];
      while (n > 0) { c = (c + 1) % 12; if (c === a.i) continue; s.p[c]++; steps.push(c); n--; }
      const opp = ASIDE(1 - s.turn); let caps = [], x = c;
      if (opp.includes(c)) {
        while (opp.includes(x) && (s.p[x] === 2 || s.p[x] === 3)) { caps.push(x); x = (x + 11) % 12; }
        if (caps.length && opp.every((o) => caps.includes(o) || s.p[o] === 0)) caps = []; // never capture every seed on their side
      }
      let got = 0; caps.forEach((o) => { got += s.p[o]; s.p[o] = 0; }); s.sc[s.turn] += got;
      const t = s.turn; s.last = { seat: t, pit: a.i, steps, caps, got };
      if (s.sc[0] > 24 || s.sc[1] > 24) return ayoEnd(s);
      s.turn = 1 - t;
      if (!ayo.moves(s).length) { [0, 1].forEach((q) => ASIDE(q).forEach((i) => { s.sc[q] += s.p[i]; s.p[i] = 0; })); return ayoEnd(s); }
      if (got) s.seen = {}; // a capture makes every earlier position unreachable
      const key = s.p.join(",") + "|" + s.turn; s.seen[key] = (s.seen[key] || 0) + 1;
      if (s.seen[key] >= 3) { // the same position a third time: each player keeps the seeds on their own side
        [0, 1].forEach((q) => ASIDE(q).forEach((i) => { s.sc[q] += s.p[i]; s.p[i] = 0; })); ayoEnd(s);
        s.msg = "The same position came up three times, so each player keeps the seeds on their side. " + s.msg; return null;
      }
      s.msg = (got ? `${s.names[t]} captured ${got}. ` : "") + `${s.names[s.turn]}, your move.`; return null;
    },
    // Look one move ahead: take what it captures, minus the most the other side could capture back.
    bot(s, seat) {
      if (s.over !== null || s.turn !== seat) return null;
      const mv = ayo.moves(s); if (!mv.length) return null;
      const copy = (x) => JSON.parse(JSON.stringify(x)); let best = mv[0], bs = -1e9;
      for (const i of mv) {
        const c = copy(s); if (ayo.act(c, seat, { a: "sow", i })) continue;
        let sc = (c.sc[seat] - s.sc[seat]) * 3 + (c.over === null ? 0 : c.over === seat ? 100 : c.over === "draw" ? 0 : -100);
        if (c.over === null) { let worst = 0; for (const j of ayo.moves(c)) { const d = copy(c); if (ayo.act(d, 1 - seat, { a: "sow", i: j })) continue; worst = Math.max(worst, d.sc[1 - seat] - c.sc[1 - seat]); } sc -= worst * 2.2; }
        sc += s.p[i] * 0.05 + rnd(10) * 0.01;
        if (sc > bs) { bs = sc; best = i; }
      }
      return { a: "sow", i: best };
    },
    view: (s) => s
  };

  /* ---------------- Whot ---------------- */
  // 54 cards: five shapes plus five Whot (20) wilds. Card powers are fixed everywhere; house rules (R) vary by family.
  const WSHAPES = ["circle", "triangle", "cross", "square", "star"];
  const WNUMS = { circle: [1,2,3,4,5,7,8,10,11,12,13,14], triangle: [1,2,3,4,5,7,8,10,11,12,13,14], cross: [1,2,3,5,7,10,11,13,14], square: [1,2,3,5,7,10,11,13,14], star: [1,2,3,4,5,7,8] };
  const POWER = [1, 2, 5, 8, 14, 20];
  const DEFAULT_R = { stack: false, pickSkips: true, marketAgain: true, noPowerFinish: false, whotBlock: false, passSuspend: false, lastCard: false, hand: 0 };
  const wpl = (sh) => sh === "cross" ? "crosses" : sh + "s"; // cross -> crosses
  const wname = (c) => c.s === "whot" ? "Whot" : `${c.n} of ${wpl(c.s)}`;
  // v is anything with { R, pend, susp, top, shape, handN }: the server's state or a seat's view
  function playableCard(v, c) {
    if (v.susp) return c.s !== "whot" && c.n === 8;
    if (v.pend) return (v.R.stack && c.s !== "whot" && c.n === v.pend.num) || (v.R.whotBlock && c.s === "whot");
    if (v.R.noPowerFinish && v.handN === 1 && POWER.includes(c.n)) return false;
    return c.s === "whot" || c.s === v.shape || c.n === v.top.n;
  }
  function wdraw(s, seat, k) {
    let got = 0;
    for (let i = 0; i < k; i++) {
      if (!s.deck.length && s.disc.length > 1) { const keep = s.disc.pop(); s.deck = shuffle(s.disc); s.disc = [keep]; }
      if (!s.deck.length) break; s.hands[seat].push(s.deck.pop()); got++;
    }
    return got;
  }
  const wadvance = (s, k) => { s.turn = (s.turn + k) % s.names.length; if (s.last && s.last.seat === s.turn) s.last = null; };
  const whot = {
    WSHAPES, WNUMS, POWER, DEFAULT_R, wname, wpl, playableCard,
    init(names, R) {
      R = { ...DEFAULT_R, ...(R || {}) }; const n = names.length, deck = [];
      WSHAPES.forEach((sh) => WNUMS[sh].forEach((x) => deck.push({ s: sh, n: x }))); for (let i = 0; i < 5; i++) deck.push({ s: "whot", n: 20 });
      shuffle(deck);
      const size = R.hand || (n === 2 ? 6 : 5), hands = names.map(() => deck.splice(0, size));
      let top; const tmp = [];
      while ((top = deck.shift()) && POWER.includes(top.n)) tmp.push(top);
      deck.push(...tmp);
      return { kind: "whot", R, names: names.slice(), hands, deck, disc: [top], top, shape: top.s, turn: 0, pend: null, susp: false, pickShape: false, last: null, over: null, msg: "Cards are dealt." };
    },
    act(s, seat, a) {
      if (s.over !== null) return "The game is over.";
      const R = s.R, me = s.hands[seat], nm = s.names[seat], n = s.names.length, nx = (seat + 1) % n, nxn = s.names[nx];
      if (a.a === "call") { if (!s.last || s.last.seat !== seat) return "Nothing to call."; s.last.called = true; s.msg = `${nm} called last card!`; return null; }
      if (a.a === "catch") {
        if (!R.lastCard || !s.last || s.last.seat === seat) return "Nothing to catch.";
        const v = s.last.seat;
        if (!s.last.called) { const g = wdraw(s, v, 2); s.msg = `Caught! ${s.names[v]} didn't call last card and picks ${g}.`; }
        else { const g = wdraw(s, seat, 1); s.msg = `False alarm. ${s.names[v]} did call it, so ${nm} picks ${g}.`; }
        s.last = null; return null;
      }
      if (seat !== s.turn) return "It's not your turn.";
      if (a.a === "shape") {
        if (!s.pickShape || !WSHAPES.includes(a.s)) return "Nothing to call.";
        s.shape = a.s; s.pickShape = false; s.msg = `${nm} played Whot and called ${wpl(a.s)}.`; wadvance(s, 1); return null;
      }
      if (s.pickShape) return "Call a shape first.";
      if (a.a === "draw") {
        if (s.susp) { s.susp = false; s.msg = `${nm} is suspended and misses a turn.`; wadvance(s, 1); return null; }
        if (s.pend) {
          const g = wdraw(s, seat, s.pend.total); s.pend = null; s.msg = `${nm} picked up ${g}.`;
          if (R.pickSkips) wadvance(s, 1); else s.msg += " Play on."; return null;
        }
        const g = wdraw(s, seat, 1); s.msg = `${nm} picked from the market${g ? "" : " (it was empty)"}.`; wadvance(s, 1); return null;
      }
      if (a.a === "play") {
        const c = me[a.i]; if (!c) return "No such card.";
        if (!playableCard({ R, pend: s.pend, susp: s.susp, top: s.top, shape: s.shape, handN: me.length }, c)) return "That card can't be played now.";
        me.splice(a.i, 1); s.disc.push(c); s.top = c;
        if (!me.length) { s.over = seat; s.msg = `${nm} wins!`; return null; }
        if (R.lastCard && me.length === 1) s.last = { seat, called: false };
        if (c.s === "whot") { if (s.pend) { s.pend = null; s.msg = `${nm} cancelled the pick with a Whot.`; } s.pickShape = true; return null; }
        s.shape = c.s;
        switch (c.n) {
          case 1: s.msg = `${nm} played a 1: hold on, go again.`; break;
          case 14:
            s.names.forEach((_, k) => { if (k !== seat) wdraw(s, k, 1); });
            if (R.marketAgain) s.msg = `${nm} played a 14: general market. Everyone else picks one, then ${nm} goes again.`;
            else { s.msg = `${nm} played a 14: general market. Everyone else picks one.`; wadvance(s, 1); }
            break;
          case 2: case 5: {
            const add = c.n === 2 ? 2 : 3;
            if (R.stack || R.whotBlock) {
              s.pend = { num: c.n, total: (s.pend ? s.pend.total : 0) + add };
              s.msg = `${nm} played a ${c.n}. ${nxn} ${[R.stack ? `stacks a ${c.n}` : "", R.whotBlock ? "plays a Whot" : ""].filter(Boolean).join(", ")} or picks ${s.pend.total}.`; wadvance(s, 1);
            } else { const g = wdraw(s, nx, add); s.msg = `${nm} played a ${c.n}. ${nxn} picks ${g}${R.pickSkips ? " and misses a turn" : ""}.`; wadvance(s, R.pickSkips ? 2 : 1); }
            break;
          }
          case 8:
            if (R.passSuspend) { s.susp = true; s.msg = `${nm} played an 8. ${nxn} is suspended, unless they play an 8 too.`; wadvance(s, 1); }
            else { s.msg = `${nm} played an 8. ${nxn} is suspended.`; wadvance(s, 2); }
            break;
          default: s.msg = `${nm} played ${wname(c)}.`; wadvance(s, 1);
        }
        return null;
      }
      return "Unknown move.";
    },
    // A bot never looks at anyone else's hand. It always says "last card" when it should.
    bot(s, seat) {
      if (s.over !== null) return null;
      const R = s.R, me = s.hands[seat];
      if (R.lastCard && s.last && s.last.seat === seat && !s.last.called) return { a: "call" };
      if (s.turn !== seat) return null;
      if (s.pickShape) { const n = {}; me.forEach((c) => { if (c.s !== "whot") n[c.s] = (n[c.s] || 0) + 1; }); return { a: "shape", s: WSHAPES.slice().sort((a, b) => (n[b] || 0) - (n[a] || 0) || rnd(3) - 1)[0] }; }
      const v = { R, pend: s.pend, susp: s.susp, top: s.top, shape: s.shape, handN: me.length };
      let best = -1, bs = -1e9;
      me.forEach((c, i) => {
        if (!playableCard(v, c)) return;
        let sc = rnd(10) * 0.1 + me.filter((x) => x.s === c.s).length * 0.8;
        if (c.s === "whot") sc += me.length === 1 ? 0 : -6; // keep wilds back
        else if (c.n === 14) sc += 4; else if (c.n === 2 || c.n === 5) sc += 5; else if (c.n === 8) sc += 3; else if (c.n === 1) sc += 2;
        if (me.length === 1) sc += 100;
        if (sc > bs) { bs = sc; best = i; }
      });
      return best >= 0 ? { a: "play", i: best } : { a: "draw" };
    },
    // What one seat may see: their own hand, everyone's card counts, never the market or other hands.
    view(s, seat) {
      const mine = seat >= 0 ? s.hands[seat] : [];
      return { kind: "whot", R: s.R, names: s.names, turn: s.turn, top: s.top, shape: s.shape, pend: s.pend, susp: s.susp, pickShape: s.pickShape,
        last: s.last, over: s.over, msg: s.msg, deckN: s.deck.length, counts: s.hands.map((h) => h.length), hand: mine, handN: mine.length };
    }
  };

  globalThis.Engines = { ludo, ayo, whot, rnd, shuffle };
})();
