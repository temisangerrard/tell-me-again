"use strict";
// Landing, sign in, onboarding steps, people list
/* ---------- onboarding ---------- */
const FAQ = `<div class="faq">
      <details><summary>Does my family need an account?</summary><p>No. Start your family on this device and share a room link. Guests enter their name to join. Account sign-in is still in development.</p></details>
      <details><summary>Where do the recordings go?</summary><p>Recordings and transcripts stay on the device that saves them. Download a copy to keep a backup. If you choose transcription, that recording is sent to the speech service for processing.</p></details>
      <details><summary>Can we speak our own language?</summary><p>You can record in any language. Transcription offers English, French, Portuguese, Arabic, Yoruba, Hausa and Swahili; accuracy varies. Igbo and Nigerian Pidgin aren't supported yet.</p></details>
      <details><summary>What can we make today?</summary><p>Record and download audio, edit transcripts, back up your family archive, and make a magazine to print or save as PDF. Storybooks and films are previews.</p></details>
    </div>`;
function welcome() {
  const el = $(`<section class="welcome">
    <header class="wtop"><div class="mark"><img src="art/icons/mark.svg" alt="" width="34" height="34">Tell me again</div><div class="acts"><button class="themebtn" type="button" id="th"><i></i>Theme</button><button class="signin" type="button" id="si">Sign in</button></div></header>
    <div class="landing-hero">
      <div class="hero2">
        <h1>Keep the stories only <mark>your family</mark> can tell.</h1>
        <p class="sub">Ask a good question. Record their voice. Save the names, recipes and memories you want the next generation to know.</p>
        <div class="row"><button class="cta" id="go" type="button">Start your family</button><a class="textlink" href="#product-example">See an example ↓</a></div>
        <p class="fine">Free to start. Your family can join by link.</p>
      </div>
      <section class="example" id="product-example" aria-label="Explore a product example">
        <div class="example-nav" role="group" aria-label="Steps in a family story">
          <button type="button" data-example="ask" aria-pressed="true" aria-controls="example-stage">01 Ask</button>
          <button type="button" data-example="keep" aria-pressed="false" aria-controls="example-stage">02 Keep</button>
          <button type="button" data-example="make" aria-pressed="false" aria-controls="example-stage">03 Make</button>
        </div>
        <div class="example-stage" id="example-stage"></div>
      </section>
    </div>
    ${landingBody(FAQ)}
    <footer class="foot"><span>Made by Settley Studio</span><button type="button" id="restore-welcome">Restore backup</button><button type="button" id="pvl">Privacy</button><a href="mailto:${PRIVACY_MAIL}">Contact</a></footer>
  </section>`);
  host.append(el); wireLanding(el);
  let questionIndex = 0;
  const questions = QUESTIONS.filter(x => x.c === "food" && x.d <= 2);
  const stage = el.querySelector("#example-stage");
  const showExample = kind => {
    el.querySelectorAll("[data-example]").forEach(b => b.setAttribute("aria-pressed", b.dataset.example === kind));
    stage.dataset.kind = kind; // each step of the example has its own colour
    if (kind === "ask") {
      const q = questions[questionIndex % questions.length];
      stage.innerHTML = `<span class="sample-label">Food & the table</span><h2 class="sample-question">${esc(q.q)}</h2><p class="fine">${esc(q.f[0])}</p><button class="btn" type="button">Try another question ↗</button><div class="sample-seats"><i>You</i><i>P</i></div>`;
      stage.querySelector("button").onclick = () => { questionIndex++; showExample("ask"); };
    } else if (kind === "keep") {
      stage.innerHTML = `<span class="sample-label">Fictional story example</span><p class="sample-quote">“On Sundays, we all ended up in my mother's kitchen.”</p><svg class="sample-wave" viewBox="0 0 320 64" aria-hidden="true">${Array.from({length:48},(_,i) => { const h = 6 + Math.abs(Math.sin(i * 1.7) * Math.cos(i * .31)) * 48; return `<rect x="${i*6.7}" y="${32-h/2}" width="3" height="${h}" rx="1.5" fill="currentColor"/>`; }).join("")}</svg><div class="sample-transcript"><small>EXAMPLE TRANSCRIPT</small>She never wrote the recipe down. She would just say, “Come and watch.”</div>`;
    } else {
      stage.innerHTML = `<span class="sample-label">Fictional magazine example</span><div class="sample-spread"><div><span class="sample-label">The family table</span><h3>Sunday in her kitchen.</h3><p>Everyone had a job. Someone washed the rice. Someone set the table. And everyone waited for a taste.</p><span class="page-no">04 · A FAMILY STORY</span></div><div><p>Some things were measured by the handful. Others, by watching.</p><div class="recipe"><b>“Come and watch.”</b><p>A recipe remembered, in her own words.</p></div><span class="page-no">05 · FOOD & MEMORIES</span></div></div>`;
    }
  };
  el.querySelectorAll("[data-example]").forEach(b => b.onclick = () => showExample(b.dataset.example));
  showExample("ask");
  el.querySelector("#restore-welcome").onclick = () => { const b = $(`<div><h2>Restore backup</h2></div>`); backupControls(b, false); const close = sheet("Restore backup", b); b.append(closeBtn(close)); };
  el.querySelector("#pvl").onclick = privacySheet;
  el.querySelector("#go").onclick = () => go(1); el.querySelector("#go2").onclick = () => go(1);
  el.querySelector("#si").onclick = () => authScreen("in");
  el.querySelector("#th").onclick = themePicker;
}

