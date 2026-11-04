"use strict";
// Records one microphone or mixed stream as a run of clips, one per question, without ever stopping the stream. cut() starts the
// next recorder on the same stream before the old one is closed, so nothing between questions is lost. Used by the in-person
// interview and by calls. Answers shorter than IV_MIN seconds count as a skip and are not kept.
let IV_MIN = 3;
function segmentRecorder(stream, { who, method = "in-person", onSaved, onError } = {}) {
  let cur = null, pausedAt = 0, keptAll = true; const saves = [], made = [];
  const begin = (question) => {
    const mine = [], rec = new MediaRecorder(stream); rec._chunks = mine; rec._q = question; rec._t0 = Date.now(); rec._acc = 0;
    rec.ondataavailable = (e) => { if (e.data && e.data.size) mine.push(e.data); };
    rec.onerror = () => { if (onError) onError(); };
    cur = rec; rec.start(1000); return rec;
  };
  const keepSeg = async (rec, stopped) => {
    await stopped;
    const dur = Math.round(((rec._end || Date.now()) - rec._t0 - rec._acc) / 1000);
    if (dur < IV_MIN || !rec._chunks.length) return;
    const blob = new Blob(rec._chunks, { type: rec.mimeType });
    const clip = { id: (crypto.randomUUID ? crypto.randomUUID() : Date.now() + "-" + Math.random().toString(36).slice(2, 6)), q: rec._q || "Free story", who: typeof who === "function" ? who() : who, at: rec._t0, dur, blob, recordingConsent: { method, at: rec._t0 } };
    let kept = true; if (!DEV.has("data")) { try { await idbDo("readwrite", (st) => st.put(clip)); } catch { kept = false; } }
    if (!kept) keptAll = false;
    clips.unshift({ ...clip, url: URL.createObjectURL(blob), _unsaved: !kept }); S.told++; save(); made.push(clip.id);
    if (onSaved) onSaved(clip);
  };
  const close = (rec) => { // the handler goes on before stop(): a recorder reads "inactive" at once but hands over its last chunk later
    rec._end = Date.now(); if (pausedAt) { rec._acc += rec._end - pausedAt; pausedAt = 0; }
    const stopped = new Promise((r) => { if (rec.state === "inactive") r(); else { rec.onstop = r; rec.stop(); } });
    saves.push(keepSeg(rec, stopped));
  };
  return {
    start(question) { begin(question); },
    cut(nextQuestion) { const old = cur; begin(nextQuestion); if (old) close(old); },
    pause() { if (!cur || pausedAt) return; try { cur.pause(); } catch {} pausedAt = Date.now(); },
    resume() { if (!cur || !pausedAt) return; try { cur.resume(); } catch {} cur._acc += Date.now() - pausedAt; pausedAt = 0; },
    async stop() { const rec = cur; cur = null; if (rec) close(rec); await Promise.allSettled(saves); return { made: [...made], keptAll }; },
    get active() { return !!cur; }, get question() { return cur ? cur._q : null; }, get state() { return cur ? cur.state : "inactive"; }
  };
}
