"use strict";
// The interview: one continuous recording session. You start it once; recording runs from then on and the questions move along
// under you. "Next question" cuts the audio at that moment (a new recorder takes over the same microphone, so nothing is lost)
// and each answer is saved as its own recording with its question, ready to transcribe. No countdown, no stopping between answers.
let IV_MIN = 3; // an answer shorter than this many seconds is treated as a skip and is not kept
function runInterview(stream, who, firstQ) {
  return new Promise((resolve) => {
    let curQ = firstQ, mr, chunks, segT0, segAcc = 0, segPausedAt = 0, paused = false, ended = false, wake = null, endArm = 0;
    const made = [], saves = [];
    const ov = $(`<div class="iv" role="dialog" aria-modal="true" aria-label="Interview in progress">
      <div class="ivtop"><div class="av" aria-hidden="true">${esc(initial(who))}</div><div class="ivwho"><span class="ivstate">Recording</span><b>${esc(who)}</b></div><div class="ivtime" role="timer" aria-label="Time recorded">0:00</div></div>
      <div class="ivq"><small></small><p class="q" aria-live="polite"></p><p class="tip"></p><div class="fus" role="group" aria-label="If they go quiet"></div></div>
      <div class="ivbar"><button class="ivnext" type="button">Next question</button><div class="ivrow"><button class="ivpause" type="button">Pause</button><button class="ivend" type="button">Finish</button></div></div></div>`);
    document.body.append(ov); document.body.classList.add("lock");
    const $q = (s) => ov.querySelector(s), t0 = Date.now(); let pausedTotal = 0, pausedSince = 0;

    const paint = () => {
      const ch = curQ && CHAPTERS.find((c) => c.id === curQ.c), fu = curQ ? (curQ.f && curQ.f.length ? curQ.f : FOLLOWUPS.slice(0, 3)) : [];
      $q(".ivq small").textContent = ch ? ch.label : "";
      $q(".ivq .q").textContent = curQ ? curQ.q : "That's every question for these topics. Keep talking, or finish when you're ready.";
      $q(".ivq .tip").textContent = (curQ && curQ.tip) || "";
      $q(".fus").replaceChildren(...fu.map((t) => { const b = $(`<button class="fu" type="button" aria-pressed="false">${esc(t)}</button>`); b.onclick = () => b.setAttribute("aria-pressed", b.getAttribute("aria-pressed") !== "true"); return b; }));
      ov.classList.toggle("sens", !!(curQ && curQ.sensitive));
      if (curQ && curQ.sensitive) $q(".ivq .tip").textContent = "This one can bring up hard memories. Check they're happy to go there. Skip it if not.";
      $q(".ivnext").textContent = curQ ? "Next question" : "Keep talking"; $q(".ivnext").disabled = !curQ;
    };
    const clock = setInterval(() => { if (paused) return; const s = Math.floor((Date.now() - t0 - pausedTotal) / 1000); $q(".ivtime").textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; }, 250);

    const begin = () => { const mine = []; chunks = mine; const rec = new MediaRecorder(stream); mr = rec; rec.ondataavailable = (e) => { if (e.data && e.data.size) mine.push(e.data); };
      rec.onerror = () => { if (!ended) finish(); }; segT0 = Date.now(); segAcc = 0; rec.start(1000); live = { mr: rec, stream }; return rec; };
    const segDur = () => Math.round((Date.now() - segT0 - segAcc) / 1000);
    const keep = async (rec, stopped, mine, q, dur, at) => { // save one finished answer, once the recorder has handed over its last chunk
      await stopped;
      if (dur < IV_MIN || !mine.length) return;
      const blob = new Blob(mine, { type: rec.mimeType });
      const clip = { id: Date.now() + "-" + Math.random().toString(36).slice(2, 6), q: q ? q.q : "Free story", who, at, dur, blob, recordingConsent: { method: "in-person", at } };
      let kept = true; if (!DEV.has("data")) { try { await idbDo("readwrite", (st) => st.put(clip)); } catch { kept = false; } }
      clips.unshift({ ...clip, url: URL.createObjectURL(blob), _unsaved: !kept }); S.told++; save(); made.push(clip.id);
    };
    const cut = (finalCut) => { // close the current answer; unless this is the end, a new recorder takes over straight away
      const rec = mr, mine = chunks, q = curQ, dur = segDur(), at = segT0;
      if (q) S.asked.push(q.q);
      if (!finalCut) { curQ = nextQuestion(); }
      if (paused) { paused = false; pausedTotal += Date.now() - pausedSince; }
      if (!finalCut) begin();
      const stopped = new Promise((r) => { if (rec.state === "inactive") r(); else { rec.onstop = r; rec.stop(); } }); // the handler goes on before stop(): a recorder reads "inactive" at once but delivers its last chunk later
      saves.push(keep(rec, stopped, mine, q, dur, at)); save();
      if (!finalCut) paint();
    };
    async function finish() {
      if (ended) return; ended = true; clearInterval(clock);
      try { cut(true); } catch {}
      await Promise.allSettled(saves);
      stream.getTracks().forEach((t) => t.stop()); live = null; try { wake && wake.release(); } catch {}
      ov.remove(); document.body.classList.remove("lock"); resolve(made);
    }
    $q(".ivnext").onclick = () => { if (ended || !curQ) return; cut(false); const n = $q(".ivnext"); n.classList.remove("pulse"); void n.offsetWidth; n.classList.add("pulse"); };
    $q(".ivpause").onclick = (e) => {
      if (ended) return; const b = e.currentTarget;
      if (!paused) { try { mr.pause(); } catch {} paused = true; pausedSince = Date.now(); segPausedAt = Date.now(); b.textContent = "Resume"; $q(".ivstate").textContent = "Paused"; ov.classList.add("paused"); }
      else { try { mr.resume(); } catch {} paused = false; pausedTotal += Date.now() - pausedSince; segAcc += Date.now() - segPausedAt; b.textContent = "Pause"; $q(".ivstate").textContent = "Recording"; ov.classList.remove("paused"); }
    };
    $q(".ivend").onclick = (e) => { const b = e.currentTarget; if (Date.now() < endArm) { finish(); return; } endArm = Date.now() + 3000; b.textContent = "Tap again to finish"; setTimeout(() => { if (!ended && Date.now() >= endArm) { endArm = 0; b.textContent = "Finish"; } }, 3100); };
    try { navigator.wakeLock && navigator.wakeLock.request("screen").then((w) => { wake = w; }).catch(() => {}); } catch {}
    begin(); paint(); $q(".ivnext").focus();
  });
}
