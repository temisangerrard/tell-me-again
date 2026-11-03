"use strict";
// Start the app
const ROOM_PARAM = DEV.has("data") ? null : parseCode("room=" + (QS.get("room") || ""));
if (ROOM_PARAM) guestScreen(ROOM_PARAM); else render();
loadClips().then(() => { const sit = document.getElementById("sit"); if (sit && !sit.hidden && !live) renderSitting(sit); });
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("sw.js").catch(() => {});
