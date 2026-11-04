"use strict";
// Whot and Ayo motion. Cards fly from where they were (your hand, the market, or across the table) to where they land.
// Take a snapshot before a view is rebuilt and settle after; both do nothing under reduced motion.
const cardRect = (el) => el.getBoundingClientRect();
function cardSnapshot(root) {
  const hand = new Map(); root.querySelectorAll(".hand .wc").forEach((c) => { const k = c.getAttribute("aria-label"); if (!hand.has(k)) hand.set(k, []); hand.get(k).push(cardRect(c)); });
  const pile = root.querySelector(".piles .wc.back"), top = root.querySelector(".piles .wc.big"), need = root.querySelector(".need");
  return { hand, pile: pile ? cardRect(pile) : null, top: top ? top.getAttribute("aria-label") : null, need: need ? need.textContent : null };
}
function cardFly(el, from, o = {}) {
  const to = cardRect(el); if (!to.width || typeof el.animate !== "function") return;
  const dx = from.left + from.width / 2 - (to.left + to.width / 2), dy = from.top + from.height / 2 - (to.top + to.height / 2), s = from.width / to.width;
  el.animate([{ transform: `translate(${dx}px,${dy}px) scale(${s}) rotate(${o.rot || 0}deg)`, opacity: o.fade === undefined ? 1 : o.fade }, { transform: "none", opacity: 1 }],
    { duration: o.ms || 360, delay: o.delay || 0, easing: "cubic-bezier(.23,1,.32,1)", fill: "backwards" });
}
function cardSettle(root, before, quiet) {
  if (reduceMotion() || !before) return;
  const top = root.querySelector(".piles .wc.big"), pile = root.querySelector(".piles .wc.back"), need = root.querySelector(".need");
  const cards = [...root.querySelectorAll(".hand .wc")], counts = new Map();
  cards.forEach((c) => { const k = c.getAttribute("aria-label"); counts.set(k, (counts.get(k) || 0) + 1); });
  const dealing = before.top === null && pile && cards.length;
  if (dealing) { const r = cardRect(pile); cards.forEach((c, i) => cardFly(c, r, { delay: i * 90, ms: 420, fade: 0 })); if (!quiet) feel.card(); }
  else {
    // Cards that weren't in your hand a moment ago came from the market.
    const seen = new Map(); let n = 0;
    cards.forEach((c) => { const k = c.getAttribute("aria-label"), i = seen.get(k) || 0; seen.set(k, i + 1);
      if (before.pile && i >= (before.hand.get(k) || []).length) { cardFly(c, before.pile, { delay: n++ * 80, ms: 380, fade: 0 }); } });
    if (n && !quiet) feel.card();
  }
  if (top && before.top !== null && top.getAttribute("aria-label") !== before.top) {
    const key = top.getAttribute("aria-label"), was = before.hand.get(key) || [];
    const t = cardRect(top);
    if (was.length > (counts.get(key) || 0)) cardFly(top, was[0], { ms: 320 }); // you played it
    else cardFly(top, { left: t.left, top: t.top - 130, width: t.width * 0.7, height: t.height * 0.7 }, { rot: -8, fade: 0, ms: 380 }); // someone else did
    if (!quiet) feel.card();
  }
  if (need && before.need !== null && need.textContent !== before.need && typeof need.animate === "function") need.animate([{ transform: "scale(.9)" }, { transform: "scale(1.06)" }, { transform: "none" }], { duration: 320 });
}
