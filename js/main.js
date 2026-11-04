"use strict";
// Start the app
const ROOM_PARAM = DEV.has("data") ? null : parseCode("room=" + (QS.get("room") || ""));
if (ROOM_PARAM) guestScreen(ROOM_PARAM); else render();
loadClips().then(() => { const sit = document.getElementById("sit"); if (sit && !sit.hidden && !live) renderSit(sit); });
watchForUpdates();
refreshAccount().then(() => { if (S.step === 0 && !ROOM_PARAM && account && !document.querySelector(".authwrap")) render(); // the landing page shows who is signed in
  const f = document.getElementById("family"); if (f && !f.hidden && typeof renderFamily === "function") renderFamily(f); });
