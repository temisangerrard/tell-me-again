"use strict";
// Keep the app current. A new version is fetched on every load, but a phone would otherwise run the old one until the *next*
// reload. When a new service worker takes over, reload once, but only if nothing would be lost (no recording, call, room or sitting).
const idleForUpdate = () => !live && !activeVoiceRecording && !currentRoom && !sitting && !restoring && !(activeCall && activeCall.mode() !== "idle");
function watchForUpdates() {
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  const hadController = !!navigator.serviceWorker.controller; let reloaded = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => { if (!hadController || reloaded || !idleForUpdate()) return; reloaded = true; location.reload(); });
  navigator.serviceWorker.register("sw.js").then((reg) => reg.update()).catch(() => {});
  document.addEventListener("visibilitychange", () => { if (!document.hidden) navigator.serviceWorker.getRegistration().then((reg) => reg && reg.update()).catch(() => {}); });
}
}
