"use strict";
// Sit tab: questions, recording, clips
const ROLES = ["Asker", "Storyteller", "Witness", "Witness"];
const SEAT_CLS = ["s-ask", "s-st", "s-w1", "s-w2"];
function nextQuestion(forName) { // forName: ask for this person's relationship, not the current storyteller's
  if (!forName && typeof pinnedQ !== "undefined" && pinnedQ && !S.asked.includes(pinnedQ.q)) return pinnedQ; // the question "Next up" suggested
  const who = forName || (Array.isArray(sitting) ? sitting[0] : S.elder && S.elder.name), pr = (S.people || []).find((x) => x.n === who);
  const pool = questionsFor(pr && pr.rel).filter((q) => S.chapters.includes(q.c)); // questions written for how this person is related to you
  const n = S.asked.length, maxD = n < 2 ? 1 : n < 4 ? 2 : n < 6 ? 3 : 4; // ease in: warm-up first
  const fresh = pool.filter((q) => !S.asked.includes(q.q) && q.d <= maxD).sort((a, b) => a.d - b.d || !!b.for - !!a.for);
  return fresh[0] || pool.find((q) => !S.asked.includes(q.q)) || null;
}

// Sit down together, then wrap up: a ten-second note on how it went. This is what counts as a sitting.
function wrapUp(after) {
  let r = null; const tags = [];
  const body = $(`<div><h2>How did that sitting go?</h2>
    <div class="thumbs"><button class="thumb" type="button" data-r="up" aria-pressed="false">Good one</button><button class="thumb" type="button" data-r="down" aria-pressed="false">Tough one</button></div>
    <div class="chips" role="group" aria-label="What was it like?"></div>
    <button class="cta" id="sv" type="button" style="margin-top:24px" disabled>Save this sitting</button>
    <button class="btn" id="cl" type="button" style="width:100%;margin-top:8px;background:transparent;color:var(--muted)">Not now</button></div>`);
  const sv = body.querySelector("#sv");
  body.querySelectorAll(".thumb").forEach((b) => b.onclick = () => { r = b.dataset.r; body.querySelectorAll(".thumb").forEach((x) => x.setAttribute("aria-pressed", x === b)); sv.disabled = false; });
  ["Easy to talk", "Got emotional", "Lots of laughs", "Learned something", "Ran out of time"].forEach((t) => {
    const c = $(`<button class="chip" type="button" aria-pressed="false">${t}</button>`);
    c.onclick = () => { const i = tags.indexOf(t); if (i < 0) tags.push(t); else tags.splice(i, 1); c.setAttribute("aria-pressed", i < 0); };
    body.querySelector(".chips").append(c);
  });
  const close = sheet("Wrap up this sitting", body);
  body.querySelector("#cl").onclick = close;
  sv.onclick = () => { S.sittings.push({ d: new Date().toISOString(), r, t: [...tags] }); sitting = null; pinnedQ = null; save(); close(); after(); };
}
// 3-2-1, then a full-screen run screen: the family colour, a huge timer, one big stop button. Resolves with the overlay or null if cancelled.
// One recording: the audio, then its words (or the way to get them), then Save and Delete.
function clipRow(c, box) {
  const li = $(`<li><div class="cq">${esc(c.q)}</div><audio controls preload="metadata" src="${c.url}"></audio>${c._unsaved ? `<p class="err save-warning">Not saved to this device. Save the audio or download a backup before leaving.</p>` : ""}<div class="tx"></div>
    <div class="cm"><span>${new Date(c.at).toLocaleDateString(undefined, { day: "numeric", month: "short" })} · ${fmtDur(c.dur || 0)}</span><a href="${c.url}" download="tell-me-again-${new Date(c.at).toISOString().slice(0, 10)}.webm">Save audio</a><button class="lnk" type="button">Delete</button></div></li>`);
  const tx = li.querySelector(".tx"); let saveT;
  const paint = () => {
    tx.replaceChildren();
    if (!c._unsaved) li.querySelector(".save-warning")?.remove();
    li.querySelector(".lnk").disabled = txBusy.has(c.id);
    if (txBusy.has(c.id)) { tx.append($(`<p class="txs" role="status">Turning it into text. A short answer takes under half a minute; a long one can take a couple of minutes.</p>`)); tx.setAttribute("aria-busy", "true"); return; }
    tx.removeAttribute("aria-busy");
    if (c.text === undefined) {
      const b = $(`<button class="btn" type="button">Turn into text</button>`); b.onclick = () => run(); tx.append(b);
    } else if (!c.text.trim() && !c._typing) {
      tx.append($(`<p class="txs">We couldn't hear any speech in this one. Try again, or type what they said.</p>`));
      const b = $(`<button class="btn" type="button" style="margin-right:8px">Try again</button>`); b.onclick = () => run();
      const t = $(`<button class="btn" type="button">Type it myself</button>`); t.onclick = () => { c._typing = true; paint(); tx.querySelector("textarea").focus(); };
      tx.append(b, t);
    } else {
      const ta = $(`<textarea class="txt" rows="3" aria-label="What they said. You can edit it."></textarea>`); ta.value = c.text; ta.placeholder = "Type what they said";
      const fit = () => { ta.style.height = "auto"; ta.style.height = ta.scrollHeight + 2 + "px"; };
      ta.oninput = () => { c.text = ta.value; c.tx = c._typing ? "typed" : c.tx === "ai" ? "edited" : c.tx; fit(); note.textContent = c.tx === "edited" ? "Edited by you." : "Written by you."; clearTimeout(saveT);
        const persist = () => { clearTimeout(saveT); pendingClipEdits.delete(c.id); return saveClip(c); };
        persist.cancel = () => { clearTimeout(saveT); pendingClipEdits.delete(c.id); };
        pendingClipEdits.set(c.id, persist);
        saveT = setTimeout(() => persist().then(() => li.querySelector(".save-warning")?.remove()).catch(() => { note.textContent = "Changes couldn't be saved. Download a backup before leaving."; }), 500); };
      const note = $(`<p class="txs">${c.tx === "edited" ? "Edited by you." : c.tx === "typed" || c._typing ? "Written by you." : "Written by AI. Check the names and places."}</p>`);
      tx.append(ta, note); requestAnimationFrame(fit);
    }
  };
  const run = async () => {
    if (!S.consent.transcribe && !(await askTxConsent())) return;
    txBusy.add(c.id); paint();
    try { await transcribeClip(c); txBusy.delete(c.id); paint(); }
    catch (e) { txBusy.delete(c.id); paint(); const m = $(`<p class="txs err">${esc(e.message)}</p>`); tx.prepend(m); }
  };
  li.querySelector(".lnk").onclick = async () => {
    if (txBusy.has(c.id)) return;
    if (!confirm("Delete this recording" + (c.text ? " and its words" : "") + "? This can't be undone.")) return;
    if (pendingClipEdits.has(c.id)) pendingClipEdits.get(c.id).cancel();
    await Promise.allSettled([...clipWrites]);
    try { await idbDo("readwrite", (st) => st.delete(c.id)); } catch { tx.append($(`<p class="err">The recording couldn't be deleted.</p>`)); return; }
    URL.revokeObjectURL(c.url); clips = clips.filter((x) => x.id !== c.id); renderSit(box, "Recording deleted.");
  };
  paint(); li._run = run; return li;
}

