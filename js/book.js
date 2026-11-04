"use strict";
// The sample book on the landing page: a made-up family's book, to show what you end up with. Wide screens show two-page spreads,
// phones show one page at a time. It turns by itself once, until you touch it. Nothing here is real data.
const BK = {
  coral: "#e26b3f", honey: "#f0b232", teal: "#2fa8a0", leaf: "#6db56d", violet: "#7c5ad6", ink: "#1d1d1f", paper: "#fbf8f1"
};
// where each character's head sits in its picture (x%, y%), measured from the renders, so a portrait can centre on the face
const HEAD = { gran: [51.6, 28.0, 2.1], dad: [49.9, 31.6, 2.1], aunty: [48.8, 30.8, 2.1], mum: [50.5, 28.7, 2.1], kid: [51.6, 41.6, 2.5], pebble: [50.5, 50.4, 2.0] };
const portrait = (k, size = 22, bg = "#f0b232") => { const [x, y, z] = HEAD[k]; return `<span class="pt" style="--s:${size}cqw;background:${bg}"><img src="art/characters/${k}-still.webp" alt="" loading="lazy" decoding="async" style="width:${z * 100}%;left:${(50 - x * z).toFixed(1)}%;top:${(50 - y * z).toFixed(1)}%"></span>`; };
const wavebars = (n = 34) => `<svg class="wv" viewBox="0 0 136 20" aria-hidden="true">${Array.from({ length: n }, (_, i) => `<rect x="${i * 4}" y="${10 - (3 + ((i * 5) % 7))}" width="2.4" rx="1.2" height="${6 + ((i * 5) % 7) * 2}" style="--i:${i}"/>`).join("")}</svg>`;
const folio = (n, side) => `<span class="folio ${side}">${n}</span>`;

