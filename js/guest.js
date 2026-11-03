"use strict";
// Play online card and guest screen
function onlineCard(box) {
  const saved = lsGet("sitting-name") || (S.me && S.me.name) || "";
  const el = $(`<div class="card onl"><h3>Play online</h3>
    <label class="field" style="margin-top:14px"><span class="lbl">Your name</span><input class="inp sm" id="on" type="text" maxlength="30" autocomplete="off" value="${esc(saved)}" placeholder="What should they call you?"></label>
    <button class="cta" id="mk" type="button" style="margin-top:16px">Create a room</button>
    <div class="row2"><input class="inp sm" id="jc" type="text" maxlength="60" autocomplete="off" placeholder="Room code" aria-label="Room code"><button class="btn" id="jn" type="button">Join</button></div><p class="err" id="oe" role="status"></p></div>`);
  const oe = el.querySelector("#oe"), nm = el.querySelector("#on");
  const name = () => { const n = nm.value.trim(); if (!n) { oe.textContent = "Add your name first."; nm.focus(); return null; } lsSet("sitting-name", n); return n; };
  const enter = (code, n) => enterRoom(box, code, n);
  el.querySelector("#mk").onclick = async () => { const n = name(); if (!n) return; oe.textContent = "Making your room…";
    try { const r = await fetch("/api/rooms", { method: "POST" }); if (r.status === 429) { oe.textContent = "That's a lot of rooms at once. Wait a minute and try again."; return; }
      const j = await r.json(); if (!j.code) throw 0; enter(j.code, n); } catch { oe.textContent = "Couldn't make a room. Check your connection and try again."; } };
  el.querySelector("#jn").onclick = async () => { const n = name(); if (!n) return; const c = parseCode(el.querySelector("#jc").value); if (!c) { oe.textContent = "That code should be 6 letters and numbers."; return; }
    try { const r = await fetch(`/api/rooms/${c}/info`); if (r.status === 429) { oe.textContent = "Too many tries. Wait a minute and try again."; return; } if (!r.ok) { oe.textContent = "We can't find that room. Check the code."; return; } enter(c, n); } catch { oe.textContent = "Couldn't reach the room. Try again."; } };
  const last = lsGet("sitting-room"); if (ROOM_RE.test(last || "")) { const b = $(`<button class="btn" type="button" style="margin-top:10px">Rejoin ${last}</button>`); b.onclick = () => { const n = name(); if (n) enter(last, n); }; el.append(b); }
  return el;
}

// Opened from a shared link (?room=CODE): a guest needs no family, just a name.
function guestScreen(code) {
  app.className = "app"; app.replaceChildren(); applyColor();
  const saved = lsGet("sitting-name") || "";
  const el = $(`<section class="guest"><div class="mark"><i></i>Tell me again</div><h1 class="display" style="font-size:clamp(2.8rem,14vw,4.2rem)">You're invited.</h1>
    <p class="sub">Room <b style="color:var(--accent);letter-spacing:.1em">${esc(code)}</b></p>
    <label class="field"><span class="lbl">Your name</span><input class="inp" id="gn" type="text" maxlength="30" autocomplete="off" value="${esc(saved)}" placeholder="What should they call you?"></label>
    <button class="cta" id="gj" type="button" style="margin-top:24px">Join the room</button><p class="err" id="ge" role="status"></p></section>`);
  app.append(el);
  const leave = () => { history.replaceState(null, "", location.pathname); render(); };
  el.querySelector("#gj").onclick = async () => {
    const n = el.querySelector("#gn").value.trim(); if (!n) { el.querySelector("#ge").textContent = "Add your name first."; return; }
    try { const r = await fetch(`/api/rooms/${code}/info`); if (r.status === 429) { el.querySelector("#ge").textContent = "Too many tries. Wait a minute and try again."; return; } if (!r.ok) { el.querySelector("#ge").textContent = "We can't find that room. Ask for a fresh link."; return; } } catch { el.querySelector("#ge").textContent = "Couldn't reach the room. Try again."; return; }
    lsSet("sitting-name", n); lsSet("sitting-room", code);
    const wrap = $(`<section class="guest"><div class="mark"><i></i>Tell me again</div><div id="rm"></div><p class="note"><button class="btn" id="own" type="button">Start your own family</button></p></section>`);
    app.replaceChildren(wrap); wrap.querySelector("#own").onclick = () => { mounted.close(); };
    const mounted = mountRoom(wrap.querySelector("#rm"), code, n, leave);
  };
}

// Dev only: a plain segmented control so the same screen can flip between fixtures. Absent unless ?data= is in the URL.
if (DEV.has("data")) {
  const cur = FIXTURES[DEV.get("data")] ? DEV.get("data") : "demo";
  document.body.append($(`<nav class="devbar" aria-label="Test data">${Object.keys(FIXTURES).map((k) => `<a href="?data=${k}${DEV.has("step") ? "&step=" + DEV.get("step") : ""}"${k === cur ? " aria-current=page" : ""}>${{ demo: "Demo data", worst: "Worst case", empty: "Empty", one: "One" }[k]}</a>`).join("")}</nav>`));
}

