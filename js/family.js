"use strict";
// Family tab
/* ---------- Family: profile, family details, season, recordings, look, data ---------- */
function renderFamily(box) {
  box.replaceChildren($(`<h1 class="title">Family</h1>`));
  const groups = new Map();
  const groupFor = title => ["You", "The family", "At the table"].includes(title) ? "Family profile" : ["This season", "Recordings"].includes(title) ? "Activity & recordings" : ["Turning recordings into text", "Look"].includes(title) ? "Preferences" : "Your information";
  const sec = title => {
    const group = groupFor(title);
    if (!groups.has(group)) {
      const details = $(`<details class="profile-settings" ${group === "Family profile" ? "open" : ""}><summary>${group}</summary></details>`);
      groups.set(group, details); box.append(details);
    }
    const section = $(`<section class="fam">${title === group ? "" : `<h2 class="sec">${title}</h2>`}</section>`);
    groups.get(group).append(section); return section;
  };
  const field = (parent, label, value, o) => {
    const l = $(`<label class="field"><span class="lbl">${label}</span><input class="inp sm" type="text" maxlength="${o.max || 60}" autocomplete="off" value="${esc(value)}" placeholder="${esc(o.ph || "")}"></label>`);
    parent.append(l); const i = l.querySelector("input"); i.oninput = () => { o.on(i.value.trim(), i); save(); paintHead(); }; return i;
  };
  const chipGroup = (parent, label, items, isOn, toggle, min = 0) => {
    const w = $(`<div class="field"><span class="lbl">${label}</span><div class="chips" role="group" aria-label="${label}"></div></div>`); parent.append(w);
    items.forEach(([id, t]) => { const b = $(`<button class="chip" type="button" aria-pressed="${isOn(id)}">${esc(t)}</button>`);
      b.onclick = () => { if (isOn(id) && min && items.filter(([k]) => isOn(k)).length <= min) return; toggle(id); b.setAttribute("aria-pressed", isOn(id)); save(); }; w.querySelector(".chips").append(b); });
  };

  const you = sec("You");
  field(you, "Your name", S.me.name, { max: 30, ph: "What do they call you?", on: (v) => { S.me.name = v; reseat(); lsSet("sitting-name", v); } });

  const fam = sec("The family");
  field(fam, "Family name", S.name, { max: 40, ph: "e.g. " + pick(SUR), on: (v) => { S.name = v; } });
  field(fam, "A saying your family lives by", S.saying, { max: 90, ph: "The one your mum always says", on: (v) => { S.saying = v; } });
  field(fam, "Where your people come from", S.town, { ph: "Town or city", on: (v) => { S.town = v; } });
  const sw = $(`<div class="field"><span class="lbl">Family colour</span><div class="swatches" role="group" aria-label="Family colour"></div></div>`); fam.append(sw);
  COLORS.forEach(([v, l]) => { const b = $(`<button class="sw" type="button" aria-label="${l}" title="${l}" style="background:${v}"></button>`); b.setAttribute("aria-pressed", S.color === v);
    b.onclick = () => { S.color = v; sw.querySelectorAll(".sw").forEach((x) => x.setAttribute("aria-pressed", "false")); b.setAttribute("aria-pressed", "true"); applyColor(); save(); paintHead(); }; sw.querySelector(".swatches").append(b); });
  const hc = $(`<div class="field"><span class="lbl">Heritage</span><div class="chips"></div></div>`);
  const own = $(`<label class="field"><span class="lbl">Not listed? Add your own</span><input class="inp sm" type="text" maxlength="40" autocomplete="off" placeholder="Type it and press Enter"></label>`);
  fam.append(hc, own); heritageUI(hc.querySelector(".chips"), own.querySelector("input"));
  chipGroup(fam, "Topics to ask about", CHAPTERS.map((c) => [c.id, c.label]), (id) => S.chapters.includes(id), (id) => { S.chapters = S.chapters.includes(id) ? S.chapters.filter((x) => x !== id) : [...S.chapters, id]; }, 1);
  chipGroup(fam, "What you're making", MAKES.map(([id, t]) => [id, t]), (id) => S.makes.includes(id), (id) => { S.makes = S.makes.includes(id) ? S.makes.filter((x) => x !== id) : [...S.makes, id]; });

  peopleEditor(sec("People"), { born: true });

  const season = sec("This season");
  const st = streak();
  season.append($(`<ul class="facts"><li><span>Sittings done</span><b>${S.sittings.length} of ${SEASON}</b></li><li><span>Weeks running</span><b>${st}</b></li><li><span>Stories told</span><b>${S.told}</b></li><li><span>Games won</span><b>${totalWins()}</b></li></ul>`));
  const lb = leaderboard(); if (lb) season.append(lb);

  const recs = sec("Recordings");
  recs.append($(`<ul class="facts"><li><span>On this device</span><b>${clips.length} · ${fmtDur(clipTotal())}</b></li></ul>`));
  if (clips.length) { const d = $(`<button class="btn" type="button" style="margin-top:12px">Delete all recordings</button>`);
    d.onclick = async () => { if (txBusy.size) return; if (!confirm(`Delete all ${clips.length} recordings from this device? This can't be undone.`)) return; await cancelClipEdits(); clips.forEach((c) => URL.revokeObjectURL(c.url)); clips = []; try { await idbDo("readwrite", (x) => x.clear()); } catch {} renderFamily(box); };
    recs.append(d); }

  const trs = sec("Turning recordings into text");
  const lang = $(`<label class="field"><span class="lbl">Language they speak</span><select class="inp sm" id="lang"></select></label>`);
  TX_LANGS.forEach(([v, l]) => lang.querySelector("select").append(new Option(l, v, false, S.lang === v)));
  lang.querySelector("select").onchange = (e) => { S.lang = e.target.value; save(); };
  const hint = $(`<label class="field"><span class="lbl">Names and places they might mention</span><input class="inp sm" id="hints" type="text" maxlength="120" autocomplete="off" value="${esc(S.hints || "")}" placeholder="e.g. Ogbomoso, Aunty Folake, Chidi"></label>`);
  hint.querySelector("input").oninput = (e) => { S.hints = e.target.value; save(); };
  trs.append(lang, hint, $(`<p class="para">Igbo and Nigerian Pidgin aren't supported yet.</p>`));
  const at = $(`<div class="rule"><div class="t"><b>Turn each recording into text automatically</b><span>Sends the audio for transcription as soon as it's saved.</span></div><button class="tg" type="button" role="switch" aria-label="Turn each recording into text automatically" aria-checked="${S.autoTx && S.consent.transcribe}"></button></div>`);
  at.querySelector(".tg").onclick = async (e) => { const sw = e.currentTarget; if (!S.autoTx || !S.consent.transcribe) { if (!S.consent.transcribe && !(await askTxConsent())) return; S.autoTx = true; } else S.autoTx = false; save(); sw.setAttribute("aria-checked", S.autoTx); };
  trs.append(at);
  if (S.consent.transcribe) { const wd = $(`<button class="btn" type="button" style="margin-top:12px">Stop sending audio for transcription</button>`);
    wd.onclick = () => { withdrawConsent("transcribe"); S.autoTx = false; save(); renderFamily(box); }; trs.append(wd); }

  const look = sec("Look");
  chipGroup(look, "Theme", THEMES.map(([k, n]) => [k, n]), (id) => getTheme() === id, (id) => { lsSet("sitting-theme", id); applyTheme(id); look.querySelectorAll(".chip").forEach((c, i) => c.setAttribute("aria-pressed", THEMES[i][0] === id)); });

  const data = sec("Your information");
  backupControls(data);
  const del = $(`<button class="btn danger" type="button" style="margin-top:8px">Delete everything</button>`);
  del.onclick = () => { if (confirm("Delete everything? This removes your family, your recordings and your wins from this device. It can't be undone.")) wipeAll(); };
  const pv = $(`<button class="btn" type="button" style="margin-top:8px">Read the privacy notice</button>`); pv.onclick = privacySheet;
  data.append(pv, $(`<br>`), del);

  const about = sec("About");
  about.append($(`<p class="para">Tell Me Again by Settley Studio</p>`));
}

