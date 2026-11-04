"use strict";
// The landing page below the hero: bold colour blocks you scroll through, a small cast of animated characters, and the three
// games running live (Ayo and Whot are the real engines, bot against bot). Nothing here makes a sound or leaves the page.

// ---- the cast: flat shapes in the app's colours, with a few idle animations (bob, blink, wave, talk)
function character(o = {}) {
  const { skin = "#c68642", shirt = "#7c5ad6", hair = "#1d1d1f", style = "puff", glasses = false, flip = false, cls = "", label = "", d = 0, size = 1 } = o;
  const top = style === "puff" ? `<circle cx="60" cy="38" r="26" fill="${hair}"/>` : style === "cap" ? `<path d="M31 60 a29 29 0 0 1 58 0 z" fill="${hair}"/>` : style === "wrap" ? `<path d="M30 58 a30 28 0 0 1 60 0 q-30 -10 -60 0z" fill="${hair}"/><circle cx="60" cy="24" r="11" fill="${hair}"/>` : "";
  return `<svg class="ch ${cls}" viewBox="0 0 120 176" role="img" aria-label="${esc(label)}" style="--d:${d}s;width:${Math.round(120 * size)}px${flip ? ";transform:scaleX(-1)" : ""}">
    <g class="ch-bob">
      <g class="ch-arm l"><rect x="12" y="98" width="15" height="48" rx="7.5" fill="${shirt}"/><circle cx="19.5" cy="150" r="8" fill="${skin}"/></g>
      <path d="M26 176 V124 a34 34 0 0 1 34-34 a34 34 0 0 1 34 34 V176 Z" fill="${shirt}"/>
      <g class="ch-arm r"><rect x="93" y="98" width="15" height="48" rx="7.5" fill="${shirt}"/><circle cx="100.5" cy="150" r="8" fill="${skin}"/></g>
      <rect x="52" y="84" width="16" height="14" rx="6" fill="${skin}"/>${top}
      <circle cx="60" cy="62" r="29" fill="${skin}"/>
      <g class="ch-eyes"><ellipse cx="50" cy="62" rx="3.2" ry="4" fill="#1d1d1f"/><ellipse cx="70" cy="62" rx="3.2" ry="4" fill="#1d1d1f"/></g>
      ${glasses ? `<g fill="none" stroke="#1d1d1f" stroke-width="2.4"><circle cx="50" cy="62" r="9"/><circle cx="70" cy="62" r="9"/><path d="M59 62 h2"/></g>` : ""}
      <path class="ch-mouth" d="M51 76 q9 8 18 0" fill="none" stroke="#1d1d1f" stroke-width="3" stroke-linecap="round"/>
    </g></svg>`;
}
// Pebble, the bot you can play against
const pebbleSVG = (d = 0) => `<svg class="ch pebble" viewBox="0 0 120 110" role="img" aria-label="Pebble, the bot" style="--d:${d}s;width:112px"><g class="ch-bob"><path d="M12 78 C6 40 38 14 66 16 C100 18 114 50 106 80 C100 104 22 108 12 78Z" fill="#8f8f95"/><path d="M30 40 C40 26 56 22 68 24" fill="none" stroke="#b9b9bf" stroke-width="5" stroke-linecap="round"/><g class="ch-eyes"><ellipse cx="46" cy="58" rx="4" ry="5" fill="#1d1d1f"/><ellipse cx="72" cy="58" rx="4" ry="5" fill="#1d1d1f"/></g><path class="ch-mouth" d="M48 74 q11 8 22 0" fill="none" stroke="#1d1d1f" stroke-width="3.4" stroke-linecap="round"/></g></svg>`;
const CAST = {
  gran: (o) => character({ skin: "#8d5a3b", shirt: "#7c5ad6", hair: "#f4f1ea", glasses: true, label: "Grandma", ...o }),
  kid: (o) => character({ skin: "#c68642", shirt: "#e26b3f", hair: "#1d1d1f", size: 0.8, label: "A child", ...o }),
  dad: (o) => character({ skin: "#5c3a21", shirt: "#2fa8a0", hair: "#1d1d1f", style: "cap", label: "Dad", ...o }),
  aunty: (o) => character({ skin: "#e0ac69", shirt: "#f0b232", hair: "#7c5ad6", style: "wrap", label: "Aunty", ...o }),
  mum: (o) => character({ skin: "#f1c27d", shirt: "#6db56d", hair: "#2b1a12", label: "Mum", ...o })
};

