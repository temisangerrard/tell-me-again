"use strict";
// Whot
/* ---------- Whot ---------- */
// 54 cards: five shapes plus five Whot (20) wilds. The card powers are the same in every home (WFIXED).
// Everything else varies by household, so families set their own house rules (WHOUSE) before dealing.
// Hands are hidden: pass the phone, and each player taps through a gate before seeing their cards.
const WSHAPES = ["circle", "triangle", "cross", "square", "star"];
const WNUMS = { circle: [1,2,3,4,5,7,8,10,11,12,13,14], triangle: [1,2,3,4,5,7,8,10,11,12,13,14], cross: [1,2,3,5,7,10,11,13,14], square: [1,2,3,5,7,10,11,13,14], star: [1,2,3,4,5,7,8] };
const WSVG = {
  circle: `<circle cx="12" cy="12" r="9.5"/>`, triangle: `<polygon points="12,2.5 22.5,21 1.5,21"/>`, cross: `<path d="M9 2h6v7h7v6h-7v7H9v-7H2V9h7z"/>`,
  square: `<rect x="3" y="3" width="18" height="18" rx="2"/>`, star: `<polygon points="12,1.5 14.9,8.4 22.4,9 16.7,13.9 18.5,21.2 12,17.3 5.5,21.2 7.3,13.9 1.6,9 9.1,8.4"/>`
};
const wsvg = (sh) => `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${WSVG[sh]}</svg>`;
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const wpl = (sh) => sh === "cross" ? "crosses" : sh + "s";
const wname = (c) => c.s === "whot" ? "Whot" : `${c.n} of ${wpl(c.s)}`;
const WFIXED = [
  ["Match", "Play a card of the same shape or the same number as the one on top."],
  ["1", "Hold on. Play again."],
  ["2", "Pick two. The next player picks two cards."],
  ["5", "Pick three. The next player picks three cards."],
  ["8", "Suspension. The next player misses a turn."],
  ["14", "General market. Everyone else picks one card."],
  ["20", "Whot. Play it on anything, then call the shape you want."],
  ["Win", "Be first to empty your hand. If the market runs out, the discards are shuffled back in. If there still aren't enough cards to pick up, the game ends and the fewest cards wins."]
];
const WHOUSE = [
  ["stack", "Stack the pick cards", "Answer a 2 with another 2, or a 5 with another 5, and the penalty adds up. Whoever can't match picks the lot."],
  ["pickSkips", "Pick, then miss a turn", "Whoever picks up after a 2 or a 5 also loses their go."],
  ["marketAgain", "Go again after a 14", "Everyone else picks one card, then you play again."],
  ["noPowerFinish", "No finishing on a power card", "Your last card can't be a 1, 2, 5, 8, 14 or Whot. You pick one instead."],
  ["whotBlock", "Whot cancels a pick", "Face a pick two or pick three? Play a Whot and you pick nothing."],
  ["passSuspend", "Pass a suspension on", "Suspended by an 8? Play another 8 and the next player is suspended instead."],
  ["lastCard", "Call \"Last card\"", "Down to one card? Say so. If you forget and the next player catches you, you pick two. A false alarm costs them one."]
];
const WPOWER = [1, 2, 5, 8, 14, 20];
let whot = null;
function whotRulesList(R) {
  return `<ul class="fixed">${WFIXED.map(([k, t]) => `<li><b>${k}</b><span>${t}</span></li>`).join("")}</ul>
    <h2 class="sec" style="margin-top:24px">House rules</h2><ul class="fixed">${WHOUSE.map(([k, t]) => `<li><b style="font-size:1rem;color:${R[k] ? "var(--accent)" : "var(--muted)"}">${R[k] ? "On" : "Off"}</b><span>${t}</span></li>`).join("")}<li><b style="font-size:1rem;color:var(--accent)">${R.hand || "Auto"}</b><span>Cards each to start${R.hand ? "" : " (6 for two players, 5 for more)"}.</span></li></ul>`;
}
function whotRuleRows(box) { // the switches and hand-size chips; they edit this device's saved house rules
  const R = S.whotRules;
  WHOUSE.forEach(([k, t, d]) => {
    const row = $(`<div class="rule"><div class="t"><b>${t}</b><span>${d}</span></div><button class="tg" type="button" role="switch" aria-label="${t}" aria-checked="${R[k]}"></button></div>`);
    const sw = row.querySelector(".tg"); sw.onclick = () => { R[k] = !R[k]; sw.setAttribute("aria-checked", R[k]); save(); };
    box.append(row);
  });
  const hs = $(`<div class="rule" style="display:block"><div class="t"><b>Cards each to start</b><span>Auto deals 6 to two players and 5 to more.</span></div><div class="chips" role="group" aria-label="Cards each"></div></div>`);
  [[0, "Auto"], [4, "4"], [5, "5"], [6, "6"], [7, "7"]].forEach(([v, l]) => { const c = $(`<button class="chip" type="button" aria-pressed="${R.hand === v}">${l}</button>`);
    c.onclick = () => { R.hand = v; save(); hs.querySelectorAll(".chip").forEach((x) => x.setAttribute("aria-pressed", x === c)); }; hs.querySelector(".chips").append(c); });
  box.append(hs);
}
function whotSetup(box) {
  lastGame = null;
  box.replaceChildren(backGames(box), $(`<h1 class="title">Whot</h1>`), );
  box.append($(`<h2 class="sec">Same everywhere</h2>`), $(`<ul class="fixed">${WFIXED.map(([k, t]) => `<li><b>${k}</b><span>${t}</span></li>`).join("")}</ul>`));
  box.append($(`<h2 class="sec">Your house rules</h2>`));
  whotRuleRows(box);
  const go2 = $(`<button class="cta" type="button" style="margin-top:24px">Deal the cards</button>`); go2.onclick = () => { newWhot(); renderWhot(box); }; box.append(go2);
  const lb = leaderboard(); if (lb) box.append(lb);
}
function newWhot() {
  const n = Math.min(4, Math.max(2, S.seats.length)), R = { ...S.whotRules }, deck = [];
  WSHAPES.forEach((s) => WNUMS[s].forEach((x) => deck.push({ s, n: x }))); for (let i = 0; i < 5; i++) deck.push({ s: "whot", n: 20 });
  shuffle(deck);
  const size = R.hand || (n === 2 ? 6 : 5);
  const pl = Array.from({ length: n }, (_, i) => ({ name: S.seats[i] || "Player", hand: deck.splice(0, size) }));
  let top; const tmp = [];
  while ((top = deck.shift()) && WPOWER.includes(top.n)) tmp.push(top);
  deck.push(...tmp);
  whot = { R, pl, deck, disc: [top], top, shape: top.s, turn: 0, gate: true, pickShape: false, pend: null, susp: false, callFor: null, last: null, over: null, msg: "Cards are dealt." };
}
function wdraw(g, p, k) { // draw k cards, reshuffling the discards if the market runs dry
  let got = 0;
  for (let i = 0; i < k; i++) {
    if (!g.deck.length && g.disc.length > 1) { const keep = g.disc.pop(); g.deck = shuffle(g.disc); g.disc = [keep]; }
    if (!g.deck.length) break; p.hand.push(g.deck.pop()); got++;
  }
  return got;
}
function renderWhot(box) {
  const g = whot, R = g.R; lastGame = "whot";
  box.replaceChildren(backGames(box), $(`<h1 class="title">Whot</h1>`));
  const el = $(`<div class="whot"><div id="stage"></div><div class="ask" id="ask"></div><div id="lbbox"></div>
    <p class="note">Hands stay hidden between turns: pass the phone, and tap through the gate before you look. Once rooms go live, everyone gets their own screen.</p></div>`);
  box.append(el); askStrip(el.querySelector("#ask"));
  const stage = el.querySelector("#stage");
  const showLb = () => { const l = leaderboard(), b = el.querySelector("#lbbox"); b.replaceChildren(...(l ? [l] : [])); }; showLb();
  const cardEl = (c, cls = "", tag = "button") => {
    const inner = c.s === "whot" ? `<span class="n">20</span><b>WHOT</b><span class="n b">20</span>` : `<span class="n">${c.n}</span>${wsvg(c.s)}<span class="n b">${c.n}</span>`;
    return $(`<${tag} class="wc ${c.s} ${cls}" ${tag === "button" ? 'type="button"' : ""} aria-label="${wname(c)}">${inner}</${tag}>`);
  };
  const advance = (k) => {
    if (R.lastCard && g.pl[g.turn].hand.length === 1) g.callFor = g.turn; // they must say it before passing the phone
    g.turn = (g.turn + k) % g.pl.length; g.gate = true;
  };
  const nameOf = (i) => g.pl[i % g.pl.length].name;
  const playable = (c) => {
    const cur = g.pl[g.turn];
    if (g.susp) return c.s !== "whot" && c.n === 8;                        // facing a suspension: pass it on with another 8
    if (g.pend) return (R.stack && c.s !== "whot" && c.n === g.pend.num) || (R.whotBlock && c.s === "whot"); // facing a pick: stack it, or cancel it with a Whot
    if (R.noPowerFinish && cur.hand.length === 1 && WPOWER.includes(c.n)) return false;
    return c.s === "whot" || c.s === g.shape || c.n === g.top.n;
  };
  function play(i) {
    const p = g.pl[g.turn], c = p.hand[i]; if (!c || !playable(c)) return;
    feel.card();
    p.hand.splice(i, 1); g.disc.push(c); g.top = c;
    if (!p.hand.length) { g.over = p; paint(); recordWin(p.name); showLb(); celebrate(el); feel.win(); return; }
    if (c.s === "whot") { if (g.pend) { g.pend = null; g.msg = `${p.name} cancelled the pick with a Whot.`; } g.pickShape = true; paint(); return; }
    g.shape = c.s;
    const nx = (g.turn + 1) % g.pl.length;
    switch (c.n) {
      case 1: g.msg = `${p.name} played a 1: hold on, go again.`; paint(); break;
      case 14:
        g.pl.forEach((o, k) => { if (k !== g.turn) wdraw(g, o, 1); });
        if (R.marketAgain) { g.msg = `${p.name} played a 14: general market. Everyone else picks one, then ${p.name} goes again.`; paint(); }
        else { g.msg = `${p.name} played a 14: general market. Everyone else picks one.`; advance(1); paint(); }
        break;
      case 2: case 5: {
        const add = c.n === 2 ? 2 : 3;
        if (R.stack || R.whotBlock) { g.pend = { num: c.n, total: (g.pend ? g.pend.total : 0) + add }; g.msg = `${p.name} played a ${c.n}. ${nameOf(nx)} ${R.stack ? `stacks a ${c.n}` : ""}${R.stack && R.whotBlock ? ", " : ""}${R.whotBlock ? "plays a Whot" : ""}${R.stack || R.whotBlock ? " or" : ""} picks ${g.pend.total}.`; advance(1); }
        else { const got = wdraw(g, g.pl[nx], add); g.msg = `${p.name} played a ${c.n}. ${nameOf(nx)} picks ${got}${R.pickSkips ? " and misses a turn" : ""}.`; advance(R.pickSkips ? 2 : 1); }
        paint(); break;
      }
      case 8:
        if (R.passSuspend) { g.susp = true; g.msg = `${p.name} played an 8. ${nameOf(nx)} is suspended, unless they play an 8 too.`; advance(1); }
        else { g.msg = `${p.name} played an 8. ${nameOf(nx)} is suspended.`; advance(2); }
        paint(); break;
      default: g.msg = `${p.name} played ${wname(c)}.`; advance(1); paint();
    }
  }
  function paint() {
    stage.replaceChildren();
    if (g.over) {
      stage.append($(`<div class="win"><b>${esc(g.over.name)} wins</b><button class="btn" type="button">Play again</button></div>`));
      stage.querySelector(".btn").onclick = () => whotSetup(box); return;
    }
    if (g.callFor !== null) { // the player who just went down to one card: say it, or pass the phone and hope
      const who = g.pl[g.callFor];
      const pr = $(`<div class="gate"><b>${esc(who.name)}, one card left</b><p>Say it out loud, then tap. Or pass the phone and see if anyone notices.</p><button class="cta" type="button" data-c="1">Last card!</button><button class="btn" type="button" data-c="0" style="width:100%;margin-top:8px">Pass the phone</button></div>`);
      pr.querySelectorAll("button").forEach((b) => b.onclick = () => { g.last = { idx: g.callFor, called: b.dataset.c === "1" }; g.callFor = null; paint(); });
      stage.append(pr); pr.querySelector("button").focus({ preventScroll: true }); return;
    }
    const cur = g.pl[g.turn];
    const sc = $(`<div class="scores" aria-label="Cards in hand">${g.pl.map((p, i) => `<span class="${i === g.turn ? "on" : ""}">${esc(p.name)} · ${p.hand.length}</span>`).join("")}<button class="btn rulebtn" type="button">Rules</button></div>`);
    sc.querySelector(".rulebtn").onclick = () => { const b = $(`<div><h2>The rules</h2>${whotRulesList(R)}</div>`); b.append(closeBtn(sheet("Whot rules", b))); };
    stage.append(sc);
    if (g.gate) {
      const gt = $(`<div class="gate"><b>Pass to ${esc(cur.name)}</b><p>${esc(g.msg)}</p><button class="cta" type="button">I'm ${esc(cur.name)}</button></div>`);
      gt.querySelector("button").onclick = () => { g.gate = false; if (g.last && g.last.idx === g.turn) g.last = null; paint(); };
      if (R.lastCard && g.last && g.last.idx !== g.turn && g.pl[g.last.idx].hand.length === 1) { // anyone can claim; a wrong claim costs a card
        const cb = $(`<button class="btn" type="button" style="width:100%;margin-top:8px">${esc(g.pl[g.last.idx].name)} has one card. Catch them?</button>`);
        cb.onclick = () => { const v = g.pl[g.last.idx];
          if (!g.last.called) { const n = wdraw(g, v, 2); g.msg = `Caught! ${v.name} didn't call last card and picks ${n}.`; }
          else { const n = wdraw(g, cur, 1); g.msg = `False alarm. ${v.name} did call it, so ${cur.name} picks ${n}.`; }
          g.last = null; paint(); };
        gt.append(cb);
      }
      stage.append(gt); gt.querySelector(".cta").focus({ preventScroll: true }); return;
    }
    const piles = $(`<div class="piles"></div>`);
    const label = g.susp ? "Miss turn" : g.pend ? `Pick ${g.pend.total}` : "Pick";
    const dr = $(`<button class="wc back" type="button" aria-label="${g.susp ? "Miss your turn" : g.pend ? `Pick up ${g.pend.total} cards` : "Pick from the market"}, ${g.deck.length} cards left">${label}<small>${g.susp ? "suspended" : g.deck.length + " left"}</small></button>`);
    dr.onclick = () => {
      if (g.pickShape) return;
      feel.card();
      if (g.susp) { g.susp = false; g.msg = `${cur.name} is suspended and misses a turn.`; advance(1); paint(); return; }
      if (g.pend) { const got = wdraw(g, cur, g.pend.total); g.pend = null; g.msg = `${cur.name} picked up ${got}.`; if (R.pickSkips) advance(1); else g.msg += " Play on."; paint(); return; }
      const n = wdraw(g, cur, 1); g.msg = `${cur.name} picked from the market${n ? "" : " (it was empty)"}.`; advance(1); paint();
    };
    piles.append(dr, cardEl(g.top, "big", "div"));
    const need = g.susp ? "Play an 8 to pass it on, or miss your turn" : g.pend ? `${[R.stack ? `stack a ${g.pend.num}` : "", R.whotBlock ? "play a Whot" : ""].filter(Boolean).join(", ")} or pick ${g.pend.total}`.replace(/^./, (ch) => ch.toUpperCase()) : `Play a ${g.shape} or a ${g.top.s === "whot" ? "Whot" : g.top.n}`;
    stage.append(piles, $(`<div style="text-align:center"><span class="need ${g.shape}">${wsvg(g.shape)}${need}</span></div>`),
      $(`<p class="hint" style="text-align:center;margin-top:10px" role="status">${esc(g.msg)}</p>`));
    if (g.pickShape) {
      const w = $(`<div><p class="lbl" style="margin-top:20px">Whot! Call a shape</p><div class="shapes" role="group" aria-label="Call a shape">${WSHAPES.map((sh) => `<button type="button" class="${sh}" aria-label="${sh}">${wsvg(sh)}</button>`).join("")}</div></div>`);
      w.querySelectorAll("button").forEach((b, i) => b.onclick = () => { g.shape = WSHAPES[i]; g.pickShape = false; g.msg = `${cur.name} played Whot and called ${wpl(WSHAPES[i])}.`; advance(1); paint(); });
      stage.append(w); return;
    }
    const hand = $(`<div class="hand" role="group" aria-label="${esc(cur.name)}'s hand"></div>`);
    cur.hand.forEach((c, i) => { const ok = playable(c), b = cardEl(c, ok ? "can" : "no"); b.disabled = !ok; b.onclick = () => play(i); hand.append(b); });
    stage.append(hand);
  }
  paint();
}

