"use strict";
// Passphrase-protected backups. The backup file holds voices and private stories, so it can be sealed with a passphrase before it
// leaves the app: AES-256-GCM, key from the passphrase with PBKDF2-SHA256 (600,000 rounds). The passphrase is never stored or sent
// anywhere; forget it and the file cannot be opened by anyone, us included.
const SEAL_ITER = 600000, SEAL_MIN = 8;
const b64e = (u8) => { let s = ""; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
const b64d = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
async function sealKey(pass, salt, iter) {
  const km = await crypto.subtle.importKey("raw", new TextEncoder().encode(String(pass).normalize("NFKC")), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: iter, hash: "SHA-256" }, km, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}
const isSealed = (text) => typeof text === "string" && text.slice(0, 160).includes('"sealed":true');
async function sealBackup(text, pass) {
  if (String(pass).length < SEAL_MIN) throw new Error(`Use at least ${SEAL_MIN} characters.`);
  const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await sealKey(pass, salt, SEAL_ITER), new TextEncoder().encode(text)));
  return JSON.stringify({ app: "Tell Me Again", sealed: true, version: 1, kdf: "PBKDF2-SHA256", iter: SEAL_ITER, salt: b64e(salt), iv: b64e(iv), data: b64e(data) });
}
async function openBackup(text, pass) {
  let j; try { j = JSON.parse(text); } catch { throw new Error("This isn't a valid Tell Me Again backup."); }
  if (!j || j.sealed !== true || typeof j.salt !== "string" || typeof j.iv !== "string" || typeof j.data !== "string" || !(j.iter >= 100000 && j.iter <= 5000000)) throw new Error("This isn't a valid Tell Me Again backup.");
  try { return new TextDecoder().decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64d(j.iv) }, await sealKey(pass, b64d(j.salt), j.iter), b64d(j.data))); }
  catch { throw new Error("That passphrase doesn't open this backup."); }
}
// Ask for a passphrase in a sheet. Resolves to the passphrase, "" (save without one) or null (cancelled).
function askSeal(create) {
  return new Promise((res) => {
    const b = $(`<div><h2>${create ? "Protect this backup?" : "This backup is protected"}</h2>
      <p class="para" style="margin-top:10px">${create ? "A backup holds voices and private stories. A passphrase locks the file so only you can open it. We never see it and can't recover it, so keep it somewhere safe." : "Enter the passphrase you chose when you made it."}</p>
      <label class="field"><span class="lbl">Passphrase</span><input class="inp sm" id="pp" type="password" autocomplete="${create ? "new-password" : "current-password"}"></label>
      ${create ? `<label class="field"><span class="lbl">Again</span><input class="inp sm" id="pp2" type="password" autocomplete="new-password"></label>` : ""}
      <p class="err" id="pe" role="status"></p>
      <button class="cta" id="ok" type="button" style="margin-top:16px">${create ? "Protect and download" : "Open backup"}</button>
      ${create ? `<button class="btn" id="skip" type="button" style="width:100%;margin-top:8px;background:transparent;color:var(--muted)">Download without a passphrase</button>` : ""}</div>`);
    let done = false; const close = sheet(create ? "Protect this backup" : "Protected backup", b);
    const pp = b.querySelector("#pp"), pp2 = b.querySelector("#pp2"), pe = b.querySelector("#pe");
    b.querySelector("#ok").onclick = () => {
      if (pp.value.length < SEAL_MIN) { pe.textContent = `Use at least ${SEAL_MIN} characters.`; return; }
      if (create && pp.value !== pp2.value) { pe.textContent = "The two don't match."; return; }
      done = true; close(); res(pp.value);
    };
    const sk = b.querySelector("#skip"); if (sk) sk.onclick = () => { done = true; close(); res(""); };
    new MutationObserver((_, ob) => { if (!document.body.contains(b)) { ob.disconnect(); if (!done) res(null); } }).observe(document.body, { childList: true, subtree: true });
    pp.focus();
  });
}
