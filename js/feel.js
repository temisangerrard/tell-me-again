"use strict";
// What a game feels like: a soft sound and a buzz on your turn, a fanfare on a win, and emoji reactions between phones.
const soundOn = () => lsGet("sitting-sound") !== "off";
const setSound = (on) => lsSet("sitting-sound", on ? "on" : "off");
// One audio context for the whole app, created on the first touch (phones keep audio locked until a tap).
let audioCtx = null, sounds = null;
function audioReady() {
  try {
    if (!audioCtx) {
      const C = window.AudioContext || window.webkitAudioContext; if (!C) return null;
      audioCtx = new C();
      const master = buildChain(audioCtx);
      sounds = buildSounds(audioCtx, master);
    }
    if (audioCtx.state === "suspended") audioCtx.resume();
    return sounds;
  } catch { return null; }
}
["pointerdown", "touchstart", "keydown"].forEach((ev) => window.addEventListener(ev, () => { if (soundOn()) audioReady(); }, { passive: true }));
const play = (name, ...args) => { if (!soundOn()) return; const s = audioReady(); if (s && s[name]) { try { s[name](0, ...args); } catch {} } };
const buzz = (p) => { try { if (!reduceMotion() && navigator.vibrate) navigator.vibrate(p); } catch {} };
const feel = {
  yourTurn() { play("yourTurn"); buzz(40); },
  move() { play("tap"); },
  win() { play("win"); buzz([60, 40, 60, 40, 120]); },
  lose() { play("lose"); },
  rattle() { play("rattle"); },
  land() { play("land"); },
  hop(i, step) { if (!soundOn()) return; const s = audioReady(); if (s) { try { s.hop(i * step, i); } catch {} } },
  card() { play("card"); },
  sow() { play("sow"); },
  capture() { play("capture"); },
  react() { play("react"); }
};
const REACTIONS = ["😂", "👏", "😮", "❤️", "🔥"];
function floatReaction(host, emoji, who) {
  const el = document.createElement("div"); el.className = "float-react"; el.setAttribute("aria-hidden", "true");
  el.style.left = 10 + Math.random() * 70 + "%"; el.innerHTML = `<span>${esc(emoji)}</span><small>${esc(who || "")}</small>`;
  host.append(el); setTimeout(() => el.remove(), 2200);
}
