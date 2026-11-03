"use strict";
// Play tab, leaderboard, shared game bits
const seedsHTML = (n) => { // draw the seeds themselves (a sunflower spiral), with the count in the corner
  const N = Math.min(n, 24), tot = Math.max(N, 8); let h = "";
  for (let i = 0; i < N; i++) { const a = i * 2.39996, r = .34 * Math.sqrt((i + .5) / tot); h += `<i class="sd" style="left:${(50 + r * Math.cos(a) * 100).toFixed(1)}%;top:${(50 + r * Math.sin(a) * 100).toFixed(1)}%"></i>`; }
  return h + `<b class="ct">${n}</b>`;
};
const PIPS = { 1:[4], 2:[0,8], 3:[0,4,8], 4:[0,2,6,8], 5:[0,2,4,6,8], 6:[0,2,3,5,6,8] };
const diceHTML = (n) => [...Array(9)].map((_, i) => `<em class="${n && PIPS[n].includes(i) ? "p" : ""}"></em>`).join("");

function leaderboard() {
  if (!S.wins.length) return null;
  const lb = $(`<div class="lb"><h2>Leaderboard</h2><ol></ol></div>`);
  [...S.wins].sort((a, b) => b.c - a.c).forEach((w, i) => lb.querySelector("ol").append($(`<li><span class="rk">${i + 1}</span><span class="nm">${esc(w.n)}</span><span class="ct">${w.c} ${w.c === 1 ? "win" : "wins"}</span></li>`)));
  return lb;
}
function askStrip(c) {
  const q = nextQuestion();
  c.innerHTML = q ? `<small class="kicker">Ask while you play</small><p>${esc(q.q)}</p><div class="row"><button class="btn" type="button">Next question</button></div>` : `<small class="kicker">Ask while you play</small><p class="hint">You've asked everything for these topics.</p>`;
  const b = c.querySelector("button"); if (b) b.onclick = () => { S.asked.push(q.q); S.told++; save(); askStrip(c); };
}
let lastGame = null; // which game screen the Play tab reopens on
const backGames = (box) => { const b = $(`<button class="btn gback" type="button">‹ All games</button>`); b.onclick = () => { lastGame = null; renderPlay(box); }; return b; };
function renderPlay(box) {
  if (currentRoom && currentRoom.el) { box.replaceChildren(currentRoom.el); return; }
  box.replaceChildren($(`<h1 class="title">Play together</h1>`), );
  const list = $(`<div class="games">
    <button class="game" id="ludo" type="button"><span class="g">6</span><span><b>Ludo</b><span class="d">2 to 4 players</span></span></button>
    <button class="game" id="ayo" type="button"><span class="g">12</span><span><b>Ayo</b><span class="d">2 players</span></span></button>
    <button class="game" id="whot" type="button"><span class="g">20</span><span><b>Whot</b><span class="d">2 to 4 players</span></span></button></div>`);
  box.append(onlineCard(box), $(`<h2 class="sec" style="margin-top:28px">On one screen</h2>`), list);
  const lb = leaderboard(); if (lb) box.append(lb);
  list.querySelector("#ludo").onclick = () => { if (!game) newGame(); renderLudo(box); };
  list.querySelector("#ayo").onclick = () => ayo && ayo.over === null ? renderAyo(box) : ayoSetup(box);
  list.querySelector("#whot").onclick = () => whot && !whot.over ? renderWhot(box) : whotSetup(box);
  if (lastGame === "ludo" && game) renderLudo(box); else if (lastGame === "ayo" && ayo) renderAyo(box); else if (lastGame === "whot" && whot) renderWhot(box);
}
function newGame() {
  const n = Math.min(4, Math.max(2, S.seats.length)), ks = n === 2 ? [0, 2] : n === 3 ? [0, 1, 2] : [0, 1, 2, 3];
  game = { pl: ks.map((k, i) => ({ name: S.seats[i] || "Player", k, t: [-1, -1, -1, -1] })), turn: 0, dice: null, movable: [], over: null, busy: false };
}
