"use strict";
// Family lore: what the family's stories say, gathered on the device. After a story is written out, a helper reads that text and
// lists the people, places, years, foods and sayings in it. The helper never speaks to anyone; it only helps the person asking
// choose what to ask next. Lore is only what was said, each item tied to the story it came from. Stored in S.lore, with backups.
const loreOn = () => !!(S.consent && S.consent.lore);
const loreStore = () => (S.lore ||= { clips: {} });
async function loreCall(body) {
  let r; try { r = await fetch("/api/lore", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }); } catch { throw new Error("Couldn't reach the helper. Check your connection."); }
  const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || "Couldn't do that. Please try again."); return j;
}
const loreReady = (c) => c && c.text && c.text.trim().length >= 20;
const lorePending = () => clips.filter((c) => loreReady(c) && !(loreStore().clips[c.id] && loreStore().clips[c.id].tl === c.text.length));
async function extractLore(c) {
  if (!loreOn() || !loreReady(c)) return false;
  const j = await loreCall({ task: "extract", text: c.text, who: c.who || "", q: c.q || "" });
  loreStore().clips[c.id] = { ...j.lore, who: c.who || "", q: c.q || "", at: c.at || Date.now(), tl: c.text.length }; save(); return true;
}

// Put every story's items together: one entry per person, place, year or food, with how many stories and who mentioned it.
function loreAgg() {
  const out = { people: new Map(), places: new Map(), years: new Map(), foods: new Map(), sayings: [] };
  const put = (m, label, e, extra) => { const k = String(label).toLowerCase(); const x = m.get(k) || { label, n: 0, by: new Set(), rel: "" }; x.n++; if (e.who) x.by.add(e.who); if (extra) x.rel ||= extra; m.set(k, x); };
  for (const e of Object.values((S.lore && S.lore.clips) || {})) {
    (e.people || []).forEach((p) => put(out.people, p.n, e, p.rel)); (e.places || []).forEach((v) => put(out.places, v, e)); (e.years || []).forEach((v) => put(out.years, v, e)); (e.foods || []).forEach((v) => put(out.foods, v, e));
    (e.sayings || []).forEach((q) => out.sayings.push({ q, who: e.who }));
  }
  const arr = (m) => [...m.values()].sort((a, b) => b.n - a.n || a.label.localeCompare(b.label));
  return { people: arr(out.people), places: arr(out.places), years: [...out.years.values()].sort((a, b) => a.label.localeCompare(b.label)), foods: arr(out.foods), sayings: out.sayings };
}
const loreEmpty = (a) => !(a.people.length || a.places.length || a.years.length || a.foods.length || a.sayings.length);

// Ask-next ideas that need no AI, found by comparing the stories. Each is { why, who, q } and "who" is the person to sit with.
function loreGaps(a = loreAgg(), max = 4) {
  const names = (S.people || []).map((p) => p.n), told = (n) => clips.some((c) => c.who === n) || Object.values((S.lore && S.lore.clips) || {}).some((e) => e.who === n);
  const lower = names.map((n) => n.toLowerCase()), out = [];
  for (const p of a.people) { // someone the family keeps mentioning who has not told their own
    const i = lower.findIndex((n) => n === p.label.toLowerCase() || n.split(/\s+/)[0] === p.label.toLowerCase());
    if (i >= 0 && !told(names[i]) && p.n >= 1) out.push({ why: `${names[i]} comes up in ${p.n} ${p.n === 1 ? "story" : "stories"} but hasn't told theirs.`, who: names[i], q: `Others talk about you. What would you want us to know about your own life?` });
  }
  const other = (by) => names.filter((n) => !by.has(n)).sort((x, y) => clips.filter((c) => c.who === x).length - clips.filter((c) => c.who === y).length)[0];
  for (const [list, make] of [[a.places, (v, by) => `${[...by][0]} talked about ${v}. What do you remember of it?`], [a.years, (v, by) => `${[...by][0]} remembers ${v}. What was happening for you then?`], [a.foods, (v, by) => `${[...by][0]} mentioned ${v}. What does it bring back for you?`]]) {
    for (const x of list) { if (x.n !== 1 || x.by.size !== 1) continue; const who = other(x.by); if (who) out.push({ why: `Only ${[...x.by][0]} has mentioned ${x.label}.`, who, q: make(x.label, x.by) }); }
  }
  for (const p of a.people) { // a person who is in the stories but not in the family list
    if (p.n >= 2 && !lower.some((n) => n === p.label.toLowerCase() || n.split(/\s+/)[0] === p.label.toLowerCase())) out.push({ why: `${p.label} comes up in ${p.n} stories.`, add: p.label });
  }
  return out.slice(0, max);
}
// The notes the helper gets to suggest follow-ups from: a short summary, never the full recordings.
function loreNotes(who) {
  const a = loreAgg(), f = (l) => l.slice(0, 8).map((x) => x.label).join(", ");
  const mine = Object.values((S.lore && S.lore.clips) || {}).filter((e) => e.who === who).map((e) => e.q).filter(Boolean).slice(0, 6);
  return [a.people.length && `People mentioned: ${f(a.people)}`, a.places.length && `Places: ${f(a.places)}`, a.years.length && `Years: ${f(a.years)}`, a.foods.length && `Foods: ${f(a.foods)}`, a.sayings.length && `Sayings: ${a.sayings.slice(0, 4).map((s) => s.q).join(" | ")}`, mine.length && `${who} has already been asked: ${mine.join(" | ")}`].filter(Boolean).join("\n");
}
async function loreSuggest(who) { const j = await loreCall({ task: "suggest", who, notes: loreNotes(who), asked: S.asked || [] }); return j.questions || []; }

