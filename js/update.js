"use strict";
// Keep the app current. A new version is fetched on every load, but a phone would otherwise run the old one until the *next*
// reload. When a new service worker takes over, reload once, but only if nothing would be lost (no recording, call, room or sitting).
const idleForUpdate = () =>
  !live && !activeVoiceRecording && !currentRoom && !sitting && !restoring && !(activeCall && activeCall.mode() !== "idle") // recording, call, room, sitting
  && !txBusy.size && !clipWrites.size && !pendingClipEdits.size && !clips.some((c) => c._unsaved)                         // transcripts and recordings still being saved
  && !(typeof game !== "undefined" && game && !game.over) && !(typeof ayo !== "undefined" && ayo && ayo.over === null) && !(typeof whot !== "undefined" && whot && !whot.over); // a game on this phone
function watchForUpdates() {
  if (!("serviceWorker" in navigator) || !location.protocol.startsWith("http")) return;
  const hadController = !!navigator.serviceWorker.controller; let waiting = false;
  // A new version has taken over. Reload into it as soon as that costs nothing: right away if idle, otherwise once the work finishes.
  const reloadWhenIdle = () => { if (waiting && idleForUpdate()) { waiting = false; location.reload(); } };
  navigator.serviceWorker.addEventListener("controllerchange", () => { if (!hadController) return; waiting = true; reloadWhenIdle(); setInterval(reloadWhenIdle, 3000); });
  navigator.serviceWorker.register("sw.js").then((reg) => reg.update()).catch(() => {});
  document.addEventListener("visibilitychange", () => { if (!document.hidden) { reloadWhenIdle(); navigator.serviceWorker.getRegistration().then((reg) => reg && reg.update()).catch(() => {}); } });
}
