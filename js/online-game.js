"use strict";
// Online game views
function mountOnlineGame(kind, box, send, st, note) {
  const act = (a) => send({ t: "act", a });
  const over = (g, again) => { // winner card; the host can pick the next game
    const w = g.v.over === "draw" ? "A draw" : `${esc(g.names[g.v.over])} wins`;
    const host = st.me && st.me.host;
    const el = $(`<div class="win"><b>${w}</b>${host ? `<button class="btn" data-a="again" type="button">Play again</button><button class="btn" data-a="pick" type="button">Pick another game</button>` : `<p style="margin-top:10px">Waiting for the host…</p>`}</div>`);
    const redo = el.querySelector("[data-a=again]"), pick = el.querySelector("[data-a=pick]");
    if (redo) redo.onclick = () => send({ t: "start", game: kind, rules: kind === "whot" ? S.whotRules : undefined });
    if (pick) pick.onclick = () => send({ t: "stop" });
    return el;
  };
  const wire = (el) => el; // the winner card wires its own buttons

  if (kind === "ludo") {
    const el = $(`<div class="ludo"><div class="bar2"><div class="turn"><i></i><b></b></div></div><div class="boardwrap"><svg viewBox="0 0 15 15" role="group" aria-label="Ludo board">${boardSVG()}<g class="toks"></g></svg></div>
      <div class="dicebar"><button class="roll" type="button" aria-label="Roll the dice"></button><div class="rollmsg" role="status"></div></div><div class="ov"></div></div>`);
    box.append(el);
    const toks = el.querySelector(".toks"), roll = el.querySelector(".roll"); let tokEls = null, cur = null, seat = -1;
    roll.onclick = () => act({ a: "roll" });
    return { update(g) {
      const v = g.v; cur = v; seat = g.seat;
      if (!tokEls) tokEls = v.pl.map((p, pi) => p.t.map((_, i) => {
        const t = document.createElementNS("http://www.w3.org/2000/svg", "g"); t.setAttribute("class", "tok"); t.setAttribute("role", "button"); t.setAttribute("tabindex", "-1"); t.setAttribute("aria-label", `${g.names[pi]}, token ${i + 1}`);
        t.innerHTML = `<circle class="ring" r=".62"/><circle class="disc" r=".4" fill="${PCOL[p.k]}" stroke="var(--surface)" stroke-width=".1"/><circle r=".4" fill="none" stroke="#1d1d1f" stroke-opacity=".35" stroke-width=".05"/><circle r=".66" fill="transparent"/>`;
        const go = () => { if (cur && seat === cur.turn && pi === cur.turn && cur.movable.includes(i)) act({ a: "move", i }); };
        t.addEventListener("click", go); t.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } });
        toks.append(t); return t;
      }));
      el.querySelector(".turn i").style.background = PCOL[v.pl[v.turn].k];
      el.querySelector(".turn b").textContent = v.over !== null ? "Game over" : seat === v.turn ? "Your turn" : `${g.names[v.turn]}'s turn`;
      const at = {}; v.pl.forEach((p) => p.t.forEach((q, i) => { if (q >= 0 && q < 56) (at[p.k + ":" + q] = at[p.k + ":" + q] || []).push(i); }));
      v.pl.forEach((p, pi) => p.t.forEach((q, i) => {
        const grp = q >= 0 && q < 56 ? at[p.k + ":" + q] : null, [x, y, sc] = tokPos(p.k, q, grp ? grp.indexOf(i) : i, grp ? grp.length : 1);
        const t = tokEls[pi][i]; t.style.transform = `translate(${x}px,${y}px) scale(${sc})`;
        const can = v.over === null && seat === v.turn && pi === v.turn && v.movable.includes(i); t.classList.toggle("go", can); t.tabIndex = can ? 0 : -1;
      }));
      const face = v.dice !== null ? v.dice : v.last ? v.last.d : null;
      roll.innerHTML = face ? diceHTML(face) : `<span class="rl">Roll</span>`; roll.disabled = !(v.over === null && seat === v.turn && v.dice === null);
      el.querySelector(".rollmsg").innerHTML = `${esc(v.msg)}`;
      const ov = el.querySelector(".ov"); ov.replaceChildren(); if (v.over !== null) { const w = over(g); ov.append(w); wire(w, () => send({ t: "stop" })); }
    } };
  }

  if (kind === "ayo") {
    const el = $(`<div class="ayo"><div class="store"><div class="score"></div><div class="score"></div></div><div class="apits" role="group" aria-label="Ayo board"></div><p class="hint" role="status" style="margin-top:12px"></p><div class="ov"></div></div>`);
    box.append(el);
    const ap = el.querySelector(".apits"), rt = $(`<div class="rowlbl"></div>`), rb = $(`<div class="rowlbl"></div>`); ap.append(rt);
    const pits = [...Array(12)].map(() => { const b = $(`<button class="pit" type="button"></button>`); b.onclick = () => { if (b.classList.contains("can")) act({ a: "sow", i: +b.dataset.i }); }; ap.append(b); return b; });
    ap.append(rb);
    return { update(g) {
      const v = g.v, flip = g.seat === 1, order = flip ? [5,4,3,2,1,0,6,7,8,9,10,11] : [11,10,9,8,7,6,0,1,2,3,4,5];
      const mv = v.over === null && g.seat === v.turn ? E.ayo.moves(v) : [], lastPit = v.last && v.last.steps.length ? v.last.steps[v.last.steps.length - 1] : -1;
      pits.forEach((b, k) => { const i = order[k], n = v.p[i], can = mv.includes(i);
        b.dataset.i = i; b.innerHTML = seedsHTML(n); b.disabled = !can; b.className = `pit ${i > 5 ? "b" : ""} ${can ? "can" : ""} ${n === 0 ? "zero" : ""} ${i === lastPit ? "hit" : ""} ${v.last && v.last.caps.includes(i) ? "cap" : ""}`;
        b.setAttribute("aria-label", `${g.names[i > 5 ? 1 : 0]}, pit ${(i % 6) + 1}, ${n} ${n === 1 ? "seed" : "seeds"}`); });
      [0, 1].forEach((t) => { const sc = el.querySelectorAll(".score")[t]; sc.innerHTML = `<b>${v.sc[t]}</b><span>${esc(g.names[t])}${g.seat === t ? " (you)" : ""}</span>`; sc.classList.toggle("on", v.turn === t && v.over === null); });
      const top = flip ? 0 : 1, bot = flip ? 1 : 0; // your own side is always the bottom row
      rt.textContent = g.names[top] + (g.seat === top ? " (you)" : ""); rb.textContent = g.names[bot] + (g.seat === bot ? " (you)" : "");
      rt.classList.toggle("on", v.turn === top && v.over === null); rb.classList.toggle("on", v.turn === bot && v.over === null);
      el.querySelector(".hint").textContent = v.msg;
      const ov = el.querySelector(".ov"); ov.replaceChildren(); if (v.over !== null) { const w = over(g); ov.append(w); wire(w, () => send({ t: "stop" })); }
    } };
  }

  // whot
  const el = $(`<div class="whot"><div class="scores"></div><div class="stg"></div></div>`); box.append(el);
  return { update(g, state) {
    const v = g.v, stg = el.querySelector(".stg"), seat = g.seat, mine = seat === v.turn && v.over === null; stg.replaceChildren();
    el.querySelector(".scores").replaceChildren(...v.names.map((n, i) => $(`<span class="${i === v.turn && v.over === null ? "on" : ""}">${esc(n)}${i === seat ? " (you)" : ""} · ${v.counts[i]}</span>`)),
      (() => { const b = $(`<button class="btn rulebtn" type="button">Rules</button>`); b.onclick = () => { const x = $(`<div><h2>The rules</h2>${whotRulesList(v.R)}</div>`); x.append(closeBtn(sheet("Whot rules", x))); }; return b; })());
    const piles = $(`<div class="piles"></div>`);
    const label = v.susp ? "Miss turn" : v.pend ? `Pick ${v.pend.total}` : "Pick";
    const dr = $(`<button class="wc back" type="button">${label}<small>${v.susp ? "suspended" : v.deckN + " left"}</small></button>`); dr.disabled = !mine || v.pickShape; dr.onclick = () => act({ a: "draw" });
    piles.append(dr, wcardEl(v.top, "big", "div"));
    const R = v.R, need = v.susp ? "Play an 8 to pass it on, or miss your turn" : v.pend ? `${[R.stack ? `stack a ${v.pend.num}` : "", R.whotBlock ? "play a Whot" : ""].filter(Boolean).join(", ")} or pick ${v.pend.total}`.replace(/^./, (c) => c.toUpperCase()) : `Play a ${v.shape} or a ${v.top.s === "whot" ? "Whot" : v.top.n}`;
    stg.append(piles, $(`<div style="text-align:center"><span class="need ${v.shape}">${wsvg(v.shape)}${esc(need)}</span></div>`), $(`<p class="hint" style="text-align:center;margin-top:10px" role="status">${esc(v.msg)}</p>`));
    if (v.over !== null) { const w = over(g); stg.append(w); wire(w, () => state && send({ t: "stop" })); return; }
    if (v.last && R.lastCard) { // anyone can catch a forgotten call; the player can make it
      if (v.last.seat === seat && !v.last.called) { const b = $(`<button class="cta" type="button" style="margin-top:14px">Last card!</button>`); b.onclick = () => act({ a: "call" }); stg.append(b); }
      else if (v.last.seat !== seat && seat >= 0 && !v.last.called) { const b = $(`<button class="btn" type="button" style="width:100%;margin-top:14px">${esc(v.names[v.last.seat])} has one card. Catch them?</button>`); b.onclick = () => act({ a: "catch" }); stg.append(b); }
    }
    if (seat < 0) { stg.append($(`<p class="hint" style="text-align:center;margin-top:14px">You're watching this one.</p>`)); return; }
    if (v.pickShape && mine) {
      const w = $(`<div><p class="lbl" style="margin-top:20px">Whot! Call a shape</p><div class="shapes" role="group" aria-label="Call a shape">${E.whot.WSHAPES.map((sh) => `<button type="button" class="${sh}" aria-label="${sh}">${wsvg(sh)}</button>`).join("")}</div></div>`);
      w.querySelectorAll("button").forEach((b, i) => b.onclick = () => act({ a: "shape", s: E.whot.WSHAPES[i] })); stg.append(w); return;
    }
    const hand = $(`<div class="hand" role="group" aria-label="Your hand"></div>`);
    v.hand.forEach((c, i) => { const ok = mine && E.whot.playableCard(v, c), b = wcardEl(c, ok ? "can" : "no"); b.disabled = !ok; b.onclick = () => act({ a: "play", i }); hand.append(b); });
    stg.append(hand);
  } };
}

// Play tab: create a room, or join one by code.