function askLoreConsent() {
  return new Promise((res) => {
    const b = $(`<div><h2>Build your family's lore?</h2>
      <p class="para" style="margin-top:10px">After a story is written out, an AI helper reads that text and lists who and what was mentioned: people, places, years, foods and sayings. It then suggests what you could ask next. It never talks to the person you're asking.</p>
      <p class="para">Only the written words are sent, never the audio. Nothing is kept on our servers; the lore lives on your phone. Turn it off or delete it any time under Family. <a href="#" id="pv">Privacy</a></p>
      <button class="cta" id="ok" type="button" style="margin-top:20px">Yes, build the lore</button>
      <button class="btn" id="no" type="button" style="width:100%;margin-top:8px;background:transparent;color:var(--muted)">Not now</button></div>`);
    let done = false; const close = sheet("Build your family's lore?", b);
    b.querySelector("#ok").onclick = () => { done = true; grantConsent("lore"); close(); res(true); };
    b.querySelector("#no").onclick = () => { close(); res(false); };
    b.querySelector("#pv").onclick = (e) => { e.preventDefault(); privacySheet(); };
    new MutationObserver((_, ob) => { if (!document.body.contains(b)) { ob.disconnect(); if (!done) res(false); } }).observe(document.body, { childList: true, subtree: true });
  });
}

// The lore on the Sit page.
function loreSection(box, redraw) {
  const a = loreAgg(), hasText = clips.some(loreReady), have = !loreEmpty(a);
  if (!loreOn() && !have && !hasText) return null;
  const sec = $(`<section class="lore"><h2 class="sec">Family lore</h2></section>`);
  if (!loreOn()) {
    const c = $(`<div class="lorecta"><p>See who and what keeps coming up in your family's stories, and get ideas for what to ask next.</p><button class="cta" type="button">Build the lore</button></div>`);
    c.querySelector("button").onclick = async () => { if (await askLoreConsent()) redraw(); }; sec.append(c); return sec;
  }
  const pend = lorePending();
  if (pend.length) {
    const b = $(`<button class="btn wide loreb" type="button">Read ${pend.length} ${pend.length === 1 ? "story" : "stories"} for lore</button>`);
    b.onclick = async () => { b.disabled = true; let done = 0, err = ""; for (const c of pend) { b.textContent = `Reading ${++done} of ${pend.length}…`; try { await extractLore(c); } catch (e) { err = e.message; break; } } redraw(err); };
    sec.append(b);
  }
  if (have) {
    const chips = (title, list, cls) => list.length ? `<div class="lg ${cls}"><h3>${title}</h3><div class="lchips">${list.slice(0, 12).map((x) => `<span class="lc" title="${esc([...x.by].join(", "))}">${esc(x.label)}${x.n > 1 ? `<i>${x.n}</i>` : ""}${x.rel ? `<em>${esc(x.rel)}</em>` : ""}</span>`).join("")}</div></div>` : "";
    const grid = $(`<div class="lgrid">${chips("People", a.people, "lp")}${chips("Places", a.places, "lpl")}${chips("Years", a.years, "ly")}${chips("Foods", a.foods, "lf")}</div>`); sec.append(grid);
    if (a.sayings.length) sec.append($(`<div class="lsay">${a.sayings.slice(0, 4).map((s) => `<blockquote>“${esc(s.q)}”<cite>${esc(s.who || "")}</cite></blockquote>`).join("")}</div>`));
    const gaps = loreGaps(a);
    if (gaps.length) {
      const g = $(`<div class="lgaps"><h3>Ask next</h3></div>`);
      gaps.forEach((x) => { const r = $(`<div class="lgap"><p>${esc(x.why)}</p>${x.add ? `<button class="btn" type="button">Add ${esc(x.add)}</button>` : `<button class="btn" type="button">Ask ${esc(x.who)}</button>`}</div>`);
        r.querySelector("button").onclick = () => { if (x.add) { S.people ||= []; S.people.push({ n: x.add, born: "" }); save(); redraw(); } else beginSitting(box, [x.who], { q: x.q, f: [] }); }; g.append(r); });
      sec.append(g);
    }
  }
  const idea = $(`<div class="lidea"><button class="btn" type="button">Ideas from the stories</button><div class="lopts" aria-live="polite"></div></div>`);
  const who = (S.people && S.people[0] && S.people[0].n) || meName();
  idea.querySelector("button").onclick = async (e) => { const b = e.currentTarget, o = idea.querySelector(".lopts"); b.disabled = true; b.textContent = "Thinking…";
    try { const qs = await loreSuggest(who); o.replaceChildren(...(qs.length ? qs : ["Nothing came back. Try again."]).map((q) => { const t = $(`<button class="lopt" type="button">${esc(q)}</button>`); if (qs.length) t.onclick = () => beginSitting(box, null, { q, f: [] }); return t; })); }
    catch (er) { o.replaceChildren($(`<p class="hint">${esc(er.message)}</p>`)); } b.disabled = false; b.textContent = "Ideas from the stories"; };
  sec.append(idea);
  const off = $(`<button class="lnk lforget" type="button">Delete the lore</button>`); off.onclick = () => { if (confirm("Delete the lore? Your recordings and written-out words stay. The lists built from them are removed.")) { S.lore = { clips: {} }; save(); redraw(); } }; sec.append(off);
  return sec;
}
