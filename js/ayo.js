"use strict";
// Ayo
/* ---------- Ayo (Oware) ---------- */
// 12 pits, 4 seeds each. Pits 0-5 are player 1's (left to right along the bottom), 6-11 are player 2's (right to left along the top).
// Seeds travel anticlockwise. Land your last seed on the other side making a pit of 2 or 3 and you capture it, and any run of 2s and 3s behind it.
let ayo = null;
const ASIDE = (t) => t === 0 ? [0, 1, 2, 3, 4, 5] : [6, 7, 8, 9, 10, 11];
function ayoMoves(g) {
  const mine = ASIDE(g.turn), opp = ASIDE(1 - g.turn); let m = mine.filter((i) => g.p[i] > 0);
  if (opp.every((i) => g.p[i] === 0)) m = m.filter((i) => g.turn === 0 ? i + g.p[i] >= 6 : i + g.p[i] >= 12); // you must give them seeds
  return m;
}
function ayoSetup(box) {
  box.replaceChildren(backGames(box), $(`<h1 class="title">Ayo</h1>`), $(`<p class="sub">Pick two.</p>`)); lastGame = null;
  const names = S.seats.slice(0, 4), sel = [0, 1];
  const row = (label, k) => { const w = $(`<div class="pickrow"><span class="lbl">${label}</span><div class="chips" role="group" aria-label="${label}"></div></div>`);
    const draw = () => { const c = w.querySelector(".chips"); c.replaceChildren(...names.map((n, i) => { const b = $(`<button class="chip" type="button" aria-pressed="${sel[k] === i}">${esc(n)}</button>`); b.onclick = () => { sel[k] = i; if (sel[1 - k] === i) sel[1 - k] = names.findIndex((_, j) => j !== i); [...box.querySelectorAll(".pickrow")].forEach((r) => r.redraw()); }; return b; })); };
    w.redraw = draw; draw(); return w; };
  box.append(row("Player 1 · bottom row", 0), row("Player 2 · top row", 1));
  const go2 = $(`<button class="cta" type="button" style="margin-top:24px">Start the game</button>`);
  go2.onclick = () => { ayo = { names: [names[sel[0]], names[sel[1]]], p: Array(12).fill(4), sc: [0, 0], turn: 0, busy: false, over: null }; renderAyo(box); };
  box.append(go2);
  const lb = leaderboard(); if (lb) box.append(lb);
}
function renderAyo(box) {
  const g = ayo; lastGame = "ayo";
  box.replaceChildren(backGames(box), $(`<h1 class="title">Ayo</h1>`));
  const el = $(`<div class="ayo"><div class="store"><div class="score" id="s0"></div><div class="score" id="s1"></div></div>
    <div class="apits" id="ap" role="group" aria-label="Ayo board"></div><p class="hint" id="am" role="status" style="margin-top:12px"></p><div id="winbox"></div>
    <div class="ask" id="ask"></div><div id="lbbox"></div>
    <p class="note">Seeds travel anticlockwise: along the bottom row to the right, then back along the top to the left. Tap one of your glowing pits to sow it.</p></div>`);
  box.append(el); askStrip(el.querySelector("#ask"));
  const ap = el.querySelector("#ap"), say = (t) => el.querySelector("#am").textContent = t;
  const order = [11, 10, 9, 8, 7, 6, 0, 1, 2, 3, 4, 5];
  const rt = $(`<div class="rowlbl"></div>`), rb = $(`<div class="rowlbl"></div>`); ap.append(rt);
  const pits = order.map((i) => { const b = $(`<button class="pit ${i > 5 ? "b" : ""}" type="button"></button>`); b.onclick = () => move(i); ap.append(b); return [i, b]; });
  ap.append(rb);
  const showLb = () => { const l = leaderboard(), b = el.querySelector("#lbbox"); b.replaceChildren(...(l ? [l] : [])); }; showLb();
  function paint(hit) {
    const mv = !g.busy && g.over === null ? ayoMoves(g) : [];
    pits.forEach(([i, b]) => { const n = g.p[i], can = mv.includes(i);
      b.innerHTML = seedsHTML(n); b.disabled = !can; b.classList.toggle("can", can); b.classList.toggle("hit", i === hit); b.classList.toggle("zero", n === 0);
      b.setAttribute("aria-label", `${g.names[i > 5 ? 1 : 0]}, pit ${(i % 6) + 1}, ${n} ${n === 1 ? "seed" : "seeds"}`); });
    [0, 1].forEach((t) => { const sc = el.querySelector("#s" + t); sc.innerHTML = `<b>${g.sc[t]}</b><span>${esc(g.names[t])}</span>`; sc.classList.toggle("on", g.turn === t && g.over === null); });
    rt.textContent = g.names[1]; rb.textContent = g.names[0]; rt.classList.toggle("on", g.turn === 1 && g.over === null); rb.classList.toggle("on", g.turn === 0 && g.over === null);
  }
  function finish() {
    const t = g.turn;
    if (g.sc[0] > 24 || g.sc[1] > 24) return end();
    g.turn = 1 - t; const mv = ayoMoves(g);
    if (!mv.length) { [0, 1].forEach((x) => ASIDE(x).forEach((i) => { g.sc[x] += g.p[i]; g.p[i] = 0; })); return end(); }
    g.busy = false; paint(); say(`${g.names[g.turn]}, your move.`);
  }
  function end() {
    g.busy = false; const w = g.sc[0] === g.sc[1] ? null : g.sc[0] > g.sc[1] ? 0 : 1; g.over = w === null ? "draw" : w; paint();
    say(w === null ? "A draw." : `${g.names[w]} wins, ${g.sc[w]} to ${g.sc[1 - w]}.`);
    if (w !== null) recordWin(g.names[w]); showLb();
    showResult();
  }
  function showResult() {
    const title = g.over === "draw" ? "A draw" : esc(g.names[g.over]) + " wins";
    el.querySelector("#winbox").innerHTML = `<div class="win"><b>${title}</b><button class="btn" type="button">Play again</button></div>`;
    el.querySelector("#winbox .btn").onclick = () => ayoSetup(box);
  }
  function move(i) {
    if (g.busy || g.over !== null || !ayoMoves(g).includes(i)) return;
    g.busy = true; let n = g.p[i], c = i; const steps = []; g.p[i] = 0;
    while (n > 0) { c = (c + 1) % 12; if (c === i) continue; steps.push(c); n--; }
    paint(); let k = 0;
    const tick = () => {
      if (k < steps.length) { g.p[steps[k]]++; paint(steps[k]); k++; setTimeout(tick, 150); return; }
      const opp = ASIDE(1 - g.turn); let caps = [], x = c;
      if (opp.includes(c)) { while (opp.includes(x) && (g.p[x] === 2 || g.p[x] === 3)) { caps.push(x); x = (x + 11) % 12; }
        if (opp.every((o) => caps.includes(o) || g.p[o] === 0) && caps.length) caps = []; } // never capture every seed on their side
      let got = 0; caps.forEach((o) => { got += g.p[o]; g.p[o] = 0; }); g.sc[g.turn] += got;
      paint(); say(got ? `${g.names[g.turn]} captured ${got}.` : ""); setTimeout(finish, got ? 500 : 0);
    };
    tick();
  }
  paint(); if (g.over !== null) showResult(); else say(`${g.names[g.turn]}, your move.`);
}

