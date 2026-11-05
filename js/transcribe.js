"use strict";
// Turning a recording into text
/* ---------- Turning a recording into text ----------
 * The audio goes to /api/transcribe, which hands it to Cloudflare's speech model and returns the words. Nothing is kept there.
 * The words are saved with the recording on this device, and the family can edit them: AI mishears names and places. */
const TX_LANGS = [["", "Detect automatically"], ["en", "English"], ["fr", "French"], ["pt", "Portuguese"], ["ar", "Arabic"], ["yo", "Yoruba"], ["ha", "Hausa"], ["sw", "Swahili"]];
const txBusy = new Set(); // clip ids being transcribed right now
const clipRecord = (c) => Object.fromEntries(Object.entries(c).filter(([k]) => k !== "url" && k[0] !== "_")); // what gets stored: no blob URL, no UI flags
const pendingClipEdits = new Map(), clipWrites = new Set();
const saveClip = c => {
  if (DEV.has("data")) return Promise.resolve();
  const write = idbDo("readwrite", st => st.put(clipRecord(c)));
  clipWrites.add(write); write.then(() => { c._unsaved = false; clipWrites.delete(write); }, () => clipWrites.delete(write));
  return write;
};
async function flushClipEdits() {
  const queued = [...pendingClipEdits.values()].map(save => save());
  await Promise.all([...queued, ...clipWrites]);
}
async function cancelClipEdits() {
  for (const save of pendingClipEdits.values()) save.cancel();
  pendingClipEdits.clear(); await Promise.allSettled([...clipWrites]);
}
const txNames = () => [...new Set([...String(S.hints || "").split(","), famName(S.name), S.elder.name, ...S.seats.slice(2), ...(S.people || []).map((x) => x.n), S.me.name, S.town].map((x) => String(x || "").trim()).filter(Boolean))].join(", ").slice(0, 170);
async function transcribeClip(c) {
  if (c.dur > 720) throw new Error("That recording is longer than 12 minutes, which is too long to turn into text in one go.");
  const q = new URLSearchParams(); if (S.lang) q.set("lang", S.lang); const nm = txNames(); // names go in a header, never the address, so they cannot end up in a URL log
  let r; try { r = await fetch("/api/transcribe?" + q, { method: "POST", headers: { "content-type": c.blob.type || "audio/webm", ...(nm ? { "x-names": encodeURIComponent(nm) } : {}) }, body: c.blob }); } catch { throw new Error("Couldn't reach the speech service. Check your connection and try again."); }
  const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || "Couldn't turn that into text. Please try again.");
  c.text = j.text || ""; c.tx = "ai"; c.txAt = Date.now(); await saveClip(c);
  if (loreOn()) extractLore(c).catch(() => {}); // lore is a bonus; a failure here never loses the words
}
