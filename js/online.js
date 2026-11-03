"use strict";
// Online room helpers, who's joining, share links
/* ---------- Online rooms ---------- */
// Each family room is a Durable Object on Cloudflare. It runs the rules (engines.js) and tells each phone only what that person may see.
const lsGet = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch {} };
const ssGet = (k) => { try { return sessionStorage.getItem(k); } catch { return null; } };
const ssSet = (k, v) => { try { sessionStorage.setItem(k, v); } catch {} };
// Who you are in a room belongs to this tab, so two tabs on one device are two people. Closing the app and coming back
// later reclaims your seat: a tab keeps a heartbeat, and a claim nobody has refreshed for 15 seconds is up for grabs.
function roomPid(code) {
  let p = ssGet("pid:" + code); if (p && p.length >= 16) return p;
  let c = null; try { c = JSON.parse(lsGet("claim:" + code) || "null"); } catch {}
  p = c && c.pid && c.pid.length >= 16 && Date.now() - c.t > 15000 ? c.pid : crypto.randomUUID();
  ssSet("pid:" + code, p); return p;
}
const claimRoom = (code, pid) => lsSet("claim:" + code, JSON.stringify({ pid, t: Date.now() }));
const myPid = () => { let p = lsGet("sitting-pid"); if (!p || p.length < 16) { p = crypto.randomUUID(); lsSet("sitting-pid", p); } return p; };
const ROOM_RE = /^[A-Z2-9]{6}$/;
const parseCode = (t) => { const m = String(t || "").toUpperCase().match(/ROOM=([A-Z0-9]{6})/); const c = (m ? m[1] : String(t || "").toUpperCase().replace(/[^A-Z0-9]/g, "")).slice(0, 6); return ROOM_RE.test(c) ? c : null; };
const E = globalThis.Engines;
const wcardEl = (c, cls = "", tag = "button") => $(`<${tag} class="wc ${c.s} ${cls}" ${tag === "button" ? 'type="button"' : ""} aria-label="${E.whot.wname(c)}">${c.s === "whot" ? `<span class="n">20</span><b>WHOT</b><span class="n b">20</span>` : `<span class="n">${c.n}</span>${wsvg(c.s)}<span class="n b">${c.n}</span>`}</${tag}>`);
let sitting = null, pendingRoom = null; // who's in this sitting; a room to open on the Play tab
function enterRoom(box, code, n) { lsSet("sitting-room", code); box.replaceChildren(); const w = $(`<div></div>`); box.append(w); mountRoom(w, code, n, () => renderPlay(box)); }
// Start a sitting call from anywhere: the room connects in the background and the call widget floats above the tabs.
function startCall(code, name) {
  lsSet("sitting-room", code); const w = $(`<div></div>`);
  mountRoom(w, code, name, () => { const pl = document.querySelector("#play"); if (pl && !pl.hidden) renderPlay(pl); });
  currentRoom.voice.start();
}
const shareTo = async (code, who) => {
  const url = `${location.origin}${location.pathname}?room=${code}`, text = `${who}, join our sitting`;
  try { if (navigator.share) { await navigator.share({ title: "Tell Me Again", text, url }); return; } } catch (e) { if (e && e.name === "AbortError") return; }
  try { await navigator.clipboard.writeText(`${text}: ${url}`); return "Link copied"; } catch { return url; }
};
// Asked when you press Record: pick who's sitting, then record here or send links. Resolves true to record now.
function chooseSitting() {
  return new Promise((res) => {
    let picked = sitting ? [...sitting] : [], done = false;
    const b = $(`<div><h2>Who's joining?</h2><div class="chips plist2" role="group" aria-label="Who's joining"></div>
      <div class="padd"><input class="inp sm" type="text" maxlength="40" autocomplete="off" enterkeyhint="done" placeholder="Add a name" aria-label="Add a name"><button class="btn" id="pa" type="button">Add</button></div>
      <button class="cta" id="here" type="button" style="margin-top:20px">Record here</button>
      <button class="btn" id="links" type="button" style="width:100%;margin-top:8px">Send links</button><p class="err" id="ce" role="status"></p></div>`);
    const chips = b.querySelector(".chips"), inp = b.querySelector("input"), ce = b.querySelector("#ce");
    const draw = () => { chips.replaceChildren(...S.people.map((p) => { const i = picked.indexOf(p.n), c = $(`<button class="chip" type="button" aria-pressed="${i >= 0}">${esc(p.n)}${i === 0 ? " · storyteller" : ""}</button>`);
      c.onclick = () => { picked = i >= 0 ? picked.filter((x) => x !== p.n) : [...picked, p.n].slice(0, 3); draw(); }; return c; })); b.querySelector("#links").disabled = !picked.length; };
    const add = () => { const n = inp.value.trim(); if (!n) return; if (!S.people.some((p) => p.n.toLowerCase() === n.toLowerCase())) S.people.push({ n, born: "" }); if (picked.length < 3 && !picked.includes(n)) picked.push(n); inp.value = ""; save(); draw(); inp.focus(); };
    b.querySelector("#pa").onclick = add; inp.onkeydown = (e) => { if (e.key === "Enter") { e.preventDefault(); add(); } };
    const apply = () => { const pr = S.people.find((x) => x.n === picked[0]); S.elder = { name: picked[0] || "", born: (pr && pr.born) || "" }; S.seats = [meName(), picked[0] || "Storyteller", ...picked.slice(1, 3)]; sitting = picked; save(); };
    const close = sheet("Who's joining?", b);
    b.querySelector("#here").onclick = () => { apply(); done = true; close(); res(true); };
    b.querySelector("#links").onclick = async () => {
      ce.textContent = "Making the room…";
      try {
        const r = await fetch("/api/rooms", { method: "POST" }); if (r.status === 429) { ce.textContent = "Too many rooms at once. Try again in a minute."; return; }
        const j = await r.json(); if (!j.code) throw 0; apply(); done = true;
        const host = lsGet("sitting-name") || S.me.name || "Host";
        b.replaceChildren($(`<h2>Send links</h2>`), ...picked.map((n) => { const x = $(`<button class="btn" type="button" style="width:100%;margin-top:8px">Send to ${esc(n)}</button>`); x.onclick = async () => { const m = await shareTo(j.code, n); if (m) x.textContent = m; }; return x; }));
        const go2 = $(`<button class="cta" type="button" style="margin-top:20px">Start the call</button>`);
        go2.onclick = () => { startCall(j.code, host); close(); res(false); };
        b.append(go2);
      } catch { ce.textContent = "Couldn't make a room. Check your connection."; }
    };
    new MutationObserver((_, ob) => { if (!document.body.contains(b)) { ob.disconnect(); if (!done) res(false); } }).observe(document.body, { childList: true, subtree: true });
    draw(); inp.focus();
  });
}
const shareRoom = async (code) => {
  const url = `${location.origin}${location.pathname}?room=${code}`;
  try { if (navigator.share) { await navigator.share({ title: "Join our family room", text: `Room ${code}`, url }); return "Shared."; } } catch (e) { if (e && e.name === "AbortError") return ""; }
  try { await navigator.clipboard.writeText(url); return "Link copied."; } catch { return url; }
};

// Open a live connection to a room and draw it into box. Returns { close }.
// A one-to-one voice sitting. Audio goes straight between the two phones; the room only relays setup notes.
// The host's phone records both voices on the device and nothing is uploaded anywhere.
// Say what actually went wrong with the microphone, not just that something did.
