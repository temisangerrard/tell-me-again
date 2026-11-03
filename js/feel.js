"use strict";
// What a game feels like: a soft sound and a buzz on your turn, a fanfare on a win, and emoji reactions between phones.
const soundOn = () => lsGet("sitting-sound") !== "off";
const setSound = (on) => lsSet("sitting-sound", on ? "on" : "off");
let audioCtx = null;
function tone(freq, at, dur, gain = 0.06, type = "sine") {
  if (!soundOn()) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator(), g = audioCtx.createGain(), t = audioCtx.currentTime + at;
    o.type = type; o.frequency.value = freq; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(audioCtx.destination); o.start(t); o.stop(t + dur + 0.02);
  } catch {}
}
const buzz = (p) => { try { if (!reduceMotion() && navigator.vibrate) navigator.vibrate(p); } catch {} };
const feel = {
  yourTurn() { tone(660, 0, 0.14); tone(880, 0.12, 0.2); buzz(40); },
  move() { tone(520, 0, 0.06, 0.035, "triangle"); },
  win() { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.28, 0.07)); buzz([60, 40, 60, 40, 120]); },
  lose() { tone(392, 0, 0.25, 0.04); tone(330, 0.18, 0.3, 0.04); },
  rattle() { tone(300 + Math.random() * 200, 0, 0.04, 0.03, "square"); },
  land() { tone(440, 0, 0.1, 0.05, "triangle"); },
  hop(i, step) { tone(420 + i * 45, i * step, 0.05, 0.03, "triangle"); },
  react() { tone(740, 0, 0.08, 0.04, "triangle"); }
};
const REACTIONS = ["😂", "👏", "😮", "❤️", "🔥"];
function floatReaction(host, emoji, who) {
  const el = document.createElement("div"); el.className = "float-react"; el.setAttribute("aria-hidden", "true");
  el.style.left = 10 + Math.random() * 70 + "%"; el.innerHTML = `<span>${esc(emoji)}</span><small>${esc(who || "")}</small>`;
  host.append(el); setTimeout(() => el.remove(), 2200);
}
