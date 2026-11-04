"use strict";
// The interview: one continuous recording session. You start it once; recording runs from then on and the questions move along
// under you. "Next question" cuts the audio at that moment (a new recorder takes over the same microphone, so nothing is lost)
// and each answer is saved as its own recording with its question, ready to transcribe. No countdown, no stopping between answers.
function runInterview(stream, who, firstQ) {
  return new Promise((resolve) => {
    let curQ = firstQ, paused = false, ended = false, wake = null, endArm = 0;
    const made = [];
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

    const rec = segmentRecorder(stream, { who, method: "in-person", onError: () => { if (!ended) finish(); } });
    const cut = () => { // close this answer and open the next on the same microphone
      if (curQ) S.asked.push(curQ.q);
      curQ = nextQuestion(); if (paused) { paused = false; pausedTotal += Date.now() - pausedSince; $q(".ivpause").textContent = "Pause"; $q(".ivstate").textContent = "Recording"; ov.classList.remove("paused"); }
      rec.cut(curQ ? curQ.q : null); save(); paint();
    };
    async function finish() {
      if (ended) return; ended = true; clearInterval(clock);
      if (curQ) S.asked.push(curQ.q);
      const r = await rec.stop(); made.push(...r.made); save();
      stream.getTracks().forEach((t) => t.stop()); live = null; try { wake && wake.release(); } catch {}
      ov.remove(); document.body.classList.remove("lock"); resolve(made);
    }
    $q(".ivnext").onclick = () => { if (ended || !curQ) return; cut(); const n = $q(".ivnext"); n.classList.remove("pulse"); void n.offsetWidth; n.classList.add("pulse"); };
    $q(".ivpause").onclick = (e) => {
      if (ended) return; const b = e.currentTarget;
      if (!paused) { rec.pause(); paused = true; pausedSince = Date.now(); b.textContent = "Resume"; $q(".ivstate").textContent = "Paused"; ov.classList.add("paused"); }
      else { rec.resume(); paused = false; pausedTotal += Date.now() - pausedSince; b.textContent = "Pause"; $q(".ivstate").textContent = "Recording"; ov.classList.remove("paused"); }
    };
    $q(".ivend").onclick = (e) => { const b = e.currentTarget; if (Date.now() < endArm) { finish(); return; } endArm = Date.now() + 3000; b.textContent = "Tap again to finish"; setTimeout(() => { if (!ended && Date.now() >= endArm) { endArm = 0; b.textContent = "Finish"; } }, 3100); };
    try { navigator.wakeLock && navigator.wakeLock.request("screen").then((w) => { wake = w; }).catch(() => {}); } catch {}
    rec.start(curQ ? curQ.q : null); live = { mr: { set onstop(v) {}, stop() { finish(); } }, stream }; // other screens stop a live recording through this
    paint(); $q(".ivnext").focus();
  });
}