// The signed-in account, if there is one. Everything else still works without it; the account only holds an email address for now.
let account = null;
async function refreshAccount() { try { const r = await fetch("/api/me"); account = r.ok ? (await r.json()).user : null; } catch { /* offline: keep what we knew */ } return account; }
async function signOut(wipe) { // true only when the server confirmed; otherwise the account stays and the caller says so
  try { const r = await fetch(wipe ? "/api/account/delete" : "/api/auth/logout", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }); if (!r.ok) return false; } catch { return false; }
  account = null; return true;
}
// After a good code: say so, then carry on (to the Family tab if there is a family, where the account is shown).
function signedInScreen() {
  app.className = "app"; app.replaceChildren();
  const el = $(`<section class="authwrap"><h1>You're in.</h1><p class="sub">Signed in as <b>${esc(account && account.email || "")}</b>. Your family and recordings stay on this device. You can sign out or delete the account any time under Family.</p><button class="cta" id="ok" type="button">Continue</button></section>`);
  app.append(el); host = app;
  el.querySelector("#ok").onclick = () => { render(); if (S.step === 7) { const f = document.querySelector('[data-t="family"]'); if (f) f.click(); } };
  el.querySelector("#ok").focus();
}
// Sign in / create account. Email code first, passkey after that. The server answers "not yet" until accounts are switched on.
function authScreen(mode = "up") {
  app.className = "app"; app.replaceChildren();
  const el = $(`<section class="authwrap">
    <div class="top"><button class="back" id="ab" aria-label="Back" type="button">${ICON.back}</button></div>
    <h1 id="ah"></h1>
    <div class="seg" role="group" aria-label="Create an account or sign in"><button type="button" data-m="up" aria-pressed="false">Create account</button><button type="button" data-m="in" aria-pressed="false">Sign in</button></div>
    <label class="field" id="ef"><span class="lbl">Email</span><input class="inp sm" id="em" type="email" inputmode="email" autocomplete="email" autocapitalize="none" spellcheck="false" placeholder="you@example.com"></label>
    <label class="field" id="cf" hidden><span class="lbl">Code</span><input class="inp" id="cd" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="000000"></label>
    <button class="cta" id="go" type="button">Email me a code</button>
    <button class="btn ghost" id="skip" type="button" style="color:var(--muted)">Continue without an account</button>
    <p class="msg" id="mg" role="status"></p>
    <p class="legal">By continuing you accept the <button type="button" id="pv">privacy notice</button>.</p></section>`);
  app.append(el); host = app;
  const $e = (i) => el.querySelector(i), msg = (t, bad) => { $e("#mg").textContent = t; $e("#mg").className = "msg" + (bad ? " bad" : ""); };
  let step = "email";
  const paint = () => {
    $e("#ah").textContent = mode === "up" ? "Create your account" : "Sign in";
        el.querySelectorAll(".seg button").forEach((b) => b.setAttribute("aria-pressed", b.dataset.m === mode));
    $e("#cf").hidden = step === "email"; $e("#go").textContent = step === "email" ? "Email me a code" : "Check the code";
  };
  el.querySelectorAll(".seg button").forEach((b) => b.onclick = () => { mode = b.dataset.m; step = "email"; msg(""); paint(); });
  $e("#ab").onclick = () => render(); $e("#skip").onclick = () => (S.step > 0 ? render() : go(1)); $e("#pv").onclick = privacySheet;
  $e("#go").onclick = async () => {
    const email = $e("#em").value.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return msg("That email doesn't look right.", true);
    const b = $e("#go"); b.disabled = true; msg("");
    try {
      const r = await fetch(step === "email" ? "/api/auth/start" : "/api/auth/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, code: $e("#cd").value.trim(), mode }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) msg(j.error || "Something went wrong. Try again.", true);
      else if (step === "email") { step = "code"; paint(); msg("Code sent."); $e("#cd").focus(); }
      else { account = j.user || null; signedInScreen(); }
    } catch { msg("We couldn't reach the server. Check your connection.", true); }
    b.disabled = false;
  };
  paint(); $e("#em").focus({ preventScroll: true });
}

function nameStep() {
  const el = screen(1, "What's your family called?", "", `
    <label class="field"><span class="lbl">Family name</span>
      <input class="inp" id="name" type="text" maxlength="40" autocomplete="off" enterkeyhint="next" value="${esc(S.name)}" placeholder="e.g. ${pick(SUR)}"></label>
    <label class="field"><span class="lbl">Your name</span>
      <input class="inp sm" id="myname" type="text" maxlength="30" autocomplete="off" enterkeyhint="next" value="${esc(S.me.name)}"></label>
    <label class="field"><span class="lbl">A saying your family lives by <small>(optional)</small></span>
      <input class="inp sm" id="saying" type="text" maxlength="90" autocomplete="off" enterkeyhint="next" value="${esc(S.saying)}" placeholder="The one your mum always says"></label>
    `);
  const sync = () => { S.name = el.querySelector("#name").value.trim(); S.saying = el.querySelector("#saying").value.trim(); S.me.name = el.querySelector("#myname").value.trim(); if (S.me.name) lsSet("sitting-name", S.me.name); reseat(); save(); el.querySelector("#n").disabled = !famName(S.name); };
  el.querySelectorAll("input").forEach((i) => i.oninput = sync); sync(); enterNext(el, () => go(2));
}

function colorStep() {
  const el = screen(2, "Pick your colour", "", `
    <div class="preview"><div class="tile xl">${esc(initial(famName(S.name) || "?"))}</div>
      <div style="min-width:0"><div class="nm">${esc(famName(S.name) || "Your family")}</div><div class="sg">${esc(S.saying)}</div></div></div>
    <div class="swatches" role="group" aria-label="Family colour"></div>`);
  const box = el.querySelector(".swatches");
  COLORS.forEach(([v, l]) => {
    const b = $(`<button class="sw" type="button" aria-label="${l}" title="${l}" style="background:${v}"></button>`);
    b.setAttribute("aria-pressed", S.color === v);
    b.onclick = () => { S.color = v; box.querySelectorAll(".sw").forEach((x) => x.setAttribute("aria-pressed", "false")); b.setAttribute("aria-pressed", "true"); applyColor(); save(); };
    box.append(b);
  });
}

function startStep() {
  const el = screen(3, "Where does your story start?", "", `
    <label class="field"><span class="lbl">Town or city your people come from</span>
      <input class="inp sm" id="town" type="text" maxlength="60" autocomplete="off" enterkeyhint="done" value="${esc(S.town)}" placeholder="e.g. ${pick(PLACE)}"></label>
    <div class="field"><span class="lbl" id="hl">Heritage</span>
      <div class="chips" id="hc" role="group" aria-labelledby="hl"></div></div>
    <label class="field"><span class="lbl">Not listed? Add your own</span>
      <input class="inp sm" id="own" type="text" maxlength="40" autocomplete="off" enterkeyhint="done" placeholder="Type it and press Enter"></label>`);
  heritageUI(el.querySelector("#hc"), el.querySelector("#own"));
  el.querySelector("#town").oninput = (e) => { S.town = e.target.value.trim(); save(); };
}
function heritageUI(box, own) { // chips for any that apply, plus an "add your own" field (used in onboarding and on the Family tab)
  const tail = ["Mixed", "Not sure yet", "Somewhere else"];
  const chip = (v) => { const b = $(`<button class="chip" type="button" aria-pressed="${S.heritage.includes(v)}">${esc(v)}</button>`);
    b.onclick = () => { S.heritage = S.heritage.includes(v) ? S.heritage.filter((x) => x !== v) : [...S.heritage, v]; b.setAttribute("aria-pressed", S.heritage.includes(v)); save(); }; return b; };
  [...new Set([...HERITAGE, ...S.heritage.filter((h) => !HERITAGE.includes(h) && !tail.includes(h)), ...tail])].forEach((v) => box.append(chip(v)));
  own.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return; e.preventDefault(); e.stopPropagation();
    const v = e.target.value.trim(); if (!v || S.heritage.includes(v)) { e.target.value = ""; return; }
    S.heritage.push(v); save(); const c = chip(v); box.append(c); e.target.value = ""; c.scrollIntoView({ block: "nearest" });
  });
}