const BOOK_PAGES = [
  // 0 · cover
  `<div class="pg cv"><i class="stripe"><b style="background:${BK.violet}"></b><b style="background:${BK.coral}"></b><b style="background:${BK.honey}"></b><b style="background:${BK.leaf}"></b><b style="background:${BK.teal}"></b></i>
    <small>A family book · Volume one</small><h3>Sunday at Grandma Folake's</h3><p>Stories from the Adebayo-Clarke table</p>
    <img class="seal" src="art/icons/mark-mono.svg" alt="" width="120" height="120"><em>Told by six voices</em></div>`,
  // 1 · dedication
  `<div class="pg ded">${portrait("kid", 26, BK.coral)}<p class="dd">For Folake, who remembers everything,<br>and for Ife, who asks.</p><small class="script">“Ask it twice. The second answer is the true one.”</small>${folio(2, "l")}</div>`,
  // 2 · contents
  `<div class="pg toc"><span class="eyebrow">What's inside</span><h4>Contents</h4>
    <ol><li style="--c:${BK.coral}"><i></i><b>The names we carry</b><span>4</span></li><li style="--c:${BK.honey}"><i></i><b>Sunday in her kitchen</b><span>6</span></li><li style="--c:${BK.teal}"><i></i><b>How we crossed</b><span>8</span></li><li style="--c:${BK.leaf}"><i></i><b>Who sits where</b><span>10</span></li><li style="--c:${BK.violet}"><i></i><b>Sayings we live by</b><span>11</span></li></ol>
    <div class="stats"><div><b>23</b><span>stories</span></div><div><b>6</b><span>voices</span></div><div><b>3</b><span>generations</span></div></div>${folio(3, "r")}</div>`,
  // 3 · chapter 1 opener
  `<div class="pg opener" style="--c:${BK.coral};--t:#1d1d1f"><span class="numeral">01</span><div class="tt"><h4>The names we carry</h4><p class="qq">“Who chose your name, and what did they hope for?”</p></div>${folio(4, "l")}</div>`,
  // 4 · chapter 1 story
  `<div class="pg story">${portrait("gran", 24, BK.coral)}<span class="byline"><b>Folake</b>, 74</span>
    <blockquote>“My father said a name is a promise. My mother said it is a weather forecast.”</blockquote>
    <div class="listen"><span class="play">▶</span>${wavebars()}<em>1:48</em></div>
    <div class="qa"><p><i>Ife</i> Which one was right?</p><p><i>Folake</i> Both, child. I was born in the rainy season and I have been a promise ever since.</p></div>${folio(5, "r")}</div>`,
  // 5 · chapter 2 story with photos
  `<div class="pg kit"><span class="eyebrow" style="color:${BK.coral}">02 · Sunday in her kitchen</span><h4>Everyone had a job.</h4>
    <p>Someone washed the rice. Someone set the table. Tunde was never allowed near the pot, and Ife was in charge of the spoon that nobody was allowed to taste from.</p>
    <div class="polas"><figure style="--r:-4deg">${portrait("dad", 30, BK.teal)}<figcaption>Tunde, on rice duty</figcaption></figure><figure style="--r:3deg">${portrait("aunty", 30, BK.honey)}<figcaption>Ngozi, supervising</figcaption></figure></div>${folio(6, "l")}</div>`,
  // 6 · recipe
  `<div class="pg recipe"><span class="eyebrow">Recipe, as told</span><h4>Pepper soup,<br>the way she says it</h4>
    <ul><li><b>Goat meat</b>, or chicken if you must</li><li><b>Pepper soup spice</b>: <u>a spoon, then another</u></li><li><b>Scent leaf</b> from the garden, last, always last</li><li><b>Salt</b>: taste it, don't ask me</li></ul>
    <p class="script jot">“Never measure. Measuring is for people who don't trust their hands.”<br>— Folake</p><div class="listen small"><span class="play">▶</span>${wavebars(22)}<em>0:52</em></div>${folio(7, "r")}</div>`,
  // 7 · chapter 3 opener
  `<div class="pg opener" style="--c:${BK.teal};--t:#1d1d1f"><span class="numeral">03</span><div class="tt"><h4>How we crossed</h4><p class="qq">“Where did you come from, and what did you carry?”</p></div>
    <svg class="route" viewBox="0 0 100 60" aria-hidden="true"><path d="M8 48 C 26 10, 52 56, 72 22 S 92 14, 94 12" fill="none" stroke="#1d1d1f" stroke-width="1.4" stroke-dasharray="2 2.4" stroke-linecap="round"/><circle cx="8" cy="48" r="2.6" fill="#1d1d1f"/><circle cx="40" cy="32" r="2.6" fill="#1d1d1f"/><circle cx="94" cy="12" r="3.4" fill="#fff" stroke="#1d1d1f" stroke-width="1.2"/></svg>${folio(8, "l")}</div>`,
  // 8 · timeline
  `<div class="pg tl"><span class="eyebrow">Ngozi remembers</span>
    <ol><li><b>1962</b><div><h5>Ibadan</h5><p>Born the year the radio first came to the street.</p></div></li><li><b>1978</b><div><h5>London</h5><p>The cold, the chips, and the first snow she ever touched.</p></div></li><li><b>2004</b><div><h5>Houston</h5><p>A new job, a bigger kitchen, and a garden in strange soil.</p></div></li><li class="now"><b>Today</b><div><h5>One table</h5><p>Sundays, everyone, no phones.</p></div></li></ol>${folio(9, "r")}</div>`,
  // 9 · family tree
  `<div class="pg ftree" style="--c:${BK.leaf}"><span class="eyebrow">04 · Who sits where</span><h4>The table, drawn</h4>
    <svg class="lines" viewBox="0 0 100 100" aria-hidden="true"><path d="M50 41 V45 M24 45 H76 M24 45 V50 M76 45 V50 M76 71 V74 M58 80 H70" fill="none" stroke="#1d1d1f" stroke-width="1.1" stroke-linecap="round" opacity=".55"/></svg>
    <div class="node a">${portrait("gran", 17, BK.violet)}<b>Folake</b><span>Grandma</span></div>
    <div class="node b">${portrait("aunty", 15, BK.honey)}<b>Ngozi</b><span>Aunty</span></div>
    <div class="node c">${portrait("dad", 15, BK.teal)}<b>Tunde</b><span>Dad</span></div>
    <div class="node d">${portrait("mum", 15, BK.coral)}<b>Claire</b><span>Mum</span></div>
    <div class="node e">${portrait("kid", 13, "#5aa9e6")}<b>Ife</b><span>9, the asker</span></div>${folio(10, "l")}</div>`,
  // 10 · sayings
  `<div class="pg say" style="--c:${BK.violet}"><span class="eyebrow">05 · Sayings we live by</span><h4>Things we always say</h4>
    <div class="notes"><p style="--r:-3deg;--b:${BK.honey}">“Eat first, then talk.”<b>Folake</b></p><p style="--r:2.5deg;--b:#fff">“A guest is a gift.”<b>Tunde</b></p><p style="--r:-1.5deg;--b:${BK.coral}">“Ask it twice.”<b>Ngozi</b></p><p style="--r:3deg;--b:${BK.leaf}">“Write it down before it leaves.”<b>Ife, 9</b></p></div>${folio(11, "r")}</div>`,
  // 11 · back cover
  `<div class="pg bc"><img src="art/icons/mark-mono.svg" alt="" width="96" height="96"><p>23 stories. 6 voices. 3 generations.<br>2 hours and 14 minutes of people you love.</p><button class="cta" id="go3" type="button">Start your family's book</button><small>Made with Tell Me Again</small></div>`
];

