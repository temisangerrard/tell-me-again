"use strict";
// Ludo motion: the dice tumble before they settle, and a token hops square by square instead of sliding straight across.
// Everything here is skipped under reduced motion, and the app works the same without it.
const HOP_MS = 110;
function tumbleDice(roll, face, done, quiet) {
  if (reduceMotion()) { roll.innerHTML = diceHTML(face); if (done) done(); return; }
  let n = 0; roll.classList.add("tumble");
  const tick = () => {
    if (n++ >= 6) { roll.classList.remove("tumble"); roll.innerHTML = diceHTML(face); if (!quiet) feel.land(); if (done) done(); return; }
    roll.innerHTML = diceHTML(1 + Math.floor(Math.random() * 6)); if (!quiet) feel.rattle(); setTimeout(tick, 55 + n * 16);
  };
  tick();
}
const tokTransform = ([x, y, s]) => `translate(${x}px,${y}px) scale(${s})`;
// Put a token on its square. If it moved forward by a normal roll, hop along the path; otherwise just glide there.
function placeTok(t, k, q, idx, stack, quiet) {
  const to = tokTransform(tokPos(k, q, idx, stack)), from = t.__q; t.__q = q;
  const forward = from !== undefined && ((from >= 0 && q > from && q - from <= 6) || (from < 0 && q === 0));
  const sentHome = from !== undefined && from >= 0 && q < 0;
  const prev = t.__tf || to; t.__tf = to; t.style.transform = to;
  if (reduceMotion() || typeof t.animate !== "function" || from === q) return;
  if (forward) {
    const pts = []; for (let p = from < 0 ? 0 : from + 1; p <= q; p++) pts.push(tokPos(k, p, idx, stack));
    let at = tokPos(k, from, idx, stack); const frames = [{ transform: prev }];
    pts.forEach((pt) => { frames.push({ transform: tokTransform([(at[0] + pt[0]) / 2, (at[1] + pt[1]) / 2, Math.max(at[2], pt[2]) * 1.28]) }, { transform: tokTransform(pt) }); at = pt; });
    if (t.parentNode) t.parentNode.append(t); // draw it above the others while it travels
    t.style.transition = "none";
    const a = t.animate(frames, { duration: pts.length * HOP_MS, easing: "ease-in-out" });
    a.onfinish = a.oncancel = () => { t.style.transition = ""; };
    if (!quiet) pts.forEach((_, i) => feel.hop(i, HOP_MS / 1000));
  } else if (sentHome) {
    t.animate([{ opacity: 1 }, { opacity: .25 }, { opacity: 1 }], { duration: 380 });
  }
}