function makeStep() {
  const el = screen(4, "What do you want to make?", "", `<div class="picks"></div>`);
  const box = el.querySelector(".picks");
  MAKES.forEach(([id, t, d, ic]) => {
    const b = $(`<button class="pick" type="button"><span class="ico">${ic}</span><span><b>${t}</b><span class="d">${d}</span></span></button>`);
    b.setAttribute("aria-pressed", S.makes.includes(id));
    b.onclick = () => { S.makes = S.makes.includes(id) ? S.makes.filter((x) => x !== id) : [...S.makes, id]; b.setAttribute("aria-pressed", S.makes.includes(id)); save(); };
    box.append(b);
  });
}

function topicsStep() {
  const el = screen(5, "What do you want to know about?", "", `<div class="chips" id="ch" role="group" aria-label="Topics"></div>`);
  const box = el.querySelector("#ch"), n = el.querySelector("#n");
  CHAPTERS.forEach((ch) => {
    const b = $(`<button class="chip" type="button" title="${esc(ch.blurb)}">${esc(ch.label)}</button>`);
    b.setAttribute("aria-pressed", S.chapters.includes(ch.id));
    b.onclick = () => { S.chapters = S.chapters.includes(ch.id) ? S.chapters.filter((x) => x !== ch.id) : [...S.chapters, ch.id]; b.setAttribute("aria-pressed", S.chapters.includes(ch.id)); save(); n.disabled = !S.chapters.length; };
    box.append(b);
  });
  n.disabled = !S.chapters.length;
}

