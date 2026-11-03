"use strict";
// Ludo
function renderLudo(box) {
  const g = game;
  box.replaceChildren(backGames(box), $(`<h1 class="title">Ludo</h1>`)); lastGame = "ludo";
  const el = $(`<div class="ludo">
    <div class="bar2"><div class="turn"><i id="ti"></i><b id="tn"></b></div><button class="btn" id="newg" type="button">New game</button></div>
    <div class="boardwrap"><svg viewBox="0 0 15 15" role="group" aria-label="Ludo board">${boardSVG()}<g id="toks"></g></svg></div>
    <div class="dicebar"><button class="roll" id="roll" type="button" aria-label="Roll the dice"></button><div class="rollmsg" id="rm" role="status"></div></div>
    <div id="winbox"></div>
    <div class="ask" id="ask"></div>
    <div id="lbbox"></div>
    <p class="note">One screen, passed around the table. Share your screen on the call so everyone can see the board.</p></div>`);
  box.append(el); askStrip(el.querySelector("#ask"));
  const showLb = () => { const l = leaderboard(), b = el.querySelector("#lbbox"); b.replaceChildren(...(l ? [l] : [])); }; showLb();
  const toks = el.querySelector("#toks"), roll = el.querySelector("#roll"), rm = el.querySelector("#rm");
  const els = g.pl.map((p, pi) => p.t.map((_, i) => {
    const t = document.createElementNS("http://www.w3.org/2000/svg", "g");
    t.setAttribute("class", "tok"); t.setAttribute("role", "button"); t.setAttribute("tabindex", "-1"); t.setAttribute("aria-label", `${p.name}, token ${i + 1}`);
    t.innerHTML = `<circle class="ring" r=".62"/><circle class="disc" r=".4" fill="${PCOL[p.k]}" stroke="var(--surface)" stroke-width=".1"/><circle r=".4" fill="none" stroke="#1d1d1f" stroke-opacity=".35" stroke-width=".05"/><circle r=".66" fill="transparent"/>`;
    t.addEventListener("click", () => move(pi, i));
    t.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); move(pi, i); } });
    toks.append(t); return t;
  }));
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const say = (a, b = "") => rm.innerHTML = `${esc(a)}${b ? `<small>${esc(b)}</small>` : ""}`;
  function paint() {
    const cur = g.pl[g.turn];
    el.querySelector("#ti").style.background = PCOL[cur.k]; el.querySelector("#tn").textContent = g.over ? "Game over" : `${cur.name}'s turn`;
    const at = {}; g.pl.forEach((p) => p.t.forEach((q, i) => { if (q >= 0 && q < 56) (at[p.k + ":" + q] = at[p.k + ":" + q] || []).push(i); }));
    g.pl.forEach((p, pi) => p.t.forEach((q, i) => {
      const grp = q >= 0 && q < 56 ? at[p.k + ":" + q] : null;
      const [x, y, s] = tokPos(p.k, q, grp ? grp.indexOf(i) : i, grp ? grp.length : 1);
      const t = els[pi][i]; t.style.transform = `translate(${x}px,${y}px) scale(${s})`;
      const can = !g.over && pi === g.turn && g.movable.includes(i) && !g.busy; t.classList.toggle("go", can); t.tabIndex = can ? 0 : -1;
    }));
    roll.innerHTML = g.dice ? diceHTML(g.dice) : `<span class="rl">Roll</span>`;
    roll.disabled = !!(g.over || g.dice || g.busy);
  }
  const canMove = (p, d) => p < 0 ? d === 6 : p + d <= 56;
  function endTurn(extra) { if (!extra) g.turn = (g.turn + 1) % g.pl.length; g.dice = null; g.movable = []; g.busy = false; paint(); say(`${g.pl[g.turn].name}, you're up`, "Tap the dice."); }
  function rollDice() {
    if (g.over || g.dice || g.busy) return;
    const d = 1 + Math.floor(Math.random() * 6); g.dice = d; g.busy = true;
    const cur = g.pl[g.turn]; g.movable = cur.t.map((p, i) => canMove(p, d) ? i : -1).filter((i) => i >= 0);
    if (!reduce) roll.animate([{ transform: "rotate(0) scale(.88)" }, { transform: "rotate(140deg) scale(1.06)" }, { transform: "none" }], { duration: 240, easing: "cubic-bezier(.23,1,.32,1)" });
    if (!g.movable.length) { paint(); say(`${cur.name} rolled a ${d}`, "No move. Pass it on."); setTimeout(() => endTurn(false), 1100); }
    else if (g.movable.length === 1) { paint(); say(`${cur.name} rolled a ${d}`, "Only one move, so we'll make it."); setTimeout(() => move(g.turn, g.movable[0], true), 550); }
    else { g.busy = false; paint(); say(`${cur.name} rolled a ${d}`, "Tap a token to move it."); }
  }
  function move(pi, i, auto) {
    if (g.over || !g.dice || pi !== g.turn || !g.movable.includes(i) || (g.busy && !auto)) return;
    const d = g.dice, p = g.pl[pi], np = p.t[i] < 0 ? 0 : p.t[i] + d; p.t[i] = np;
    let hit = null;
    if (np <= 50) { const abs = (START[p.k] + np) % 52;
      if (!SAFE.has(abs)) g.pl.forEach((o, oi) => { if (oi !== pi) o.t.forEach((q, j) => { if (q >= 0 && q <= 50 && (START[o.k] + q) % 52 === abs) { o.t[j] = -1; hit = o.name; } }); }); }
    const home = np === 56;
    if (p.t.every((q) => q === 56)) {
      g.over = p; g.dice = null; g.movable = []; paint(); say(`${p.name} is home!`);
      recordWin(p.name); showLb();
      el.querySelector("#winbox").innerHTML = `<div class="win"><b>${esc(p.name)} wins</b><button class="btn" id="again" type="button">Play again</button></div>`;
      el.querySelector("#again").onclick = () => { newGame(); renderLudo(box); }; return;
    }
    const extra = d === 6 || !!hit || home;
    g.busy = true; paint();
    say(hit ? `${p.name} sent ${hit} back to start` : home ? `${p.name} got one home` : `${p.name} moved ${d}`, extra ? "Roll again." : "");
    setTimeout(() => endTurn(extra), 700);
  }
  roll.onclick = rollDice;
  el.querySelector("#newg").onclick = () => { if (!g.pl.some((p) => p.t.some((q) => q >= 0)) || confirm("Start a new game?")) { newGame(); renderLudo(box); } };
  paint(); say(`${g.pl[g.turn].name}, you're up`, "Tap the dice. Roll a 6 to get a token out.");
}

