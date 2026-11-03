"use strict";
// Ludo board geometry
/* ---------- Ludo ---------- */
const LOOP = [[1,6],[2,6],[3,6],[4,6],[5,6],[6,5],[6,4],[6,3],[6,2],[6,1],[6,0],[7,0],[8,0],[8,1],[8,2],[8,3],[8,4],[8,5],[9,6],[10,6],[11,6],[12,6],[13,6],[14,6],[14,7],[14,8],[13,8],[12,8],[11,8],[10,8],[9,8],[8,9],[8,10],[8,11],[8,12],[8,13],[8,14],[7,14],[6,14],[6,13],[6,12],[6,11],[6,10],[6,9],[5,8],[4,8],[3,8],[2,8],[1,8],[0,8],[0,7],[0,6]];
const HOME = [[[1,7],[2,7],[3,7],[4,7],[5,7]], [[7,1],[7,2],[7,3],[7,4],[7,5]], [[13,7],[12,7],[11,7],[10,7],[9,7]], [[7,13],[7,12],[7,11],[7,10],[7,9]]];
const START = [0, 13, 26, 39], SAFE = new Set([0, 13, 26, 39, 8, 21, 34, 47]);
const PCOL = ["var(--p-red)", "var(--p-green)", "var(--p-yellow)", "var(--p-blue)"];
const BASE0 = [[2,2],[4,2],[2,4],[4,4]], BASE_OFF = [[0,0],[9,0],[9,9],[0,9]], DIR = [[-1,0],[0,-1],[1,0],[0,1]];
function tokPos(k, p, i, stack) {
  let x, y, s = 1;
  if (p < 0) { x = BASE0[i][0] + BASE_OFF[k][0]; y = BASE0[i][1] + BASE_OFF[k][1]; }
  else if (p === 56) { s = .62; const d = DIR[k]; x = 7.5 + d[0] * .95 - d[1] * (i - 1.5) * .42; y = 7.5 + d[1] * .95 + d[0] * (i - 1.5) * .42; }
  else { const c = p <= 50 ? LOOP[(START[k] + p) % 52] : HOME[k][p - 51]; x = c[0] + .5; y = c[1] + .5;
    if (stack > 1) { s = .72; x += (i % 2 ? .2 : -.2); y += (i < 2 ? -.2 : .2); } }
  return [x, y, s];
}
function boardSVG() {
  // A printed board: flat colour, a white yard in each corner with four slots, plain square cells, a diamond on the safe squares.
  const ink = "var(--text)";
  let b = `<rect width="15" height="15" fill="var(--surface)"/>`;
  const cell = (c, r, f) => `<rect x="${c}" y="${r}" width="1" height="1" fill="${f}" stroke="${ink}" stroke-opacity=".22" stroke-width=".05"/>`;
  [[0, 0], [9, 0], [9, 9], [0, 9]].forEach(([c, r], k) => {
    b += `<rect x="${c}" y="${r}" width="6" height="6" fill="${PCOL[k]}"/><rect x="${c + 1}" y="${r + 1}" width="4" height="4" rx=".25" fill="var(--surface)"/>`;
    BASE0.forEach(([x, y]) => b += `<circle cx="${x + c}" cy="${y + r}" r=".5" fill="none" stroke="${PCOL[k]}" stroke-width=".14"/>`);
  });
  LOOP.forEach(([c, r], i) => {
    const k = START.indexOf(i); b += cell(c, r, k >= 0 ? PCOL[k] : "var(--surface)");
    if (SAFE.has(i) && k < 0) b += `<rect x="${c + .36}" y="${r + .36}" width=".28" height=".28" transform="rotate(45 ${c + .5} ${r + .5})" fill="var(--muted)" fill-opacity=".6"/>`;
  });
  HOME.forEach((h, k) => h.forEach(([c, r]) => b += cell(c, r, PCOL[k])));
  [[6, 6, 6, 9], [6, 6, 9, 6], [9, 6, 9, 9], [6, 9, 9, 9]].forEach((t, k) => b += `<polygon points="${t[0]},${t[1]} ${t[2]},${t[3]} 7.5,7.5" fill="${PCOL[k]}" stroke="${ink}" stroke-opacity=".22" stroke-width=".05"/>`);
  return b + `<rect x=".05" y=".05" width="14.9" height="14.9" fill="none" stroke="${ink}" stroke-width=".1"/>`;
}
