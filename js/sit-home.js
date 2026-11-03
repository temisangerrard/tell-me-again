"use strict";
// The Sit tab at rest: the family and what's been happening. A sitting opens from here and closes back to it.
const ago = (ts) => {
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return "just now"; if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h} h ago`;
  const d = Math.floor(h / 24); return d === 1 ? "yesterday" : d < 14 ? `${d} days ago` : new Date(ts).toLocaleDateString(undefined, { day: "numeric", month: "short" });
};
const renderSit = (box, msg) => (sitting ? renderSitting(box, msg) : renderSitHome(box, msg));
// Begin a sitting with these people (the first is the storyteller), or ask who when none are given.
async function beginSitting(box, names) {
  if (names) applySitting(names); else await chooseSitting();
  if (sitting) renderSitting(box);
}
function renderSitHome(box, msg) {
  const n = S.sittings.length, st = streak(), f = famName(S.name);
  box.replaceChildren($(`<h1 class="title">Sit together</h1>`),
    $(`<div class="smeta"><p>${n ? `${n} of ${SEASON} sittings done${st > 1 ? `, ${st} weeks running` : ""}` : `Season one`}</p>
      <div class="ticks" role="img" aria-label="${Math.min(n, SEASON)} of ${SEASON} sittings done">${[...Array(SEASON)].map((_, i) => `<i class="${i < n ? "on" : ""}"></i>`).join("")}</div></div>`));
  if (msg) box.append($(`<p class="hint" role="status" style="margin-top:10px">${esc(msg)}</p>`));
  const go = $(`<button class="cta" id="startsit" type="button" style="margin-top:20px">Start a sitting</button>`);
  go.onclick = () => beginSitting(box); box.append(go);

  // The family: tap someone to sit with them.
  const fam = $(`<section><h2 class="sec">Family</h2><ul class="sitlist"></ul><div class="padd"><input class="inp sm" type="text" maxlength="40" autocomplete="off" enterkeyhint="done" placeholder="Add a name" aria-label="Add a name"><button class="btn" type="button">Add</button></div></section>`);
  const told = (name) => clips.filter((c) => c.who === name);
  (S.people || []).forEach((p) => {
    const t = told(p.n), last = t.length ? Math.max(...t.map((c) => c.at)) : 0;
    const li = $(`<li><button type="button" aria-label="Sit with ${esc(p.n)}"><span class="av" aria-hidden="true" style="--tint:${tintFor(p.n)}">${esc(initial(p.n))}</span><span class="nm">${esc(p.n)}</span><em>${t.length ? `${t.length} ${t.length === 1 ? "story" : "stories"} · ${ago(last)}` : "No stories yet"}</em></button></li>`);
    li.querySelector("button").onclick = () => beginSitting(box, [p.n]); fam.querySelector(".sitlist").append(li);
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
