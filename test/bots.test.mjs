import test from "node:test";
import assert from "node:assert/strict";
import "../engines.js";
const E = globalThis.Engines;
const copy = (x) => JSON.parse(JSON.stringify(x));

// Play whole games with bots in every seat. Every action a bot picks must be legal, and games must finish.
function play(kind, names, rules, cap) {
  const s = kind === "whot" ? E.whot.init(names, rules) : E[kind].init(names); let steps = 0;
  while (s.over === null && steps++ < cap) {
    let acted = false;
    for (let i = 0; i < names.length; i++) {
      const a = E[kind].bot(s, i); if (!a) continue;
      const e = E[kind].act(s, i, a); assert.equal(e, null, `${kind} bot made an illegal move (${JSON.stringify(a)}): ${e}`); acted = true; break;
    }
    assert.ok(acted, `${kind}: nobody had a move at step ${steps}`);
  }
  return { s, steps };
}

test("Ludo bots finish games with 2, 3 and 4 players, always legally", () => {
  for (const n of [2, 3, 4]) for (let g = 0; g < 25; g++) { const { s } = play("ludo", ["a", "b", "c", "d"].slice(0, n), undefined, 20000); assert.notEqual(s.over, null, `ludo ${n}p did not finish`); }
});

test("Ayo bots finish games, always legally", () => {
  for (let g = 0; g < 60; g++) { const { s } = play("ayo", ["a", "b"], undefined, 5000); assert.notEqual(s.over, null, "ayo did not finish"); }
});

test("Whot bots finish games under random house rules, always legally", () => {
  const flip = () => E.rnd(2) === 1; let finished = 0, total = 0;
  for (let g = 0; g < 400; g++) {
    const R = { stack: flip(), pickSkips: flip(), marketAgain: flip(), noPowerFinish: flip(), whotBlock: flip(), passSuspend: flip(), lastCard: flip() };
    const n = 2 + E.rnd(3), { s } = play("whot", ["a", "b", "c", "d"].slice(0, n), R, 4000); total++; if (s.over !== null) finished++;
  }
  assert.equal(finished, total, `${total - finished} of ${total} whot games never finished`);
});

test("a bot only acts for its own seat, and does nothing when the game is over", () => {
  const s = E.ludo.init(["a", "b"]); assert.equal(E.ludo.bot(s, 1), null); assert.deepEqual(E.ludo.bot(s, 0), { a: "roll" });
  const w = E.whot.init(["a", "b"]); assert.equal(E.whot.bot(w, 1), null);
  const y = E.ayo.init(["a", "b"]); assert.equal(E.ayo.bot(y, 1), null);
  s.over = 0; assert.equal(E.ludo.bot(s, 0), null);
});

test("an Ayo bot takes a capture when one is on offer", () => {
  const s = E.ayo.init(["a", "b"]);
  s.p = [0, 0, 0, 0, 0, 2, 0, 1, 1, 0, 0, 0]; s.turn = 0; // pit 5 (2 seeds) ends in pit 7 making 2, and pit 6 is empty -> sowing 5 lands on 7: 1+1=2 captured
  const a = E.ayo.bot(s, 0); const c = copy(s); assert.equal(E.ayo.act(c, 0, a), null); assert.ok(c.sc[0] > 0, "it captured");
});

test("when the market can't supply the cards, the game ends and the fewest cards wins", () => {
  const mk = (deck, disc, hands) => { const s = E.whot.init(["a", "b", "c"]); s.deck = deck; s.disc = disc; s.hands = hands; s.top = disc[disc.length - 1]; s.shape = s.top.s; s.turn = 0; s.pend = null; s.susp = false; s.pickShape = false; return s; };
  const c = (sh, n) => ({ s: sh, n });
  // an empty market with nothing to reshuffle: the first draw ends it, and the player with one card wins
  let s = mk([], [c("circle", 10)], [[c("star", 2), c("star", 3)], [c("star", 7)], [c("star", 1), c("star", 4), c("star", 5)]]);
  assert.equal(E.whot.act(s, 0, { a: "draw" }), null); assert.equal(s.over, 1); assert.match(s.msg, /market ran out.*fewest cards/);
  // a market that can still give a card does not end it
  s = mk([c("cross", 3)], [c("circle", 10)], [[c("star", 2)], [c("star", 7)], [c("star", 1)]]);
  assert.equal(E.whot.act(s, 0, { a: "draw" }), null); assert.equal(s.over, null); assert.equal(s.hands[0].length, 2);
  // discards are shuffled back in first
  s = mk([], [c("cross", 3), c("square", 5), c("circle", 10)], [[c("star", 2)], [c("star", 7)], [c("star", 1)]]);
  assert.equal(E.whot.act(s, 0, { a: "draw" }), null); assert.equal(s.over, null, "two discards were available to reshuffle");
  // a pick-two with only one card to give ends it, however the hands stand
  s = mk([c("cross", 3)], [c("circle", 10)], [[c("star", 2), c("star", 9)], [c("star", 7), c("star", 8), c("star", 3)], [c("star", 1), c("star", 4)]]); s.pend = { num: 2, total: 2 }; s.R = { ...s.R, stack: true };
  assert.equal(E.whot.act(s, 0, { a: "draw" }), null); assert.notEqual(s.over, null);
  // equal lowest hands are a draw
  s = mk([], [c("circle", 10)], [[c("star", 2)], [c("star", 3)], [c("star", 1), c("star", 4)]]);
  E.whot.act(s, 0, { a: "draw" }); assert.equal(s.over, "draw");
});