function landingBody(faqHTML) {
  const rows = ["Where did you grow up?", "Who chose your name?", "What did Sunday smell like?", "What's the first thing you cooked?", "Who taught you to dance?", "What did you want to be?"];
  const band = rows.map((r) => `<span>${esc(r)}</span><i aria-hidden="true">●</i>`).join("");
  return `
  <div class="lp">
    <div class="marquee blk coral" aria-hidden="true"><div class="track">${band}${band}</div></div>

    <section class="blk honey sit" aria-labelledby="h-sit">
      <div class="in"><div class="copy" data-reveal><span class="kick">01 Sit</span><h2 id="h-sit">Ask one good question.</h2>
        <p>We hand you a question that gets a story, not a yes or a no. Press record, then stay quiet: the pause does the work. If they go quiet, the follow-ups written for that question are right there.</p>
        <ul class="tick"><li>A question for every topic: names, home, food, work, love, faith</li><li>Follow-ups and a coaching line for whoever is asking</li><li>Recorded on your phone, and it stays there</li></ul></div>
        <div class="scene" data-reveal>
          <div class="talkers">${CAST.gran({ cls: "talk", d: 0.2 })}${CAST.kid({ flip: true, d: 0.9 })}</div>
          <div class="bubble q"><small>Question</small>What did Sunday smell like?</div>
          <div class="bubble a"><small>Her answer</small>Pepper soup, and her perfume.</div>
          <svg class="bars" viewBox="0 0 240 40" aria-hidden="true">${Array.from({ length: 40 }, (_, i) => `<rect x="${i * 6}" y="${20 - (6 + ((i * 7) % 5) * 3)}" width="3.4" rx="1.7" height="${12 + ((i * 7) % 5) * 6}" style="--i:${i}"/>`).join("")}</svg>
        </div></div>
    </section>

    <section class="blk teal play" aria-labelledby="h-play">
      <div class="in col"><div class="copy wide" data-reveal><span class="kick">02 Play</span><h2 id="h-play">Play while they talk.</h2>
        <p>People open up when their hands are busy. Play between questions: online on separate phones, against a bot when you're short of people, or pass one phone around the table.</p></div>
        <div class="games">
          <article class="gcard" data-reveal><div class="demo" id="demo-ludo" aria-label="Ludo playing itself"></div><h3>Ludo</h3><p>Roll, race four tokens home, and send a rival back to start.</p><span class="meta">2 to 4 players</span></article>
          <article class="gcard" data-reveal><div class="demo" id="demo-ayo" aria-label="Ayo playing itself"></div><h3>Ayo</h3><p>Sow seeds around twelve pits. Land a pit of two or three on their side and you capture it.</p><span class="meta">2 players</span></article>
          <article class="gcard" data-reveal><div class="demo" id="demo-whot" aria-label="Whot playing itself"></div><h3>Whot</h3><p>Match the shape or the number. A 2 or a 5 makes the next player pick up; a 14 sends everyone to market.</p><span class="meta">2 to 4 players</span></article>
        </div>
        <div class="botnote" data-reveal>${pebbleSVG(0.3)}<p><b>Meet Pebble.</b> Short of people? Add a bot to the table in one tap and play right away. Anyone who joins later can take Pebble's seat.</p></div>
      </div>
    </section>

    <section class="blk violet make" aria-labelledby="h-make">
      <div class="in col"><div class="copy wide" data-reveal><span class="kick">03 Make</span><h2 id="h-make">Turn the answers into something to keep.</h2>
        <p>Everything they say becomes material. Pick the stories you want and make a magazine to print or save as a PDF. Storybooks and short films are previews for now.</p></div>
        <div class="arts">
          <div class="art mag" data-reveal><small>Issue 01</small><b>The family<br>issue</b><span>Ready to print</span></div>
          <div class="art book" data-reveal><small>Page 3</small><p>“On Sundays, we all ended up in my mother's kitchen.”</p><span>Preview</span></div>
          <div class="art film" data-reveal><i aria-hidden="true"></i><b>The family short</b><span>Preview</span></div>
        </div></div>
    </section>

    <section class="blk sky far" aria-labelledby="h-far">
      <div class="in"><div class="copy" data-reveal><span class="kick">04 Far away</span><h2 id="h-far">Far away? Pull up a chair anyway.</h2>
        <p>Send a link. They tap it and you're on a voice call inside the app, with the question on both screens. Your phone records the answer. No account and no extra app. Open the link in Safari or Chrome, not inside another app.</p>
        <ol class="steps"><li>Pick who's joining</li><li>Send each of them a link</li><li>Start the call and ask</li></ol></div>
        <div class="scene calls" data-reveal>
          <div class="phone">${CAST.aunty({ cls: "talk", d: 0.1, size: 0.9 })}</div>
          <svg class="link" viewBox="0 0 120 60" aria-hidden="true"><path d="M4 30 C40 4 80 56 116 30" fill="none" stroke="#1d1d1f" stroke-width="3" stroke-dasharray="6 7" stroke-linecap="round"/><circle class="pulse" r="5" fill="#1d1d1f"><animateMotion dur="2.4s" repeatCount="indefinite" path="M4 30 C40 4 80 56 116 30"/></circle></svg>
          <div class="phone">${CAST.dad({ flip: true, d: 0.7, size: 0.9 })}</div>
        </div></div>
    </section>

    <section class="blk leaf family" aria-labelledby="h-fam">
      <div class="in col"><div class="copy wide" data-reveal><span class="kick">05 Family</span><h2 id="h-fam">See who needs a story next.</h2>
        <p>Add everyone you love. The Sit tab shows who you haven't asked yet, which topics are covered for each person, and suggests the next question to ask them.</p></div>
        <div class="roster" data-reveal>
          ${[["gran", "Grandma", 8], ["dad", "Dad", 5], ["aunty", "Aunty", 3], ["mum", "Mum", 6], ["kid", "Ife", 1]].map(([k, n, c], i) => `<div class="mem">${CAST[k]({ d: i * 0.35, cls: i % 2 ? "" : "wave" })}<b>${n}</b><svg class="rg" viewBox="0 0 34 34" aria-label="${c} of 10 topics"><circle cx="17" cy="17" r="14" fill="none" stroke="rgba(29,29,31,.2)" stroke-width="4"/><circle class="fill" cx="17" cy="17" r="14" fill="none" stroke="#1d1d1f" stroke-width="4" stroke-linecap="round" stroke-dasharray="${(c / 10 * 88).toFixed(1)} 88" transform="rotate(-90 17 17)"/></svg></div>`).join("")}
        </div></div>
    </section>

    <section class="blk ink private" aria-labelledby="h-pri">
      <div class="in"><div class="copy" data-reveal><span class="kick">Private by design</span><h2 id="h-pri">Yours, not ours.</h2>
        <p>These are voices and memories. We built it so the recordings stay with you.</p></div>
        <ul class="pri" data-reveal><li><b>Recordings stay on your phone</b><span>We don't keep a copy on our servers.</span></li><li><b>Speech to text only if you ask</b><span>The audio is sent, the words come back, and it isn't kept.</span></li><li><b>No ads</b><span>Nobody is paying to be in front of your family.</span></li><li><b>Delete or download it all</b><span>One tap each, under Family.</span></li></ul></div>
    </section>

    <section class="how2" aria-label="How Tell Me Again works"><div class="in"><h2 data-reveal>How it works</h2>
      <ol class="hw"><li data-reveal><span>01</span><b>Bring someone you love.</b><p>Sit side by side, or send a link for a voice call. They don't need an account.</p></li><li data-reveal><span>02</span><b>Follow a good question.</b><p>Choose topics. Use the follow-ups to find the story behind the first answer.</p></li><li data-reveal><span>03</span><b>Keep their own words.</b><p>Save the recording. Turn it into text if you choose, then check and fix the names and places.</p></li><li data-reveal><span>04</span><b>Make something.</b><p>Build a magazine from the stories you pick, and play a game while the next question sinks in.</p></li></ol></div></section>

    <section aria-label="Common questions" class="faqwrap">${faqHTML}</section>

    <section class="blk coral endblk"><div class="in col center" data-reveal><div class="cast">${CAST.gran({ cls: "wave", d: 0 })}${CAST.aunty({ d: 0.3, cls: "wave" })}${CAST.mum({ d: 0.6 })}${CAST.dad({ d: 0.9, cls: "wave" })}${CAST.kid({ d: 1.2 })}</div><h2>Someone's still around to ask.</h2><button class="cta" id="go2" type="button">Start your family</button></div></section>
  </div>`;
}

