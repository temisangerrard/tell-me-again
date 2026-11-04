"use strict";
// State, storage, helpers
/* ---------- state ---------- */
const KEY = "sitting-v2";
const COLORS = [["#e26b3f","Terracotta"],["#f0b232","Honey"],["#6db56d","Leaf"],["#2fa8a0","Teal"],["#5aa9e6","Sky"],["#7c5ad6","Violet"],["#e5588a","Rose"],["#5b3a66","Plum"]];
const OLD_COLORS = { "#ff5b2e": "#e26b3f", "#ffc62e": "#f0b232", "#b6f23a": "#6db56d", "#2ee6a6": "#2fa8a0", "#4cc3ff": "#5aa9e6", "#8b6bff": "#7c5ad6", "#ff4d8d": "#e5588a", "#f4f3e8": "#5b3a66" }; // earlier palette, mapped across
const lum = (hex) => { const c = [1, 3, 5].map((i) => { const v = parseInt(hex.slice(i, i + 2), 16) / 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; };
const contrast = (a, b) => (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
const onAccent = (hex) => contrast(lum(hex), lum("#2b1a12")) >= contrast(lum(hex), 1) ? "#2b1a12" : "#ffffff"; // whichever of dark or white reads better on this accent
const blank = { step: 0, me: { name: "" }, people: [], consent: { transcribe: false }, autoTx: false, lang: "", hints: "", name: "", saying: "", color: "#e26b3f", town: "", heritage: [], makes: [], chapters: ["names", "home", "food"], elder: { name: "", born: "" }, seats: [], asked: [], told: 0, wins: [], sittings: [], whotRules: { stack: false, pickSkips: true, marketAgain: true, noPowerFinish: false, whotBlock: false, passSuspend: false, lastCard: false, hand: 0 } };
const fresh = () => structuredClone(blank);
// Dev only (localhost): ?data=worst|empty|one|demo swaps in a fixture (never saved). &step=N picks the screen.
const QS = new URLSearchParams(location.search);
// Test fixtures exist only on a developer's own machine. On the live site ?data= does nothing.
const DEV = ["localhost", "127.0.0.1"].includes(location.hostname) ? QS : new URLSearchParams("");
const FIXTURES = {
  demo:  { step: 7, name: "Etim", color: "#4cc3ff", town: "Port Harcourt", heritage: ["Efik"], makes: ["magazine"], elder: { name: "Papa Etim", born: "1952" }, seats: ["You", "Papa Etim", "Ini"], told: 2, sittings: [{ d: new Date().toISOString(), r: "up", t: [] }], consent: { transcribe: true, lore: true }, people: [{ n: "Papa Etim", born: "1952" }, { n: "Ini", born: "1984" }, { n: "Aunty Ekaette", born: "1958" }],
    lore: { clips: { a: { who: "Papa Etim", q: "Walk me through the house you grew up in.", at: 1, tl: 300, people: [{ n: "Ekaette", rel: "sister" }, { n: "Ma Nsikak", rel: "grandmother" }], places: ["Uyo", "Oron"], years: ["1974"], foods: ["edikang ikong", "garri"], sayings: ["A river that forgets its source dries up."], themes: ["home"] },
      b: { who: "Ini", q: "What did Sunday smell like?", at: 2, tl: 300, people: [{ n: "Ma Nsikak", rel: "great-grandmother" }, { n: "Papa Etim", rel: "father" }], places: ["Port Harcourt"], years: ["1998"], foods: ["edikang ikong"], sayings: [], themes: ["food"] } } } },
  worst: { step: 7, name: "Wiśniewska-Adeyemi-Ogunbanjo", color: "#8b6bff", saying: "Omo ti a ko ko ni, ni yoo gbe ile ti a ko ko ta, ti a ko ko ta ile ti a ko ko ni", town: "Ogbomoso, Oyo State, Nigeria", heritage: ["Edo (Bini)", "Hausa", "Mixed"], makes: ["magazine", "storybook", "short"],
    elder: { name: "Grandma Folake Olufunmilayo Adebayo-Ogunbanjo", born: "1931" }, seats: ["You", "Grandma Folake Olufunmilayo Adebayo-Ogunbanjo", "bartholomew.fitzgerald@northwind-industries.example.com", "😀 Jo"], told: 7 },
  empty: { step: 7, name: "Ade", chapters: [], elder: { name: "A", born: "" }, seats: ["You", "A"] },
  one:   { step: 7, name: "Ng", town: "X", elder: { name: "Jo", born: "2005" }, seats: ["You", "Jo"], asked: ["a"], told: 1 }
};
let S;
try {
  const saved = DEV.has("data") ? (FIXTURES[DEV.get("data")] || FIXTURES.demo) : JSON.parse(localStorage.getItem(KEY) || "{}");
  S = Object.assign(fresh(), saved); S.elder = { ...blank.elder, ...saved.elder }; S.me = { ...blank.me, ...saved.me }; S.consent = { ...blank.consent, ...saved.consent }; if (!Array.isArray(saved.people)) S.people = [saved.elder && saved.elder.name ? { n: saved.elder.name, born: saved.elder.born || "" } : null, ...((saved.seats || []).slice(2).map((n) => ({ n, born: "" })))].filter(Boolean); S.whotRules = { ...blank.whotRules, ...saved.whotRules };
  S.color = OLD_COLORS[S.color] || S.color;
  if (DEV.has("step")) S.step = +DEV.get("step");
  if (!(S.step >= 0 && S.step <= 7)) S.step = 0;
} catch { S = fresh(); }
const save = () => { if (DEV.has("data")) return; try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} };
const $ = (h) => { const t = document.createElement("template"); t.innerHTML = h.trim(); return t.content.firstChild; };
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
const initial = (s) => (Array.from(String(s).trim())[0] || "?").toUpperCase(); // Array.from keeps emoji whole
const famName = (n) => n.replace(/^the\s+/i, "").replace(/\s+family$/i, "").trim(); // "The Etim Family" -> "Etim"
const hashStr = (s) => { let h = 0; for (const ch of String(s)) h = (h * 31 + ch.codePointAt(0)) >>> 0; return h; };
const TINTS = ["#e26b3f", "#f0b232", "#6db56d", "#2fa8a0", "#5aa9e6", "#7c5ad6", "#e5588a"];
const tintFor = (name) => TINTS[hashStr(name) % TINTS.length]; // a steady colour per person, so you can tell seats apart at a glance
const meName = () => (S.me && S.me.name && S.me.name.trim()) || "You"; // the seat you sit in
const reseat = () => { S.seats = [meName(), S.elder.name || "Storyteller", ...S.seats.slice(2)]; };
const SEASON = 8; // sittings in a season
const weekKey = (d) => { const t = new Date(d); t.setHours(0, 0, 0, 0); t.setDate(t.getDate() - ((t.getDay() + 6) % 7)); return t.getTime(); }; // Monday 00:00, local
function streak() { // consecutive weeks (ending this week or last) with at least one wrapped-up sitting
  const wk = new Set(S.sittings.map((x) => weekKey(x.d))); let w = weekKey(Date.now()), n = 0;
  if (!wk.has(w)) w = weekKey(w - 1);
  while (wk.has(w)) { n++; w = weekKey(w - 1); } return n;
}
const totalWins = () => S.wins.reduce((a, w) => a + w.c, 0);
function recordWin(name) { const r = S.wins.find((w) => w.n === name); if (r) r.c++; else S.wins.push({ n: name, c: 1 }); save(); }
const reduceMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
function sheet(title, body) { // bottom sheet: Esc / backdrop / Close button dismiss; focus is trapped and restored
  const prev = document.activeElement;
  const back = $(`<div class="sheetback"><div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}" tabindex="-1"><div class="grab"></div></div></div>`);
  const sh = back.querySelector(".sheet"); sh.append(body); document.body.append(back); document.body.classList.add("lock");
  const close = () => { back.remove(); document.body.classList.remove("lock"); if (prev && prev.focus) prev.focus(); };
  back.addEventListener("click", (e) => { if (e.target === back) close(); });
  back.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { close(); return; }
    if (e.key !== "Tab") return;
    const f = [...sh.querySelectorAll("button, [href], input, textarea, [tabindex]:not([tabindex='-1'])")].filter((x) => !x.disabled);
    if (!f.length) return; const a = f[0], z = f[f.length - 1];
    if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
  });
  sh.focus(); return close;
}
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const SUR = ["Etim", "Bello", "Danjuma", "Okafor", "Adeyemi", "Briggs", "Ekpo", "Musa", "Nwosu", "Ogunleye", "Ayu", "Okonkwo"];
const PLACE = ["Port Harcourt", "Kano", "Lagos", "Enugu", "Calabar", "Abuja", "London", "Houston"];
const HERITAGE = ["Annang", "Edo (Bini)", "Efik", "Fulani", "Gbagyi", "Hausa", "Ibibio", "Idoma", "Igala", "Igbo", "Ijaw", "Isoko", "Itsekiri", "Kanuri", "Nupe", "Tiv", "Urhobo", "Yoruba"];
const ICON = {
  back: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>`,
  mag: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h4"/></svg>`,
  book: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5c3-1 6-1 9 1 3-2 6-2 9-1v13c-3-1-6-1-9 1-3-2-6-2-9-1z"/><path d="M12 6v13"/></svg>`,
  film: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M10 9.5v5l4.5-2.5z" fill="currentColor"/></svg>`,
  sit: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8.2C9.6 6.7 6.6 6.4 3.6 7.4V18c3-1 6-.7 8.4.8 2.4-1.5 5.4-1.8 8.4-.8V7.4c-3-1-6-.7-8.4.8z"/><path d="M12 8.2v10.6"/><circle cx="12" cy="3.4" r="1.3" fill="currentColor" stroke="none"/></svg>`,
  play: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="8.5" cy="8.5" r="1.3" fill="currentColor"/><circle cx="15.5" cy="15.5" r="1.3" fill="currentColor"/><circle cx="15.5" cy="8.5" r="1.3" fill="currentColor"/><circle cx="8.5" cy="15.5" r="1.3" fill="currentColor"/></svg>`,
  family: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="5.5" cy="11" r="2.1"/><circle cx="12" cy="6.2" r="2.8"/><circle cx="18.5" cy="11" r="2.1"/><path d="M7.4 10 q1.6-1.4 2.8-2.1M13.8 8 q1.8.6 2.8 1.9"/><path d="M4 19.2c3.6-3.2 12.4-3.2 16 0"/></svg>`,
  make: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3" width="14" height="18" rx="2.6"/><path d="M9.2 3v18"/><path d="M12.6 8h3.2M12.6 11.5h3.2"/></svg>`
};
const MAKES = [
  ["magazine", "Magazine", "", ICON.mag],
  ["storybook", "Storybook", "", ICON.book],
  ["short", "Animated short", "", ICON.film]
];