function bookViews(wide) {
  if (!wide) return BOOK_PAGES.map((_, i) => [i]);
  return [[0], [1, 2], [3, 4], [5, 6], [7, 8], [9, 10], [11]];
}

function wireBook(root) {
  const host = root.querySelector("#sample-book"); if (!host) return () => {};
  const mq = window.matchMedia ? window.matchMedia("(min-width: 840px)") : { matches: true };
  let wide = !!mq.matches, views = bookViews(wide), at = 0, auto = null, touched = false, dir = 0;
  host.innerHTML = `<div class="bkstage" role="group" aria-roledescription="carousel" aria-label="Sample family book"><div class="leaves"></div></div>
    <div class="bkbar"><button class="bk-prev" type="button" aria-label="Previous pages">‹</button><div class="bkdots" role="tablist" aria-label="Pages"></div><button class="bk-next" type="button" aria-label="Next pages">›</button></div>`;
  const sheet = host.querySelector(".leaves"), dots = host.querySelector(".bkdots"), prev = host.querySelector(".bk-prev"), next = host.querySelector(".bk-next");
  const reduce = () => window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function draw() {
    const v = views[at]; sheet.className = `leaves n${v.length}${v[0] === 0 || v[0] === 11 ? " closed" : ""}`;
    // each page sits in its own sizing box, so the container units inside it are measured against the page itself
    sheet.innerHTML = v.map((i, k) => `<div class="pgw">${BOOK_PAGES[i].replace('class="pg ', `class="pg ${v.length === 2 ? (k === 0 ? "l " : "r ") : ""}`)}</div>`).join("");
    if (dir && !reduce()) { const t = dir > 0 ? sheet.querySelector(".pgw:last-child .pg") : sheet.querySelector(".pgw:first-child .pg"); if (t) t.classList.add(dir > 0 ? "turn-n" : "turn-p"); }
    dots.replaceChildren(...views.map((_, i) => { const b = document.createElement("button"); b.type = "button"; b.setAttribute("role", "tab"); b.setAttribute("aria-label", `Pages ${views[i][0] + 1}${views[i].length > 1 ? " and " + (views[i][1] + 1) : ""}`); b.setAttribute("aria-selected", i === at); b.onclick = () => go(i, true); return b; }));
    prev.disabled = at === 0; next.disabled = at === views.length - 1;
    const go3 = sheet.querySelector("#go3"); if (go3) go3.onclick = () => document.getElementById("go2")?.click();
  }
  function go(i, byHand) { if (byHand) stop(); i = Math.max(0, Math.min(views.length - 1, i)); if (i === at) return; dir = i > at ? 1 : -1; at = i; draw(); }
  function stop() { touched = true; clearInterval(auto); auto = null; }
  prev.onclick = () => go(at - 1, true); next.onclick = () => go(at + 1, true);
  host.addEventListener("keydown", (e) => { if (e.key === "ArrowRight") { e.preventDefault(); go(at + 1, true); } else if (e.key === "ArrowLeft") { e.preventDefault(); go(at - 1, true); } });
  let x0 = null; host.addEventListener("pointerdown", (e) => { x0 = e.clientX; }); host.addEventListener("pointerup", (e) => { if (x0 !== null && Math.abs(e.clientX - x0) > 40) go(at + (e.clientX < x0 ? 1 : -1), true); x0 = null; });
  const onResize = () => { const w = !!mq.matches; if (w !== wide) { const first = views[at][0]; wide = w; views = bookViews(w); at = Math.max(0, views.findIndex((v) => v.includes(first))); dir = 0; draw(); } };
  if (mq.addEventListener) mq.addEventListener("change", onResize);
  host.addEventListener("pointerenter", () => { if (auto) { clearInterval(auto); auto = null; } });
  host.addEventListener("pointerleave", () => { if (!touched && !auto && host.__on) start(); });
  function start() { if (reduce() || touched || auto) return; auto = setInterval(() => { if (!host.isConnected || at >= views.length - 1) { clearInterval(auto); auto = null; return; } go(at + 1, false); }, 4600); }
  host.__run = (on) => { host.__on = on; if (on) start(); else if (auto) { clearInterval(auto); auto = null; } };
  draw();
  return () => { clearInterval(auto); if (mq.removeEventListener) mq.removeEventListener("change", onResize); };
}
