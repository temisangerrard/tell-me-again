"use strict";
// A live room connection
function mountRoom(box, code, name, onLeave) {
  const pid = roomPid(code); claimRoom(code, pid); const beat = setInterval(() => claimRoom(code, pid), 5000); let ws, st = null, dead = false, tries = 0, errT, stage = null;
  box.replaceChildren($(`<div class="room2"><div class="rtop2"><div class="rcode"><small>Room</small><b>${esc(code)}</b></div>
    <button class="btn" id="sh" type="button">Share</button><button class="btn" id="sd" type="button" aria-pressed="false"></button><button class="btn" id="lv" type="button">Leave</button></div>
    <div class="members" id="mem" aria-label="Who's here"></div><p class="err" id="er" role="status"></p><div id="voice2"></div><div id="stage2"></div><div class="reacts" role="group" aria-label="Reactions"></div></div>`));
  const er = box.querySelector("#er"), stg = box.querySelector("#stage2");
  const note = (m, ms = 3500) => { er.textContent = m; clearTimeout(errT); if (ms) errT = setTimeout(() => er.textContent = "", ms); };
  const send = (o) => { if (ws && ws.readyState === 1) ws.send(JSON.stringify(o)); };
  const sd = box.querySelector("#sd"), paintSound = () => { sd.textContent = soundOn() ? "Sound on" : "Sound off"; sd.setAttribute("aria-pressed", soundOn()); };
  sd.onclick = () => { setSound(!soundOn()); paintSound(); }; paintSound();
  REACTIONS.forEach((e) => { const b = $(`<button class="rx" type="button" aria-label="React ${e}">${e}</button>`); b.onclick = () => { send({ t: "react", e }); floatReaction(box, e, "You"); feel.react(); }; box.querySelector(".reacts").append(b); });
  let wasMyTurn = false, wasOver = true, lastMsg = "";
  const feelGame = (g) => {
    const mine = g.seat >= 0 && g.v.turn === g.seat && g.v.over === null, over = g.v.over !== null;
    if (over && !wasOver) { if (g.v.over === g.seat) feel.win(); else if (g.v.over === "draw") feel.move(); else feel.lose(); }
    else if (mine && !wasMyTurn) feel.yourTurn();
    else if (!over && g.v.msg !== lastMsg && lastMsg) feel.move();
    wasMyTurn = mine; wasOver = over; lastMsg = g.v.msg;
  };
  box.querySelector("#sh").onclick = async () => { const m = await shareRoom(code); if (m) note(m); };
  let leaving = null;
  const leave = (forget = true) => {
    if (leaving) return leaving;
    leaving = (async () => {
      dead = true; clearTimeout(errT); clearInterval(beat);
      send({ t: "sig", d: JSON.stringify({ k: "bye" }) });
      try { await voice.end(); } catch {} try { ws && ws.close(); } catch {} if (activeCall === voice) activeCall = null;
      if (currentRoom === session) currentRoom = null;
      if (forget) { lsSet("sitting-room", ""); onLeave(); }
    })();
    return leaving;
  };
  const voice = voiceSitting(box.querySelector("#voice2"), send, () => (st && st.me && st.me.name) || name, note);
  box.querySelector("#lv").onclick = () => leave();

  function connect() {
    if (dead) return;
    ws = new WebSocket(`${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/api/rooms/${code}/ws`);
    ws.onopen = () => { tries = 0; send({ t: "join", pid, name }); };
    ws.onmessage = (e) => { let m; try { m = JSON.parse(e.data); } catch { return; } if (m.t === "state") { st = m; paintRoom(); voice.announce(st.members.length); } else if (m.t === "sig") voice.onSig(m.d); else if (m.t === "react" && REACTIONS.includes(m.e)) { floatReaction(box, m.e, m.n); feel.react(); } else if (m.t === "err") note(m.m); };
    ws.onclose = () => { if (dead) return; note("Reconnecting…", 0); setTimeout(connect, Math.min(1000 * 2 ** tries++, 8000)); };
  }
  function paintRoom() {
    if (er.textContent === "Reconnecting…") er.textContent = "";
    box.querySelector("#mem").replaceChildren(...st.members.map((m) => $(`<span class="member ${m.you ? "you" : ""}"><i class="dot ${m.online ? "on" : ""}"></i><span>${esc(m.name)}</span><em>${m.host ? "host" : m.seat < 0 ? "watching" : ""}${m.wins ? ` · ${m.wins} ${m.wins === 1 ? "win" : "wins"}` : ""}</em></span>`)));
    const g = st.game;
    if (!g) { stage = null; wasMyTurn = false; wasOver = true; lastMsg = ""; return lobby(); }
    if (!stage || stage.id !== g.id) { stg.replaceChildren(); stage = { id: g.id, ...mountOnlineGame(g.kind, stg, send, st, note) }; wasOver = false; wasMyTurn = false; lastMsg = ""; }
    stage.update(g, st); feelGame(g);
    if (g.v.over !== null) stg.querySelectorAll(".endg").forEach((x) => x.remove());
    if (st.me && st.me.host && g.v.over === null && !stg.querySelector(".endg")) { // the host can always call a game off
      const b = $(`<button class="btn endg" type="button" style="margin-top:20px;background:transparent;color:var(--muted)">End this game</button>`);
      b.onclick = () => { if (confirm("End this game for everyone?")) send({ t: "stop" }); }; stg.append(b);
    }
  }
  function lobby() {
    const seated = st.members.filter((m) => m.seat >= 0).length, host = st.me && st.me.host;
    const el = $(`<div class="onl"><h2 class="sec" style="margin-top:8px">${host ? "Pick a game" : "Waiting for the host"}</h2>
      <p class="hint">${seated} ${seated === 1 ? "person" : "people"} at the table</p><div class="games"></div></div>`);
    if (host) {
      const games = [["ludo", "6", "Ludo", "2 to 4 players"], ["ayo", "12", "Ayo", "2 play, the rest watch"], ["whot", "20", "Whot", "2 to 4 players"]];
      games.forEach(([k, g, t, d]) => { const b = $(`<button class="game" type="button"><span class="g">${g}</span><span><b>${t}</b><span class="d">${d}</span></span></button>`);
        b.disabled = seated < 2; b.onclick = () => send({ t: "start", game: k, rules: k === "whot" ? S.whotRules : undefined }); el.querySelector(".games").append(b); });
      const hr = $(`<button class="btn" type="button" style="margin-top:12px">Whot house rules</button>`);
      hr.onclick = () => { const b = $(`<div><h2>Whot house rules</h2></div>`); whotRuleRows(b); b.append(closeBtn(sheet("Whot house rules", b))); };
      el.append(hr);
    }
    stg.replaceChildren(el);
  }
  const session = { close: leave, el: box, voice };
  currentRoom = session;
  connect();
  return session;
}

