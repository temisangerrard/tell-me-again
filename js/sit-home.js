"use strict";
// The Sit tab at rest: a dashboard for the family. Who to talk to next, how each person's story is coming along, and what's
// been happening. A person opens their own page; a sitting opens from either and closes back to where you were.
const ago = (ts) => {
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return "just now"; if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h} h ago`;
  const d = Math.floor(h / 24); return d === 1 ? "yesterday" : d < 14 ? `${d} days ago` : new Date(ts).toLocaleDateString(undefined, { day: "numeric", month: "short" });
};
let personView = null; // whose page is open on the Sit tab, if any
let pinnedQ = null;    // the question "Next up" suggested, asked first in the sitting it starts
const renderSit = (box, msg) => (sitting ? renderSitting(box, msg) : personView ? renderPerson(box, personView, msg) : renderSitHome(box, msg));

// Begin a sitting with these people (the first is the storyteller), or ask who when none are given.
async function beginSitting(box, names, question) {
  if (names) applySitting(names); else await chooseSitting();
  if (!sitting) return;
  pinnedQ = question || null; personView = null; renderSitting(box);
}

// ---- what we know about each person, from the recordings that say who spoke
const topicsOn = () => (S.chapters && S.chapters.length ? S.chapters : CHAPTERS.map((c) => c.id));
const chapterOfClip = (c) => { const q = QUESTIONS.find((x) => x.q === c.q); return q ? q.c : null; };
function personStats(p) {
  const mine = clips.filter((c) => c.who === p.n), topics = topicsOn();
  const covered = new Set(mine.map(chapterOfClip).filter((c) => c && topics.includes(c)));
  const last = mine.length ? Math.max(...mine.map((c) => c.at)) : 0;
  return { mine, covered, total: topics.length, last, stories: mine.length };
}
// Who most needs a story: never recorded first, then longest quiet; older relatives sooner. Higher score = sooner.
function needScore(p, st) {
  const days = st.last ? (Date.now() - st.last) / 86400000 : 9999;
  const born = parseInt(p.born, 10), age = born > 1900 ? new Date().getFullYear() - born : 0;
  return days + age / 5;
}
const orderedFamily = () => (S.people || []).map((p) => ({ p, st: personStats(p) })).sort((a, b) => needScore(b.p, b.st) - needScore(a.p, a.st));
// A question this person hasn't been asked about yet: a topic they haven't covered, else the next one in line.
function questionFor(p, st) {
  const asked = new Set(clips.map((c) => c.q)), topics = topicsOn();
  const open = questionsFor(p.rel).filter((q) => topics.includes(q.c) && !asked.has(q.q) && !S.asked.includes(q.q) && !st.covered.has(q.c)).sort((a, b) => a.d - b.d || !!b.for - !!a.for); // at the same depth, questions written for this relationship come first
  return open[0] || nextQuestion(p.n);
}
function ring(done, total, size = 34) {
  const r = 14, c = 2 * Math.PI * r, f = total ? Math.min(1, done / total) : 0;
  return `<svg class="ring" width="${size}" height="${size}" viewBox="0 0 34 34" role="img" aria-label="${done} of ${total} topics"><circle cx="17" cy="17" r="${r}" fill="none" stroke="var(--line)" stroke-width="4"/><circle cx="17" cy="17" r="${r}" fill="none" stroke="var(--accent)" stroke-width="4" stroke-linecap="round" stroke-dasharray="${(f * c).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 17 17)"/></svg>`;
}

const NEXTCOL = ["#f0b232", "#e26b3f", "#2fa8a0", "#5aa9e6", "#6db56d"];
function renderSitHome(box, msg) {
  const n = S.sittings.length, st = streak(), order = orderedFamily();
  const SEAS = ["#e26b3f", "#f0b232", "#6db56d", "#2fa8a0", "#5aa9e6", "#7c5ad6", "#e26b3f", "#f0b232"];
  box.replaceChildren($(`<div class="sithead"><div><h1 class="title">Sit together</h1><p class="sub">${n ? `${n} of ${SEASON} sittings done${st > 1 ? `, ${st} weeks running` : ""}` : "Season one starts here"}</p></div>${cast("pebble", { size: 92 })}</div>`),
    $(`<div class="season" role="img" aria-label="${Math.min(n, SEASON)} of ${SEASON} sittings done">${[...Array(SEASON)].map((_, i) => `<i class="${i < n ? "on" : ""}" style="--c:${SEAS[i % SEAS.length]}"></i>`).join("")}</div>`));
  if (msg) box.append($(`<p class="hint" role="status" style="margin-top:10px">${esc(msg)}</p>`));

  // Until the first recording exists, show the way: three steps, the current one open.
  if (!clips.length && !(S.lore && Object.keys(S.lore.clips || {}).length)) {
    const has = (S.people || []).length > 0, sat = S.sittings.length > 0;
    const steps = [["Add someone you want to hear from", "A parent, a grandparent, an aunt. Anyone whose stories you want to keep.", has], ["Ask them one question", "We pick a good one and give you follow-ups. You ask, they talk. Nobody has to prepare.", sat], ["Keep it", "The recording stays on your phone. Play it back, share it, or turn it into a page later.", false]];
    const cur = steps.findIndex((x) => !x[2]);
    const first = $(`<section class="first"><h2>Your first story, in three steps</h2><ol>${steps.map(([t, d, done], i) => `<li class="${done ? "done" : i === cur ? "now" : ""}"><span class="num" aria-hidden="true">${done ? "✓" : i + 1}</span><div><b>${t}</b><p>${d}</p>${i === 0 && !has ? `<div class="padd"><input class="inp sm" type="text" maxlength="40" autocomplete="off" enterkeyhint="done" placeholder="Their name, e.g. Mum" aria-label="Their name"></div><div class="padd">${relSel("")}<button class="btn" type="button">Add</button></div>` : ""}</div></li>`).join("")}</ol></section>`);
    const fin = first.querySelector(".padd input"), fadd = () => { const v = fin.value.trim(); if (!v) return; S.people ||= []; S.people.push({ n: v, born: "", ...(first.querySelector(".rel").value ? { rel: first.querySelector(".rel").value } : {}) }); save(); renderSitHome(box, msg); };
    if (fin) { first.querySelector(".padd .btn").onclick = fadd; fin.onkeydown = (e) => { if (e.key === "Enter") { e.preventDefault(); fadd(); } }; }
    box.append(first);
  }

  // Next up: one person, one question.
  const top = order[0];
  if (top) {
    const q = questionFor(top.p, top.st), why = top.st.stories ? `Last recorded ${ago(top.st.last)}` : "No stories yet";
    const hue = NEXTCOL[hashStr(top.p.n) % NEXTCOL.length];
    const card = $(`<section class="nextup" style="--bk:${hue}"><div class="nutop">${avHTML(top.p, top.p.n, 72, "nuav")}<div><small>Next up · ${esc(why)}</small><b>${esc(top.p.n)}</b></div></div>${q ? `<p class="nuq">${esc(q.q)}</p>` : ""}<button class="cta" type="button">Sit with ${esc(top.p.n)}</button></section>`);
    avPaint(card);
    card.querySelector("button").onclick = () => beginSitting(box, [top.p.n], q);
    box.append(card);
  }
  const go = $(`<button class="btn wide" id="startsit" type="button" style="margin-top:12px">${top ? "Choose who's joining" : "Start a sitting"}</button>`);
  go.onclick = () => beginSitting(box); box.append(go);
  const lorebox = loreSection(box, (m) => renderSitHome(box, m || msg)); if (lorebox) box.append(lorebox);

  // The family, in the order they need a story.
  const fam = $(`<section><h2 class="sec">Family</h2><ul class="sitlist"></ul><div class="padd"><input class="inp sm" type="text" maxlength="40" autocomplete="off" enterkeyhint="done" placeholder="Add a name" aria-label="Add a name"><button class="btn" type="button">Add</button></div></section>`);
  order.forEach(({ p, st: s }) => {
    const li = $(`<li class="sitrow" style="--tint:${tintFor(p.n)}"><button class="sitopen" type="button" aria-label="Open ${esc(p.n)}">${avHTML(p, p.n, 40)}<span class="who"><b>${esc(p.n)}</b><em>${s.stories ? `${s.stories} ${s.stories === 1 ? "story" : "stories"} · ${ago(s.last)}` : "No stories yet"}</em></span>${ring(s.covered.size, s.total)}</button><button class="btn sitgo" type="button" aria-label="Sit with ${esc(p.n)}">Sit</button></li>`);
    avPaint(li);
    li.querySelector(".sitopen").onclick = () => { personView = p.n; renderSit(box); window.scrollTo(0, 0); };
    li.querySelector(".sitgo").onclick = () => beginSitting(box, [p.n], questionFor(p, s));
    fam.querySelector(".sitlist").append(li);
  });
  const inp = fam.querySelector("input"), add = () => { const v = inp.value.trim(); if (!v) return; S.people ||= []; if (!S.people.some((p) => p.n.toLowerCase() === v.toLowerCase())) S.people.push({ n: v, born: "" }); save(); renderSitHome(box, msg); box.querySelector(".padd input").focus(); };
  fam.querySelector(".padd .btn").onclick = add; inp.onkeydown = (e) => { if (e.key === "Enter") { e.preventDefault(); add(); } };
  box.append(fam);

  // What's been happening, newest first.
  const feed = [
    ...clips.map((c) => ({ t: c.at, title: c.q, sub: [c.who, fmtDur(c.dur), c.text ? `${c.text.trim().split(/\s+/).filter(Boolean).length} words` : ""].filter(Boolean).join(" · ") })),
    ...S.sittings.map((s) => ({ t: Date.parse(s.d) || 0, title: "Sitting wrapped up", sub: [s.r === "up" ? "Good one" : s.r === "down" ? "Tough one" : "", ...(s.t || [])].filter(Boolean).join(" · ") }))
  ].sort((a, b) => b.t - a.t).slice(0, 8);
  const act = $(`<section><h2 class="sec">Activity</h2>${feed.length ? `<ul class="feed"></ul>` : `<p class="hint">Nothing yet. Start a sitting to record the first story.</p>`}</section>`);
  feed.forEach((x) => act.querySelector(".feed").append($(`<li><b>${esc(x.title)}</b><span>${esc(x.sub)}${x.sub ? " · " : ""}${ago(x.t)}</span></li>`)));
  box.append(act);
  const lb = leaderboard(); if (lb) box.append(lb);

  if (clips.length) { // the library: every recording, with its words
    const sec = $(`<section><h2 class="sec">Recorded <span class="cnt">${clips.length} · ${fmtDur(clipTotal())}</span></h2><ul class="clips"></ul></section>`);
    clips.forEach((c) => sec.querySelector(".clips").append(clipRow(c, box)));
    box.append(sec);
  }
}

// One person: how their story is coming along, and everything they've said.
function renderPerson(box, name, msg) {
  const p = (S.people || []).find((x) => x.n === name);
  if (!p) { personView = null; return renderSitHome(box, msg); }
  const s = personStats(p), topics = topicsOn();
  const back = $(`<button class="btn gback" type="button">‹ Family</button>`); back.onclick = () => { personView = null; renderSit(box); };
  box.replaceChildren(back, $(`<h1 class="title">${esc(p.n)}</h1>`));
  if (msg) box.append($(`<p class="hint" role="status">${esc(msg)}</p>`));
  box.append($(`<p class="pmeta">${s.stories ? `${s.stories} ${s.stories === 1 ? "story" : "stories"} · last ${ago(s.last)}` : "No stories yet"}</p>`));
  const go = $(`<button class="cta" type="button" style="margin-top:14px">Sit with ${esc(p.n)}</button>`); go.onclick = () => beginSitting(box, [p.n], questionFor(p, s)); box.append(go);
  const cov = $(`<section><h2 class="sec">Topics <span class="cnt">${s.covered.size} of ${topics.length}</span></h2><div class="covs"></div></section>`);
  topics.forEach((id) => { const ch = CHAPTERS.find((c) => c.id === id); if (ch) cov.querySelector(".covs").append($(`<span class="cov ${s.covered.has(id) ? "on" : ""}">${esc(ch.label)}</span>`)); });
  box.append(cov);
  const det = $(`<section><div class="field"><span class="lbl">Who they are to you</span>${relSel(p.rel)}</div><label class="field"><span class="lbl">Year born <small>(optional)</small></span><input class="inp sm" type="text" inputmode="numeric" maxlength="4" value="${esc(p.born || "")}"></label></section>`);
  det.querySelector(".rel").onchange = (e) => { if (e.target.value) p.rel = e.target.value; else delete p.rel; save(); renderSit(box); };
  det.querySelector("input").oninput = (e) => { e.target.value = e.target.value.replace(/\D/g, "").slice(0, 4); p.born = e.target.value; save(); };
  box.append(det);
  const avs = $(`<details class="fold avfold"><summary><span class="avthumb">${avHTML(p, p.n, 36)}</span>Avatar</summary></details>`); avPaint(avs); avatarEditor(avs, p.av, (c) => { if (c) p.av = c; else delete p.av; save(); const t = avs.querySelector(".avthumb"); t.innerHTML = avHTML(p, p.n, 36); avPaint(t); }); box.append(avs);
  const heard = S.sittings.filter((x) => x.p === p.n && x.heard).slice(-5).reverse();
  if (heard.length) {
    const hh = $(`<section><h2 class="sec">What you heard</h2><ul class="heardlist"></ul></section>`);
    heard.forEach((x) => { const li = $(`<li><p>${esc(x.heard)}</p><span>${ago(Date.parse(x.d) || 0)}${x.told ? " · you told them" : ""}</span><button class="lnk" type="button">Send again</button></li>`); li.querySelector("button").onclick = async (e) => { const b = e.currentTarget; b.textContent = (await shareHeard(p.n, x.heard)) || "Send again"; }; hh.querySelector("ul").append(li); });
    box.append(hh);
  }
  const lib = $(`<section><h2 class="sec">Recorded <span class="cnt">${s.stories}</span></h2>${s.stories ? `<ul class="clips"></ul>` : `<p class="hint">Nothing recorded with ${esc(p.n)} yet.</p>`}</section>`);
  s.mine.forEach((c) => lib.querySelector(".clips").append(clipRow(c, box)));
  box.append(lib);
  const rm = $(`<button class="btn danger" type="button" style="margin-top:24px">Remove ${esc(p.n)} from the family</button>`);
  rm.onclick = () => { if (!confirm(`Remove ${p.n}? Their recordings stay on this device.`)) return; S.people = S.people.filter((x) => x.n !== p.n); save(); personView = null; renderSit(box, `${p.n} removed.`); };
  box.append(rm);
}
