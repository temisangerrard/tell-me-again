"use strict";
// Recordings kept on the device (IndexedDB)
/* ---------- the room: Sit / Play / Make ---------- */
let clips = []; // {id, q, at, dur, blob, url}. Kept on this device in IndexedDB so they survive a refresh. Nothing is uploaded.
const idbOpen = () => new Promise((res, rej) => { const r = indexedDB.open("tellmeagain", 1); r.onupgradeneeded = () => r.result.createObjectStore("clips", { keyPath: "id" }); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
const idbDo = async (mode, fn) => {
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("clips", mode); let rq;
    tx.oncomplete = () => { db.close(); resolve(rq && rq.result); };
    tx.onabort = () => { db.close(); reject(tx.error || new Error("Recording storage was interrupted.")); };
    tx.onerror = () => {};
    try { rq = fn(tx.objectStore("clips")); } catch (error) { tx.abort(); reject(error); }
  });
};
async function loadClips() {
  if (DEV.has("data")) return;
  try { const all = await idbDo("readonly", (st) => st.getAll()); clips = all.sort((a, b) => b.at - a.at).map((c) => ({ ...c, url: URL.createObjectURL(c.blob) })); } catch {}
}
const clipTotal = () => clips.reduce((a, c) => a + (c.dur || 0), 0);
const fmtDur = (sec) => `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, "0")}`;