// ---- reveal on scroll, and the three live games (each runs only while on screen, and stops when the page is gone)
function wireLanding(root) {
  root.classList.add("js"); let reported = false;
  const io = typeof IntersectionObserver === "function" ? new IntersectionObserver((es) => { reported = true; es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("shown"); io.unobserve(e.target); } }); }, { threshold: 0.12 }) : null;
  root.querySelectorAll("[data-reveal]").forEach((n) => (io ? io.observe(n) : n.classList.add("shown")));
  const lp = io ? new IntersectionObserver((es) => { reported = true; es.forEach((e) => { const r = e.target.__run; if (r) r(e.isIntersecting); }); }, { threshold: 0.15 }) : null;
  const loop = (node, start) => {
    if (!node) return; let stop = null;
    node.__run = (on) => { if (on && !stop) stop = start(node); else if (!on && stop) { stop(); stop = null; } };
    if (lp) lp.observe(node); else node.__run(true);
  };
  // If the browser never reports anything (some embedded views), fall back to checking on scroll so nothing stays hidden.
  const sweep = () => {
    if (!root.isConnected) { window.removeEventListener("scroll", sweep); window.removeEventListener("resize", sweep); return; }
    const vh = window.innerHeight || 800;
    root.querySelectorAll("[data-reveal]:not(.shown)").forEach((n) => { if (n.getBoundingClientRect().top < vh * 0.92) n.classList.add("shown"); });
    root.querySelectorAll(".demo").forEach((n) => { const r = n.getBoundingClientRect(); if (!n.__run || (r.width === 0 && r.height === 0)) return; /* no layout: can't tell, leave it as it is */ n.__run(r.bottom > 0 && r.top < vh); });
  };
  setTimeout(() => { if (!reported && root.isConnected) { window.addEventListener("scroll", sweep, { passive: true }); window.addEventListener("resize", sweep); sweep(); } }, 1200);
  loop(root.querySelector("#demo-ludo"), ludoDemo);
  loop(root.querySelector("#demo-ayo"), ayoDemo);
  loop(root.querySelector("#demo-whot"), whotDemo);
}