function inviteStep() {
  const el = screen(6, "Who's in your family?", "", ``, "Done");
  peopleEditor(el.querySelector(".content"));
  el.querySelector("#n").onclick = () => { reseat(); go(7); };
}

// A plain list of the people you'll record or play with. Birth year is optional and only used for era prompts.
const relSel = (v, label = "Who they are to you") => `<select class="rel" aria-label="${label}"><option value="">Who are they to you?</option>${RELATIONS.map(([k, t]) => `<option value="${k}"${k === v ? " selected" : ""}>${t}</option>`).join("")}</select>`;
function peopleEditor(parent, o = {}) {
  S.people ||= [];
  const wrap = $(`<div class="people"><ul class="plist"></ul><div class="padd"><input class="inp sm" type="text" maxlength="40" autocomplete="off" enterkeyhint="done" placeholder="Add a name" aria-label="Add a name"><button class="btn" type="button">Add</button></div></div>`);
  const ul = wrap.querySelector("ul"), inp = wrap.querySelector("input");
  const draw = () => ul.replaceChildren(...S.people.map((p, i) => {
    const li = $(`<li>${avHTML(p, p.n, 32)}<span class="pn">${esc(p.n)}</span>${relSel(p.rel, `Who ${esc(p.n)} is to you`)}${o.born ? `<input class="by" type="text" inputmode="numeric" maxlength="4" placeholder="Born" aria-label="Year ${esc(p.n)} was born" value="${esc(p.born || "")}">` : ""}<button class="x" type="button" aria-label="Remove ${esc(p.n)}">×</button></li>`);
    avPaint(li); li.querySelector(".rel").onchange = (e) => { if (e.target.value) p.rel = e.target.value; else delete p.rel; save(); };
    const by = li.querySelector(".by"); if (by) by.oninput = () => { by.value = by.value.replace(/\D/g, "").slice(0, 4); p.born = by.value; save(); };
    li.querySelector(".x").onclick = () => { S.people.splice(i, 1); save(); draw(); };
    return li;
  }));
  const add = () => { const n = inp.value.trim(); if (!n) return; if (!S.people.some((p) => p.n.toLowerCase() === n.toLowerCase())) S.people.push({ n, born: "" }); inp.value = ""; save(); draw(); inp.focus(); };
  wrap.querySelector(".btn").onclick = add; inp.onkeydown = (e) => { if (e.key === "Enter") { e.preventDefault(); add(); } };
  draw(); parent.append(wrap); return wrap;
}

