"use strict";
// A win: the winner card pops in and a short burst of confetti falls across the game. Skipped under reduced motion.
function celebrate(root) {
  if (!root || reduceMotion() || typeof root.appendChild !== "function") return;
  const cv = document.createElement("canvas"); cv.className = "confetti"; cv.setAttribute("aria-hidden", "true");
  root.appendChild(cv);
  const ctx = cv.getContext && cv.getContext("2d"); if (!ctx) { cv.remove(); return; }
  const w = cv.width = Math.max(1, root.clientWidth || 360), h = cv.height = Math.max(1, Math.min(root.clientHeight || 600, 700));
  const cols = [S.color || "#e26b3f", "#f0b232", "#6db56d", "#2fa8a0", "#5aa9e6", "#7c5ad6"];
  const bits = Array.from({ length: 70 }, () => ({ x: Math.random() * w, y: -20 - Math.random() * h * 0.5, vx: (Math.random() - 0.5) * 2.4, vy: 2 + Math.random() * 3, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3, s: 6 + Math.random() * 6, c: cols[Math.floor(Math.random() * cols.length)] }));
  const t0 = Date.now();
  const frame = () => {
    const age = Date.now() - t0; ctx.clearRect(0, 0, w, h);
    bits.forEach((b) => { b.x += b.vx; b.y += b.vy; b.r += b.vr; ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.r); ctx.globalAlpha = Math.max(0, 1 - age / 2600); ctx.fillStyle = b.c; ctx.fillRect(-b.s / 2, -b.s / 4, b.s, b.s / 2); ctx.restore(); });
    if (age < 2600 && cv.isConnected) requestAnimationFrame(frame); else cv.remove();
  };
  requestAnimationFrame(frame);
}
