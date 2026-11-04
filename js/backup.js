"use strict";
// Local backups and restore
/* ---------- Complete local backups ---------- */
const BACKUP_LIMIT = 128 * 1024 * 1024;
let restoring = false;
function downloadFile(blob, name) {
  const url = URL.createObjectURL(blob), a = document.createElement("a");
  a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function createBackup() {
  if (live || activeVoiceRecording || restoring || txBusy.size) throw new Error("Finish recording or transcription before making a backup.");
  const family = structuredClone(S), recordings = [], snapshot = clips.map(c => ({ ...c }));
  let bytes = 0;
  for (const c of snapshot) {
    bytes += c.blob.size;
    if (bytes > BACKUP_LIMIT * .7) throw new Error("This archive is too large for one backup. Save the audio files individually.");
    const data = new Uint8Array(await c.blob.arrayBuffer()); let binary = "";
    for (let i = 0; i < data.length; i += 32768) binary += String.fromCharCode(...data.subarray(i, i + 32768));
    recordings.push({ id: c.id, q: c.q, ...(c.who ? { who: c.who } : {}), at: c.at, dur: c.dur, type: c.blob.type, size: c.blob.size, audio: btoa(binary),
      ...(c.text !== undefined ? { text: c.text, tx: c.tx || "typed", txAt: c.txAt } : {}), ...(c.recordingConsent ? { recordingConsent: c.recordingConsent } : {}) });
  }
  return JSON.stringify({ app: "Tell Me Again", version: 1, exportedAt: new Date().toISOString(), family, theme: getTheme(), recordings });
}
function parseBackup(text) {
  const bad = () => { throw new Error("This isn't a valid Tell Me Again backup."); };
  if (typeof text !== "string" || text.length > BACKUP_LIMIT) throw new Error("Choose a backup smaller than 128 MB.");
  let b; try { b = JSON.parse(text); } catch { return bad(); }
  const object = v => v && typeof v === "object" && !Array.isArray(v);
  const string = (v, max = 1000) => typeof v === "string" && v.length <= max;
  const strings = (v, count, length) => Array.isArray(v) && v.length <= count && v.every(x => string(x, length));
  const number = (v, max) => Number.isFinite(v) && v >= 0 && v <= max;
  const forbidden = v => object(v) ? Object.keys(v).some(k => ["__proto__", "constructor", "prototype"].includes(k) || forbidden(v[k])) : Array.isArray(v) && v.some(forbidden);
  if (!object(b) || b.app !== "Tell Me Again" || b.version !== 1 || forbidden(b) || !object(b.family) || !Array.isArray(b.recordings) || b.recordings.length > 1000) return bad();
  const f = b.family, family = fresh();
  if (!object(f.me) || !string(f.me.name, 120) || !object(f.elder) || !string(f.elder.name, 120) || !string(f.elder.born, 4)) return bad();
  for (const key of ["name", "saying", "color", "town", "lang", "hints"]) {
    if (!string(f[key], 1000)) return bad(); family[key] = f[key];
  }
  if (!/^#[0-9a-f]{6}$/i.test(f.color) || !strings(f.seats, 4, 120) || !strings(f.heritage, 100, 120) || !strings(f.asked, 10000, 4000) || !strings(f.chapters, 20, 30) || !strings(f.makes, 10, 30)) return bad();
  if (!f.chapters.every(k => CHAPTERS.some(c => c.id === k)) || !f.makes.every(k => MAKES.some(([id]) => id === k))) return bad();
  if (!Number.isInteger(f.told) || !number(f.told, 10000000) || !Number.isInteger(f.step) || !number(f.step, 7)) return bad();
  if (!Array.isArray(f.wins) || f.wins.length > 1000 || !f.wins.every(w => object(w) && string(w.n, 120) && Number.isInteger(w.c) && number(w.c, 10000000))) return bad();
  if (!Array.isArray(f.sittings) || f.sittings.length > 10000 || !f.sittings.every(s => object(s) && string(s.d, 40) && Number.isFinite(Date.parse(s.d)) && ["up", "down"].includes(s.r) && strings(s.t, 30, 120))) return bad();
  if (!object(f.whotRules)) return bad();
  for (const key of Object.keys(family.whotRules)) {
    if (key === "hand" ? ![0,4,5,6,7].includes(f.whotRules[key]) : typeof f.whotRules[key] !== "boolean") return bad();
    family.whotRules[key] = f.whotRules[key];
  }
  // People, avatars and lore ride along. Each is checked and rebuilt field by field, never copied across as it came.
  const short = (v, n) => typeof v === "string" ? v.slice(0, n) : "", list = (v, n, k) => Array.isArray(v) ? v.map((x) => short(x, k)).filter(Boolean).slice(0, n) : [];
  if (f.people !== undefined) {
    if (!Array.isArray(f.people) || f.people.length > 200) return bad();
    family.people = f.people.map((p) => object(p) && short(p.n, 40).trim() ? { n: short(p.n, 40).trim(), born: /^\d{0,4}$/.test(p.born || "") ? p.born || "" : "", ...(RELATIONS.some(([k]) => k === p.rel) ? { rel: p.rel } : {}), ...(object(p.av) ? { av: avClean(p.av) } : {}) } : null).filter(Boolean);
  }
  if (object(f.lore) && object(f.lore.clips)) {
    family.lore = { clips: {} };
    for (const [id, e] of Object.entries(f.lore.clips).slice(0, 2000)) if (object(e)) family.lore.clips[short(id, 80)] = { who: short(e.who, 40), q: short(e.q, 200), at: Number(e.at) || 0, tl: Number(e.tl) || 0,
      people: (Array.isArray(e.people) ? e.people : []).map((p) => ({ n: short(p && p.n, 40), rel: short(p && p.rel, 30) })).filter((p) => p.n).slice(0, 12), places: list(e.places, 10, 50), years: list(e.years, 8, 4), foods: list(e.foods, 10, 40), sayings: list(e.sayings, 5, 140), themes: list(e.themes, 3, 30) };
  }
  Object.assign(family, { me: { name: f.me.name, ...(object(f.me.av) ? { av: avClean(f.me.av) } : {}) }, elder: { name: f.elder.name, born: f.elder.born }, seats: f.seats, heritage: f.heritage, asked: f.asked, chapters: f.chapters, makes: f.makes, wins: f.wins, sittings: f.sittings, told: f.told, step: f.step });
  // A restored archive never grants permission to send audio from this device.
  family.consent = { transcribe: false }; family.autoTx = false;
  if (b.theme !== undefined && !THEMES.some(([k]) => k === b.theme)) return bad();
  const ids = new Set(), recordings = b.recordings.map(c => {
    if (!object(c) || !string(c.id, 160) || !c.id || ids.has(c.id) || !string(c.q, 4000) || !number(c.at, 8640000000000000) || !number(c.dur, 86400) || !string(c.type, 120) || !/^(audio\/[a-z0-9.+-]+|video\/webm)(;[a-z0-9= .,+-]+)?$/i.test(c.type) || !Number.isInteger(c.size) || !number(c.size, BACKUP_LIMIT) || typeof c.audio !== "string") return bad();
    if (c.audio.length !== 4 * Math.ceil(c.size / 3) || !/^[A-Za-z0-9+/]*={0,2}$/.test(c.audio)) return bad();
    ids.add(c.id); let binary; try { binary = atob(c.audio); } catch { return bad(); }
    if (binary.length !== c.size) return bad();
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const out = { id: c.id, q: c.q, at: c.at, dur: c.dur, blob: new Blob([bytes], { type: c.type }) };
    if (c.who !== undefined) { if (!string(c.who, 80)) return bad(); out.who = c.who; } // older archives have no speaker
    if (c.text !== undefined) {
      if (!string(c.text, 1000000) || !["ai", "edited", "typed"].includes(c.tx)) return bad();
      out.text = c.text; out.tx = c.tx;
      if (c.txAt !== undefined) { if (!number(c.txAt, 8640000000000000)) return bad(); out.txAt = c.txAt; }
    }
    if (c.recordingConsent !== undefined) {
      if (!object(c.recordingConsent) || !["in-person", "remote"].includes(c.recordingConsent.method) || !number(c.recordingConsent.at, 8640000000000000)) return bad();
      out.recordingConsent = { method: c.recordingConsent.method, at: c.recordingConsent.at };
    }
    return out;
  });
  return { family, recordings, theme: b.theme || "white" };
}
async function restoreBackup(backup) {
  if (restoring || live || activeVoiceRecording || txBusy.size) throw new Error("Finish recording or transcription before restoring a backup.");
  if (currentRoom) throw new Error("Leave the online room before restoring a backup.");
  restoring = true;
  const keys = [KEY, "sitting-theme", "sitting-name", "sitting-room"], previous = new Map();
  try {
    await flushClipEdits();
    for (const k of keys) previous.set(k, localStorage.getItem(k));
    localStorage.setItem(KEY, JSON.stringify(backup.family)); localStorage.setItem("sitting-theme", backup.theme);
    localStorage.setItem("sitting-name", backup.family.me.name); localStorage.removeItem("sitting-room");
    await idbDo("readwrite", st => { st.clear(); for (const c of backup.recordings) st.put(c); });
  } catch (e) {
    for (const [k, v] of previous) { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch {} }
    throw new Error("The backup couldn't be restored. Your existing recordings were kept.", { cause: e });
  } finally { restoring = false; }
  clips.forEach(c => URL.revokeObjectURL(c.url));
  clips = backup.recordings.map(c => ({ ...c, url: URL.createObjectURL(c.blob) })).sort((a,b) => b.at-a.at);
  S = backup.family; game = null; ayo = null; whot = null; lastGame = null;
  render();
}
function backupControls(parent, allowDownload = true) {
  const download = $(`<button class="btn" type="button">Download full backup</button>`);
  const restore = $(`<label class="field"><span class="lbl">Restore backup</span><input type="file" accept=".json,application/json" style="display:block;max-width:100%;margin-top:12px"></label>`);
  const status = $(`<p class="err" role="status"></p>`);
  download.onclick = async () => {
    download.disabled = true; status.textContent = "Preparing backup…";
    try { const text = await createBackup(); downloadFile(new Blob([text], { type: "application/json" }), "tell-me-again-backup.json"); status.textContent = "Backup downloaded."; }
    catch (e) { status.textContent = e.message; } finally { download.disabled = false; }
  };
  restore.querySelector("input").onchange = async e => {
    const file = e.target.files[0]; if (!file) return; e.target.value = ""; status.textContent = "";
    try {
      if (file.size > BACKUP_LIMIT) throw new Error("Choose a backup smaller than 128 MB.");
      const backup = parseBackup(await file.text());
      const b = $(`<div><h2>Restore ${esc(backup.family.name || "family")}?</h2><p class="para" style="margin:16px 0">${backup.recordings.length} recordings. Replaces the family details and recordings on this device. Download a backup first if you want to keep them.</p><button class="cta" type="button">Replace and restore</button><p role="status" class="err"></p></div>`);
      const close = sheet("Restore family backup", b); b.append(closeBtn(close));
      b.querySelector(".cta").onclick = async e => {
        e.currentTarget.disabled = true;
        try { await restoreBackup(backup); close(); }
        catch (error) { b.querySelector(".err").textContent = error.message; b.querySelector(".cta").disabled = false; }
      };
    } catch (error) { status.textContent = error.message || "This backup couldn't be read."; }
  };
  if (allowDownload) parent.append(download);
  parent.append(restore, status);
}

