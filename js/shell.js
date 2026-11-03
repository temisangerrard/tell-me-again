"use strict";
// App shell and themes
/* ---------- shell ---------- */
const app = document.getElementById("app");
let host;
const applyColor = () => { const r = document.documentElement.style; r.setProperty("--accent", S.color); r.setProperty("--on-accent", onAccent(S.color)); };

/* ---------- themes ---------- */
const THEMES = [["white", "Clean white", "Bright and quiet"], ["warm", "Warm", "Soft cream"], ["night", "Night", "Easy on the eyes"]];
const THEME_BG = { white: "#fcfcfa", warm: "#fbf5ec", night: "#0b0b0c" };
const getTheme = () => { const t = lsGet("sitting-theme"); return THEMES.some(([k]) => k === t) ? t : "white"; };
function applyTheme(t = getTheme()) { document.documentElement.dataset.theme = t; const m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = THEME_BG[t]; }
function themePicker() {
  const body = $(`<div><h2>Pick a look</h2><div class="picks"></div></div>`);
  const draw = () => { const cur = getTheme(); body.querySelector(".picks").replaceChildren(...THEMES.map(([k, n, d]) => {
    const prev = { white: ["#fcfcfa", "#f3f3f0", "#1d1d1f"], warm: ["#fbf5ec", "#f4eadb", "#3b2a22"], night: ["#0b0b0c", "#1f1f22", "#f4f3e8"] }[k];
    const b = $(`<button class="pick" type="button" aria-pressed="${k === cur}"><span class="ico" style="background:${prev[0]};box-shadow:inset 0 0 0 1.5px #8884"><svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="5" rx="2.5" fill="${prev[1]}"/><rect x="3" y="13" width="12" height="4" rx="2" fill="${prev[2]}"/></svg></span><span><b>${n}</b><span class="d">${d}</span></span></button>`);
    b.onclick = () => { lsSet("sitting-theme", k); applyTheme(k); draw(); }; return b; })); };
  draw(); body.append(closeBtn(sheet("Pick a look", body)));
}
// Screen change: re-render, jump to top, hand focus to the new heading so keyboard and screen-reader users land in the right place.
const go = (n) => {
  S.step = n; save(); render(); window.scrollTo(0, 0);
  const h = host.querySelector("h1, h2, .title"); if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); }
};
const enterNext = (el, fn) => el.addEventListener("keydown", (e) => {
  const n = el.querySelector("#n");
  if (e.key === "Enter" && e.target.matches("input") && n && !n.disabled) { e.preventDefault(); fn(); }
});
function render() {
  applyTheme(); applyColor(); app.replaceChildren();
  app.className = S.step === 7 ? "app room" : S.step === 0 ? "app landing" : "app";
  host = app;
  ({0: welcome, 1: nameStep, 2: colorStep, 3: startStep, 4: makeStep, 5: topicsStep, 6: inviteStep, 7: home}[S.step] || welcome)();
}
// One question per screen: back + progress on top, big headline, one pill button pinned to the bottom.
function screen(n, title, sub, body, next = "Continue") {
  const el = $(`<section class="screen">
    <div class="top"><button class="back" id="b" aria-label="Back" type="button">${ICON.back}</button>
      <div class="bar" role="img" aria-label="Step ${n} of 6">${[...Array(6)].map((_, i) => `<i class="${i < n ? "on" : ""}"></i>`).join("")}</div></div>
    <div class="content"><h2 class="display">${title}</h2>${sub ? `<p class="sub">${sub}</p>` : ""}${body}</div>
    <div class="dock"><button class="cta" id="n" type="button">${next}</button></div></section>`);
  host.append(el);
  el.querySelector("#b").onclick = () => go(S.step - 1);
  el.querySelector("#n").onclick = () => go(S.step + 1);
  return el;
}

