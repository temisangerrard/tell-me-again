"use strict";
// Start the app
if (onOldHome() && !DEV.has("data") && (QS.has("room") || !hasLocalFamily())) toNewHome(); // nothing stored here to lose
const ROOM_PARAM = DEV.has("data") ? null : parseCode("room=" + (QS.get("room") || ""));
if (ROOM_PARAM) guestScreen(ROOM_PARAM); else render();
loadClips().then(() => { const sit = document.getElementById("sit"); if (sit && !sit.hidden && !live) renderSit(sit); });
watchForUpdates();
loadClips().then(() => { if (hasLocalFamily()) movedNotice(); });
refreshAccount().then(() => { const f = document.getElementById("family"); if (f && !f.hidden && typeof renderFamily === "function") renderFamily(f); });