function renderSitting(box, msg) {
  const n = S.sittings.length, st = streak(), f = famName(S.name);
  const back = $(`<button class="btn gback" type="button">‹ Family</button>`);
  back.onclick = () => { if (live || (activeCall && activeCall.mode() !== "idle")) return; sitting = null; pinnedQ = null; renderSit(box); };
  back.hidden = !!(activeCall && activeCall.mode() !== "idle"); // hang up first
  box.replaceChildren(back, $(`<h1 class="title">Sitting ${n + 1}</h1>`),
    $(`<div class="smeta"><p>The ${esc(f)} family · Season one${n ? ` · ${n} of ${SEASON} done${st > 1 ? `, ${st} weeks running` : ""}` : ""}</p>
      <div class="ticks" role="img" aria-label="${Math.min(n, SEASON)} of ${SEASON} sittings done">${[...Array(SEASON)].map((_, i) => `<i class="${i < n ? "on" : ""}"></i>`).join("")}</div></div>`));
  // The table: you at the bottom, the storyteller across from you, witnesses either side, the question in the middle.
  const table = $(`<div class="table" role="group" aria-label="Who is at the table"></div>`);
  const seatEls = [0, 1, 2, 3].map((i) => {
    const who = S.seats[i];
    const el = $(`<div class="seat ${SEAT_CLS[i]} ${who ? "on" : ""}"><div class="av" aria-hidden="true" style="--tint:${tintFor(who || "")}">${who ? esc(initial(who)) : "+"}</div><div class="role">${ROLES[i]}</div><div class="nm"${who ? ` title="${esc(who)}"` : ""}>${who ? esc(who) : "Empty chair"}</div></div>`);
    table.append(el); return el;
  });
  const q = nextQuestion(), ch = q && CHAPTERS.find((c) => c.id === q.c), fu = q ? (q.f && q.f.length ? q.f : FOLLOWUPS.slice(0, 3)) : [];
  const w = $(`<div class="whisper">
    ${q ? `<small>${esc(ch ? ch.label : "")}</small>` : ""}
    <div class="q">${q ? esc(q.q) : "That's every question we have for these topics. Add more topics under Family."}</div>
    ${q && q.tip ? `<p class="tip">${esc(q.tip)}</p>` : ""}
    ${q && q.photo ? `<p class="photoidea"><b>Photo to have to hand:</b> ${esc(q.photo)}</p>` : ""}
    ${q && q.sensitive ? `<p class="warn">This one can bring up hard memories. Check they're happy to go there, and let them skip it.</p>` : ""}
    ${q ? `<p class="hint" id="fuh">If they go quiet</p><div class="fus" role="group" aria-labelledby="fuh"></div>` : ""}
    <button class="cta" id="rec" type="button">Start the interview</button>
    <p class="rs" id="rs" role="status"></p>
    <button class="btn skip" id="skip" type="button"${q ? "" : " disabled"}>Skip this question</button></div>`);
  fu.forEach((t) => { const c = $(`<button class="fu" type="button" aria-pressed="false">${esc(t)}</button>`); c.onclick = () => c.setAttribute("aria-pressed", c.getAttribute("aria-pressed") !== "true"); w.querySelector(".fus").append(c); });
  w.querySelector("#skip").onclick = () => { if (q) { S.asked.push(q.q); save(); renderSitting(box); } };
  table.append(w); box.append(table);

  const rec = w.querySelector("#rec"), rs = w.querySelector("#rs"), skip = w.querySelector("#skip"), role = seatEls[1].querySelector(".role");
  rs.textContent = msg || "";
  // The ring means "someone is speaking", so it follows the recording.
  const setLive = (on) => { seatEls[1].classList.toggle("speaking", on); role.textContent = on ? "Speaking" : ROLES[1]; rec.textContent = on ? "Stop" : "Start the interview"; skip.disabled = on || !q; };
  if (live) { setLive(true); rs.textContent = "Recording…"; }
  // While a call is live, Record goes through the call (both voices) and the current question is pushed to the other phone.
  onClipSaved = () => { if (box.isConnected && !box.hidden) renderSit(box); };
  onCallSkip = () => { if (!skip.disabled) skip.click(); };
  onCallChange = () => { if (!rec.isConnected) return; back.hidden = !!(activeCall && activeCall.mode() !== "idle"); const c = activeCall && activeCall.live(); if (c) { activeCall.setQuestion(q ? q.q : null); const on = activeCall.recording(); rec.textContent = on ? "Finish and save" : "Start the interview"; skip.disabled = on || !q; } };
  if (activeCall && activeCall.live()) { activeCall.setQuestion(q ? q.q : null); onCallChange(); }
  rec.onclick = async () => {
    if (live) { live.mr.stop(); return; }
    if (activeCall && activeCall.live()) { activeCall.toggleRec(); return; }
    if (!sitting) { if (!(await chooseSitting())) return; renderSitting(box); box.querySelector("#rec").click(); return; }
    if (!navigator.mediaDevices || typeof MediaRecorder === "undefined") { rs.textContent = "This browser can't record yet. Try the latest Chrome or Safari."; return; }
    if (restoring) return;
    rec.disabled = true;
    const permitted = await recordingPermission("Ask everyone present first. Their voices will be saved on this device.");
    if (!permitted || !box.isConnected || box.hidden || restoring) { rec.disabled = false; return; }
    let stream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
    catch (e) { rec.disabled = false; let state = null; if (e && e.name === "NotAllowedError") { try { state = (await navigator.permissions.query({ name: "microphone" })).state; } catch {} } rs.textContent = micMessage(e, state); return; }
    if (!box.isConnected || box.hidden || restoring) { stream.getTracks().forEach(t => t.stop()); rec.disabled = false; return; }
    rec.disabled = false;
    const who = S.seats[1] || "Storyteller", made = await runInterview(stream, who, q);
    if (!box.isConnected) return;
    renderSitting(box, made.length ? `Saved ${made.length} ${made.length === 1 ? "recording" : "recordings"} on this device. You'll find them under Recorded.` : "Nothing was kept. Answers under a few seconds are treated as skips.");
    if (S.consent.transcribe && S.autoTx) made.forEach((id) => { const c = clips.find((x) => x.id === id), li = c && [...document.querySelectorAll(".clips li")].find((x) => x.querySelector("audio") && x.querySelector("audio").src === c.url); if (li && li._run) li._run(); });
  };

  if (clips.length) {
    const sec = $(`<section><h2 class="sec">Recorded <span class="cnt">${clips.length} · ${fmtDur(clipTotal())}</span></h2><ul class="clips"></ul></section>`);
    clips.forEach((c) => sec.querySelector(".clips").append(clipRow(c, box)));
    box.append(sec);
  }

  const born = parseInt(S.elder.born, 10); // era anchors: ages ~10–30 are where memory is richest
  if (born > 1900 && born <= new Date().getFullYear()) {
    const hits = ERAS.filter((e) => e.y >= born + 10 && e.y <= born + 30);
    const era = $(`<section><h2 class="sec">What was happening</h2><p class="hint" style="margin:4px 0 0">${esc(S.elder.name)} at 10 to 30</p><ul class="eras2"></ul></section>`);
    if (hits.length) hits.forEach((e) => era.querySelector(".eras2").append($(`<li><b>${e.y}</b><span>${esc(e.t)}</span><em>${e.y - born} years old</em></li>`)));
    else era.querySelector(".eras2").replaceWith($(`<p class="hint">Nothing for those years.</p>`));
    box.append(era);
  }
  const wu = $(`<button class="btn wide" type="button">Finish this sitting</button>`);
  wu.onclick = () => wrapUp(() => renderSit(box, `Sitting saved. ${streak() > 1 ? `${streak()} weeks running.` : "See you next week."}`));
  box.append(wu);
}

