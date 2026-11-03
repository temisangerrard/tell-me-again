"use strict";
// Make tab: magazine, storybook, film
const BADGES = [
  ["First story", () => S.told >= 1], ["Five stories", () => S.told >= 5], ["Ten stories", () => S.told >= 10],
  ["Full table", () => S.seats.length >= 4], ["First win", () => totalWins() >= 1], ["Two weeks running", () => streak() >= 2],
  ["Half a season", () => S.sittings.length >= SEASON / 2], ["Season done", () => S.sittings.length >= SEASON], ["Games night", () => totalWins() >= 5]
];
function renderMake(box) {
  const f = famName(S.name);
  const kinds = {
    magazine: { thumb: `<div class="thumb mag"><small>Issue 01</small><b>The ${esc(f)} issue</b></div>`, d: "" },
    storybook: { thumb: `<div class="thumb book"><small>Storybook</small><b>${esc(f)} family tales</b><i></i><i></i></div>`, d: "" },
    short: { thumb: `<div class="thumb film"><b style="margin-top:auto">The ${esc(f)} short</b></div>`, d: "" }
  };
  box.replaceChildren($(`<h1 class="title">Make something</h1>`));
  const makeMagazine = $(`<button class="cta" type="button" style="margin-top:24px">Make a magazine</button>`);
  makeMagazine.onclick = magazineSheet; box.append(makeMagazine);
  const list = $(`<ul class="works"></ul>`);
  MAKES.forEach(([id, label]) => {
    const k = kinds[id], mine = S.makes.includes(id);
    const li = $(`<li class="work">${k.thumb}<div><h3>${label}${mine ? `<span class="chosen">Chosen</span>` : ""}</h3><button class="btn" type="button">Preview</button></div></li>`);
    li.querySelector("button").onclick = () => ({ magazine: previewMag, storybook: previewBook, short: previewShort })[id]();
    list.append(li);
  });
  box.append(list);
  const hit = BADGES.filter(([, ok]) => ok()).length;
  box.append($(`<h2 class="sec">Milestones <span class="cnt">${hit} of ${BADGES.length}</span></h2>`),
    $(`<ul class="miles">${BADGES.map(([n, ok]) => `<li class="${ok() ? "on" : ""}">${esc(n)}<span style="position:absolute;left:-9999px">${ok() ? ", done" : ", not yet"}</span></li>`).join("")}</ul>`));
}
const closeBtn = (close) => { const b = $(`<button class="btn" type="button" style="width:100%;margin-top:16px">Close</button>`); b.onclick = close; return b; };
/* ---------- A publication made from the family's selected words ---------- */
function buildMagazine(ids) {
  if (!Array.isArray(ids) || !ids.length) throw new Error("Choose at least one story with a transcript.");
  const selected = ids.map(id => clips.find(c => c.id === id));
  if (new Set(ids).size !== ids.length || selected.some(c => !c || !c.text || !c.text.trim())) throw new Error("Every selected story needs a transcript.");
  const family = famName(S.name) || "Our family", color = /^#[0-9a-f]{6}$/i.test(S.color) ? S.color : "#e26b3f";
  const paragraphs = text => text.split(/\n\s*\n/).map(p => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`).join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src 'none'; base-uri 'none'; form-action 'none'"><title>${esc(family)} — Family stories</title><style>
  :root { --accent:${color}; --accent-ink:${onAccent(color)}; --paper:#fffdf8; --ink:#29241f; --muted:#71665c; --rule:#ded7cc; --body:Georgia,'Times New Roman',serif; --label:Arial,sans-serif; }
  *{box-sizing:border-box} body{margin:0;background:var(--paper);color:var(--ink);font:18px/1.75 var(--body)}
  .page,article{max-width:780px;margin:auto;padding:64px 44px;overflow-wrap:anywhere} .cover{min-height:960px;display:flex;flex-direction:column;justify-content:space-between;border-top:18px solid var(--accent)}
  .label{font:600 11px/1.5 var(--label);letter-spacing:.16em;text-transform:uppercase;color:var(--muted)}
  h1{font:normal clamp(54px,10vw,100px)/1 var(--body);letter-spacing:-.04em;margin:24px 0}h2{font:normal 40px/1.15 var(--body);margin:20px 0 32px}p{margin:0 0 24px}
  .seal{display:grid;place-items:center;width:88px;height:88px;border:1px solid var(--ink);border-radius:50%;font:normal 46px/1 var(--body);margin-bottom:36px}
  .saying{font-style:italic;font-size:24px;max-width:30ch}.cover-bottom{border-top:1px solid var(--ink);padding-top:20px;display:flex;justify-content:space-between;gap:20px;font:12px var(--label)}
  .contents{border-top:1px solid var(--rule)}.contents ol{padding:0;list-style:none}.contents li{border-top:1px solid var(--rule);padding:16px 0;display:flex;gap:24px}.contents li span{font:600 13px var(--label);padding-top:7px}
  article{border-top:1px solid var(--rule)}article .recorded{font:12px var(--label);color:var(--muted);margin:28px 0}.story-text{white-space:normal}.story-text p:first-child::first-letter{font-size:2.8em;float:left;line-height:1;margin:4px 8px 0 0}
  .end{font:12px/1.6 var(--label);color:var(--muted);border-top:1px solid var(--rule);padding-top:24px;margin-top:44px}
  @media(max-width:500px){.page,article{padding:36px 24px}.cover{min-height:740px}h2{font-size:30px}}
  @page{size:A4;margin:18mm} @media print{body{background:var(--paper);print-color-adjust:exact;-webkit-print-color-adjust:exact}.page,article{max-width:none;padding:0}.cover{min-height:245mm;border-top:10px solid var(--accent);padding-top:14mm;break-after:page}.contents{border:0;break-after:page}article{border:0;break-before:page}h2{break-after:avoid}p{orphans:3;widows:3}.end{break-inside:avoid}}
  </style></head><body>
  <section class="page cover"><div><span class="label">Family stories · Volume 01</span></div><div><div class="seal" aria-hidden="true">${esc(initial(family))}</div><h1>${esc(family)}</h1>${S.saying ? `<p class="saying">${esc(S.saying)}</p>` : ""}${S.town ? `<p>${esc(S.town)}</p>` : ""}</div><div class="cover-bottom"><span>${selected.length} ${selected.length === 1 ? "story" : "stories"}, in our own words</span><span>Tell Me Again</span></div></section>
  <section class="page contents"><span class="label">In this volume</span><h2>Our stories</h2><ol>${selected.map((c,i) => `<li><span>${String(i+1).padStart(2,"0")}</span><div>${esc(c.q)}</div></li>`).join("")}</ol></section>
  ${selected.map((c,i) => `<article><span class="label">${esc(family)} · Story ${String(i+1).padStart(2,"0")}</span><h2>${esc(c.q)}</h2><div class="story-text">${paragraphs(c.text)}</div><p class="recorded">Recorded ${esc(new Date(c.at).toLocaleDateString("en-GB", {day:"numeric",month:"long",year:"numeric"}))}</p><div class="end">${esc(family)} · Family stories</div></article>`).join("")}
  </body></html>`;
}
function magazineSheet() {
  const available = clips.filter(c => c.text && c.text.trim());
  const body = $(`<div><h2>Make a magazine</h2><div class="mag-stories"></div><label style="display:flex;gap:12px;align-items:flex-start;margin:24px 0"><input id="reviewed" type="checkbox" style="margin-top:5px"><span>I've reviewed these transcripts and have permission to include them.</span></label><button class="cta" type="button" disabled>Preview magazine</button><p class="err" role="status"></p></div>`);
  const selected = new Set();
  const go = body.querySelector(".cta"), reviewed = body.querySelector("#reviewed");
  const sync = () => { go.disabled = !selected.size || !reviewed.checked; };
  available.forEach(c => {
    const row = $(`<label style="display:flex;gap:12px;align-items:flex-start;border-bottom:1px solid var(--line);padding:16px 0"><input type="checkbox" style="margin-top:5px"><span>${esc(c.q)}</span></label>`);
    row.querySelector("input").onchange = e => { if (e.target.checked) selected.add(c.id); else selected.delete(c.id); reviewed.checked = false; sync(); };
    body.querySelector(".mag-stories").append(row);
  });
  if (!available.length) body.querySelector(".mag-stories").append($(`<p class="para" style="margin-top:16px">No transcripts yet. Turn a recording into text under Sit, then review the words.</p>`));
  reviewed.onchange = sync;
  const close = sheet("Make a family magazine", body); body.append(closeBtn(close));
  go.onclick = () => {
    try {
      const html = buildMagazine([...selected]);
      const preview = $(`<div><h2>Family magazine</h2><iframe title="Family magazine preview" sandbox="" style="width:100%;height:55vh;border:1px solid var(--line);margin:20px 0"></iframe><button class="cta" type="button">Print / Save PDF</button><button class="btn" type="button" style="width:100%;margin-top:12px">Download magazine</button><p class="err" role="status"></p></div>`);
      preview.querySelector("iframe").srcdoc = html;
      const closePreview = sheet("Family magazine", preview); preview.append(closeBtn(closePreview));
      preview.querySelector(".btn").onclick = () => downloadFile(new Blob([html], { type: "text/html" }), "family-magazine.html");
      preview.querySelector(".cta").onclick = () => {
        const publication = window.open("", "_blank");
        if (!publication) { preview.querySelector(".err").textContent = "Allow pop-ups to print the magazine, or download it and print from your browser."; return; }
        publication.opener = null; publication.document.write(html); publication.document.close();
        publication.focus(); setTimeout(() => publication.print(), 150);
      };
    } catch (e) { body.querySelector(".err").textContent = e.message; }
  };
}

async function previewMag() {
  const body = $(`<div><h2>Cover preview</h2><canvas class="cvs" role="img" aria-label="Magazine cover preview"></canvas>
    <button class="cta" type="button" id="dl" style="margin-top:16px">Save the cover</button></div>`);
  const close = sheet("Magazine cover preview", body); body.append(closeBtn(close));
  const cv = body.querySelector("canvas"), W = 800, H = 1060, ctx = cv.getContext("2d"), f = famName(S.name).toUpperCase();
  cv.width = W; cv.height = H;
  try { await Promise.all([document.fonts.load('800 100px "Barlow Condensed"'), document.fonts.load("600 30px Inter")]); } catch {}
  ctx.fillStyle = S.color; ctx.fillRect(0, 0, W, H);
  const ink = onAccent(S.color); // dark text on light covers, white on dark ones
  ctx.globalAlpha = .13; ctx.fillStyle = ink; ctx.beginPath(); ctx.arc(W - 40, 150, 290, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
  ctx.fillStyle = ink; ctx.textBaseline = "alphabetic";
  ctx.font = '700 26px -apple-system, Inter, sans-serif'; ctx.fillText("ISSUE 01  ·  SEASON ONE", 60, 86);
  ctx.font = '800 120px "Barlow Condensed", "Arial Narrow", sans-serif'; ctx.fillText("THE", 56, 250);
  let fs = 330; ctx.font = `800 ${fs}px "Barlow Condensed", "Arial Narrow", sans-serif`;
  while (ctx.measureText(f).width > W - 110 && fs > 70) { fs -= 6; ctx.font = `800 ${fs}px "Barlow Condensed", "Arial Narrow", sans-serif`; }
  ctx.fillText(f, 52, 250 + fs * .82);
  ctx.font = '800 120px "Barlow Condensed", "Arial Narrow", sans-serif'; ctx.fillText("ISSUE", 56, 250 + fs * .82 + 120);
  const topics = S.chapters.map((id) => (CHAPTERS.find((c) => c.id === id) || {}).label).filter(Boolean).slice(0, 4);
  ctx.font = '600 34px -apple-system, Inter, sans-serif'; topics.forEach((t, i) => ctx.fillText("— " + t, 60, H - 330 + i * 52));
  const spoken = (clips.find((c) => c.text && c.text.trim()) || {}).text, firstLine = spoken ? (spoken.trim().match(/^.{20,110}?[.!?](\s|$)/) || [spoken.trim().slice(0, 100)])[0].trim() : "";
  const pull = S.saying || firstLine;
  if (pull) { ctx.font = 'italic 500 30px -apple-system, Inter, sans-serif'; const q = "“" + pull + "”"; let line = "", y = H - 110, lines = [];
    q.split(" ").forEach((w) => { const t = line ? line + " " + w : w; if (ctx.measureText(t).width > W - 120 && line) { lines.push(line); line = w; } else line = t; }); lines.push(line);
    lines.slice(0, 2).forEach((l, i) => ctx.fillText(l, 60, y - (Math.min(lines.length, 2) - 1 - i) * -40 - 40)); }
  ctx.font = '700 22px -apple-system, Inter, sans-serif'; ctx.fillText("TELL ME AGAIN", 60, H - 40);
  body.querySelector("#dl").onclick = () => cv.toBlob((bl) => { const a = document.createElement("a"); a.href = URL.createObjectURL(bl); a.download = `${famName(S.name).toLowerCase().replace(/[^a-z0-9]+/g, "-") || "family"}-issue-01.png`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1500); });
}
function previewBook() {
  const f = famName(S.name), told = S.asked.slice(0, 5), pages = [{ cover: true }];
  const words = clips.filter((c) => c.text && c.text.trim()).slice().reverse().slice(0, 8); // their actual words, oldest first
  if (words.length) words.forEach((c) => pages.push({ q: c.q, a: c.text.trim() }));
  else (told.length ? told : QUESTIONS.filter((q) => S.chapters.includes(q.c)).slice(0, 3).map((q) => q.q)).forEach((q) => pages.push({ q, idea: !told.length }));
  pages.push({ end: true });
  const body = $(`<div><h2>Storybook preview</h2><div class="pager" tabindex="0" aria-label="Storybook pages"></div><p class="hint" id="pn" style="text-align:center;margin-top:8px" role="status"></p></div>`);
  const pg = body.querySelector(".pager");
  pages.forEach((p, i) => pg.append($(p.cover ? `<div class="pg cv"><small>A family storybook</small><b>${esc(f)} family tales</b><p>Told by ${esc(S.elder.name || "the family")}</p><span class="shape"></span></div>`
    : p.end ? `<div class="pg"><small>The end</small><b>To be continued</b><p>Every sitting adds a page.</p><span class="shape"></span></div>`
    : `<div class="pg"><small>${p.idea ? "Page idea" : "Page " + i}</small><div class="q">${esc(p.q)}</div>${p.a ? `<p class="ans">${esc(p.a)}</p>` : `<p>Their answer goes here, in their own words.</p>`}</div>`)));
  const pn = body.querySelector("#pn"), upd = () => { const w = pg.firstChild.getBoundingClientRect().width + 12; pn.textContent = `Page ${Math.min(pages.length, Math.round(pg.scrollLeft / w) + 1)} of ${pages.length}`; };
  pg.addEventListener("scroll", upd, { passive: true }); upd();
  const close = sheet("Storybook preview", body); body.append(closeBtn(close));
}
function previewShort() {
  const f = famName(S.name), body = $(`<div><h2>Short film preview</h2><p class="hint" style="margin-top:8px">Title sequence only</p><div id="stage"></div>
    <button class="cta" type="button" id="rp" style="margin-top:16px">Play again</button></div>`);
  const lines = [["sm", "A Tell Me Again film"], ["", `The ${f} family`], ["sm", "Starring"], ...S.seats.filter(Boolean).slice(0, 4).map((n) => ["", n]), ["sm", "Season one"]];
  const play = () => { const st = body.querySelector("#stage"); const r = $(`<div class="reel" aria-label="Title sequence">${lines.map(([c, t], i) => `<div class="${c}" style="--i:${i}">${esc(t)}</div>`).join("")}</div>`); st.replaceChildren(r); };
  body.querySelector("#rp").onclick = play; play();
  const close = sheet("Short film preview", body); body.append(closeBtn(close));
}

