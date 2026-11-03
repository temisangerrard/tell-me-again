"use strict";
// Your turn, even when you're looking at something else. A page that's backgrounded on a phone is paused by the system, so this
// works where the page is still alive (a desktop tab, an Android tab); everywhere else, coming back shows whose turn it is.
const nudge = (() => {
  let flash = null, base = null;
  const supported = () => typeof Notification !== "undefined";
  const on = () => supported() && lsGet("sitting-alerts") === "on" && Notification.permission === "granted";
  const stopFlash = () => { if (flash) { clearInterval(flash); flash = null; } if (base !== null) { document.title = base; base = null; } };
  return {
    supported, on,
    async enable() {
      if (!supported()) return false;
      let p = Notification.permission; if (p === "default") { try { p = await Notification.requestPermission(); } catch { p = "denied"; } }
      const ok = p === "granted"; lsSet("sitting-alerts", ok ? "on" : "off"); return ok;
    },
    disable() { lsSet("sitting-alerts", "off"); },
    // It became your turn. If the page isn't being looked at, flash the tab title and (if allowed) send a notification.
    turn(who) {
      if (!document.hidden) return;
      if (flash === null) { base = document.title; let on1 = true; document.title = "● Your turn"; flash = setInterval(() => { document.title = (on1 = !on1) ? "● Your turn" : base; }, 1200); }
      if (on()) {
        const show = (reg) => { try { reg.showNotification("Your turn", { body: who ? `${who} is waiting` : "Come back to the game", tag: "turn", renotify: true, silent: false }); } catch {} };
        try { if (navigator.serviceWorker && navigator.serviceWorker.ready) navigator.serviceWorker.ready.then(show, () => {}); else new Notification("Your turn"); } catch {}
      }
    },
    // The page is visible again: stop flashing, and if it's still your turn, make that unmissable for a moment.
    back(stage, mine) {
      stopFlash();
      if (mine && stage) { stage.classList.remove("nudge"); void stage.offsetWidth; stage.classList.add("nudge"); setTimeout(() => stage.classList.remove("nudge"), 1800); feel.yourTurn(); }
    }
  };
})();