function ludoDemo(box) {
  box.innerHTML = `<svg viewBox="0 0 15 15" role="img" aria-label="Ludo board">${boardSVG()}<g class="toks"></g></svg><div class="dicebar"><div class="roll" aria-hidden="true">${diceHTML(5)}</div></div>`;
  const toks = box.querySelector(".toks"), roll = box.querySelector(".roll"), ks = [0, 1, 2, 3], q = [-1, -1, -1, -1], els = [];
  ks.forEach((k) => { for (let i = 0; i < 1; i++) { const t = document.createElementNS("http://www.w3.org/2000/svg", "g"); t.setAttribute("class", "tok"); t.innerHTML = `<circle class="disc" r=".42" fill="${PCOL[k]}" stroke="var(--surface)" stroke-width=".1"/><circle r=".42" fill="none" stroke="#1d1d1f" stroke-opacity=".35" stroke-width=".05"/>`; toks.append(t); els[k] = t; placeTok(t, k, -1, 0, 1, true); } });
  let turn = 0;
  const id = setInterval(() => {
    if (!box.isConnected) return clearInterval(id);
    const k = turn++ % 4, d = 1 + Math.floor(Math.random() * 6);
    tumbleDice(roll, d, null, true);
    setTimeout(() => { if (!box.isConnected) return; if (q[k] < 0) { if (d === 6) { q[k] = 0; placeTok(els[k], k, 0, 0, 1, true); } return; } q[k] += d; if (q[k] > 50) { q[k] = -1; placeTok(els[k], k, -1, 0, 1, true); } else placeTok(els[k], k, q[k], 0, 1, true); }, 700);
  }, 1500);
  q[0] = 3; placeTok(els[0], 0, 3, 0, 1, true); q[2] = 20; placeTok(els[2], 2, 20, 0, 1, true);
  return () => clearInterval(id);
}

