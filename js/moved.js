"use strict";
// The app now lives at tellagain.app. The old workers.dev address keeps working, but anyone who set up a family there has it stored
// in that address's browser storage, which does not travel. So: no data (or a room link) goes straight across; a family with data
// gets a clear note and a backup button, then restores it at the new address.
const NEW_HOME = "https://tellagain.app";
function onOldHome() { return /\.workers\.dev$/.test(location.hostname); }
const hasLocalFamily = () => { try { const s = JSON.parse(localStorage.getItem(KEY) || "{}"); return !!(s && s.step >= 1); } catch { return false; } };
const toNewHome = () => location.replace(NEW_HOME + location.pathname.replace(/index\.html$/, "") + location.search + location.hash);
function movedNotice() {
  if (!onOldHome() || document.getElementById("moved")) return;
  const el = $(`<div class="moved" id="moved" role="region" aria-label="We have moved"><div><b>We've moved to tellagain.app.</b><p>Your family and recordings are stored in this browser, so they don't move on their own. Download a backup here, open tellagain.app, then use Family > Restore backup.</p></div>
    <div class="mrow"><button class="btn" id="mbk" type="button">Download backup</button><a class="btn" href="${NEW_HOME}">Open tellagain.app</a><button class="lnk" id="mno" type="button">Later</button></div><p class="err" id="mmsg" role="status"></p></div>`);
  document.body.prepend(el);
  el.querySelector("#mbk").onclick = async () => { const m = el.querySelector("#mmsg"); try { const text = await createBackup(); downloadFile(new Blob([text], { type: "application/json" }), "tell-me-again-backup.json"); m.textContent = "Backup downloaded. Now open tellagain.app and restore it."; } catch (e) { m.textContent = e.message; } };
  el.querySelector("#mno").onclick = () => el.remove();
}
