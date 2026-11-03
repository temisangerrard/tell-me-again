"use strict";
// Room shell: tabs, header, wipe
async function wipeAll() {
  stopLive(); await cancelClipEdits(); clips.forEach((c) => URL.revokeObjectURL(c.url)); clips = []; game = null; ayo = null; whot = null;
  try { await idbDo("readwrite", (st) => st.clear()); } catch {}
  try { localStorage.removeItem(KEY); localStorage.removeItem("sitting-room"); localStorage.removeItem("sitting-name"); } catch {}
  S = fresh(); render(); window.scrollTo(0, 0);
}
let currentRoom = null;
let activeVoiceRecording = false;
let live = null; // the recording in progress, if any: {mr, stream}
let game = null; // the Ludo game in progress
const paintHead = () => { const f = famName(S.name), h = document.querySelector(".rhead"); if (!h) return; h.querySelector(".tile").textContent = initial(f); h.querySelector(".who b").textContent = `The ${f} family`; h.querySelector(".who span").textContent = S.town || "Season one"; };
function stopLive() { if (!live) return; live.mr.onstop = null; try { live.mr.stop(); } catch {} live.stream.getTracks().forEach((t) => t.stop()); live = null; document.querySelectorAll(".rov").forEach((o) => o.remove()); document.body.classList.remove("lock"); }
const TABS = [["sit", "Sit", ICON.sit], ["play", "Play", ICON.play], ["make", "Make", ICON.make], ["family", "Family", ICON.family]];
function home() {
  const f = famName(S.name);
  const el = $(`<div class="roomwrap">
    <header class="rhead"><div class="tile">${esc(initial(f))}</div><div class="who"><b>The ${esc(f)} family</b><span>${S.town ? esc(S.town) : "Season one"}</span></div>
</header>
    <section id="sit" role="tabpanel" aria-labelledby="t-sit"></section>
    <section id="play" role="tabpanel" aria-labelledby="t-play" hidden></section>
    <section id="make" role="tabpanel" aria-labelledby="t-make" hidden></section>
    <section id="family" role="tabpanel" aria-labelledby="t-family" hidden></section></div>`);
  const bar = $(`<nav class="tabbar" role="tablist" aria-label="Sitting, games, things to make, your family">${TABS.map(([id, l, ic], i) => `<button class="tabbtn" role="tab" id="t-${id}" aria-controls="${id}" aria-selected="${i === 0}" tabindex="${i ? -1 : 0}" data-t="${id}">${ic}${l}</button>`).join("")}</nav>`);
  host.append(el, bar);
  const tabs = [...bar.querySelectorAll(".tabbtn")];
  const draw = { sit: renderSit, play: renderPlay, make: renderMake, family: renderFamily };
  const show = async (t, focus) => {
    if (t.getAttribute("aria-selected") === "true") return;
    tabs.forEach((x) => { x.setAttribute("aria-selected", x === t); x.tabIndex = x === t ? 0 : -1; });
    TABS.forEach(([id]) => el.querySelector("#" + id).hidden = id !== t.dataset.t);
    draw[t.dataset.t](el.querySelector("#" + t.dataset.t)); window.scrollTo(0, 0);
    if (focus) t.focus();
  };
  tabs.forEach((t, i) => {
    t.onclick = () => show(t);
    t.onkeydown = (e) => { const j = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key]; if (j !== undefined) { e.preventDefault(); show(tabs[(j + tabs.length) % tabs.length], true); } };
  });
  renderSit(el.querySelector("#sit"));
}