function ayoDemo(box) {
  const E = globalThis.Engines, order = [11, 10, 9, 8, 7, 6, 0, 1, 2, 3, 4, 5];
  box.innerHTML = `<div class="apits mini"></div><p class="cap" aria-live="off"></p>`;
  const grid = box.querySelector(".apits"), cap = box.querySelector(".cap");
  const pits = order.map((i) => { const b = document.createElement("div"); b.className = `pit ${i > 5 ? "b" : ""}`; grid.append(b); return [i, b]; });
  let s = E.ayo.init(["Ada", "Bo"]), timers = [];
  const draw = (p, hit = -1, cap_ = []) => pits.forEach(([i, b]) => { b.innerHTML = seedsHTML(p[i]); b.className = `pit ${i > 5 ? "b" : ""} ${i === hit ? "hit" : ""} ${cap_.includes(i) ? "hit" : ""} ${p[i] === 0 ? "zero" : ""}`; });
  draw(s.p); cap.textContent = "Ada's move";
  const step = () => {
    if (!box.isConnected) return;
    if (s.over !== null) { s = E.ayo.init(["Ada", "Bo"]); draw(s.p); cap.textContent = "New game"; timers.push(setTimeout(step, 1400)); return; }
    const who = s.turn, a = E.ayo.bot(s, who), p = s.p.slice(); E.ayo.act(s, who, a);
    const L = s.last; p[L.pit] = 0; draw(p, -1);
    L.steps.forEach((c, k) => timers.push(setTimeout(() => { p[c]++; draw(p, c); }, 130 * (k + 1))));
    const t = 130 * (L.steps.length + 1);
    timers.push(setTimeout(() => { if (L.caps.length) { L.caps.forEach((c) => { p[c] = 0; }); draw(p, L.steps[L.steps.length - 1], L.caps); cap.textContent = `${["Ada", "Bo"][L.seat]} captured ${L.got}`; } else cap.textContent = `${["Ada", "Bo"][s.turn]}'s move`; }, t));
    timers.push(setTimeout(step, t + (L.caps.length ? 1300 : 800)));
  };
  timers.push(setTimeout(step, 1000));
  return () => timers.forEach(clearTimeout);
}

function whotDemo(box) {
  const E = globalThis.Engines; let s = E.whot.init(["You", "Pebble"]), timer = null;
  box.innerHTML = `<div class="whot"><div class="stg"></div></div><p class="cap" aria-live="off"></p>`;
  const stg = box.querySelector(".stg"), cap = box.querySelector(".cap");
  const render = () => {
    const before = cardSnapshot(box), v = E.whot.view(s, 0);
    stg.replaceChildren();
    const piles = $(`<div class="piles"></div>`); piles.append($(`<div class="wc back" aria-hidden="true"><small>${v.deckN} left</small></div>`), wcardEl(v.top, "big", "div"));
    const hand = $(`<div class="hand" aria-hidden="true"></div>`); v.hand.forEach((c) => hand.append(wcardEl(c, "", "div")));
    stg.append(piles, hand); cap.textContent = s.pickShape ? `${s.names[s.turn]} played Whot and calls a shape` : s.msg;
    cardSettle(box, before, true);
  };
  render();
  const step = () => {
    if (!box.isConnected) return;
    if (s.over !== null) { s = E.whot.init(["You", "Pebble"]); render(); timer = setTimeout(step, 1600); return; }
    const a = E.whot.bot(s, s.turn); if (a) E.whot.act(s, s.turn, a); render(); timer = setTimeout(step, 1500);
  };
  timer = setTimeout(step, 1300);
  return () => clearTimeout(timer);
}
