"use strict";
// Privacy notice, consent, recording permission
const PRIVACY_V = "2026-11-04", PRIVACY_MAIL = "temisan@settley.co";
function grantConsent(k) { S.consent[k] = true; S.consent[k + "At"] = Date.now(); S.consent.v = PRIVACY_V; delete S.consent[k + "Off"]; save(); }
function withdrawConsent(k) { S.consent[k] = false; S.consent[k + "Off"] = Date.now(); save(); }
function privacySheet() {
  const b = $(`<div><h2>Privacy</h2><p class="hint" style="margin-top:6px">Version ${PRIVACY_V}</p>
    <h3 class="ph">Who's responsible</h3><p class="para">Tell Me Again is made by Settley Studio, run by Temisan Agbajoh, which is responsible for any information described here. Write to <a href="mailto:${PRIVACY_MAIL}">${PRIVACY_MAIL}</a> for anything below.</p>
    <h3 class="ph">What we hold</h3><p class="para"><b>On your device:</b> your family details, recordings, written-out words and game wins. We never see these.<br><b>In a game room you create:</b> first names and game moves, erased after a day of quiet.<br><b>If you make an account:</b> your email address, kept so we can send you a sign-in code. We send no marketing. Delete the account under Family and it goes. <b>If you build lore:</b> the written-out words of a story are sent to an AI helper, which lists the people, places, years, foods and sayings in it and suggests questions. It keeps nothing, and the lists live on your device. <b>If you turn a recording into text:</b> that audio is sent to Cloudflare's speech-to-text service and the words come back. Cloudflare says it keeps no data from this service, and we don't keep the audio.</p>
    <h3 class="ph">Why, and your say</h3><p class="para">Recordings of a person's voice and what they say about health, faith, family and history can be sensitive. So we only send audio anywhere after you say yes, and you can say no and still use everything else. Say yes again or withdraw any time under Family. Only record people who know and are happy about it.</p>
    <h3 class="ph">Your rights</h3><p class="para">You can see and download what the app holds, fix any text it wrote, delete everything, and withdraw consent, all under Family, without asking us. You can also ask us by email, and you can complain to your data protection authority.</p>
    <h3 class="ph">Cookies and tracking</h3><p class="para">None. The app stores your settings on your device only, which it needs to work.</p>
    <h3 class="ph">Children</h3><p class="para">Don't record anyone under 16 unless a parent or guardian is happy with it and present.</p></div>`);
  b.append(closeBtn(sheet("Privacy", b)));
}

// Ask once, plainly, before any audio leaves the device.
function askTxConsent() {
  return new Promise((res) => {
    const b = $(`<div><h2>Turn recordings into text?</h2>
      <p class="para" style="margin-top:10px">The audio goes to Cloudflare's speech-to-text service and the words come back. Neither of us keeps the audio. Turn it off any time under Family. <a href="#" id="pv">Privacy</a></p>
      <button class="cta" id="ok" type="button" style="margin-top:20px">Yes, turn it into text</button>
      <button class="btn" id="no" type="button" style="width:100%;margin-top:8px;background:transparent;color:var(--muted)">Not now</button></div>`);
    let done = false; const close = sheet("Turn recordings into text?", b);
    b.querySelector("#ok").onclick = () => { done = true; grantConsent("transcribe"); close(); res(true); };
    b.querySelector("#no").onclick = () => { close(); res(false); };
    b.querySelector("#pv").onclick = (e) => { e.preventDefault(); privacySheet(); };
    new MutationObserver((_, ob) => { if (!document.body.contains(b)) { ob.disconnect(); if (!done) res(false); } }).observe(document.body, { childList: true, subtree: true });
  });
}

// Recording permission belongs to the person speaking, separately from transcription permission.
function recordingPermission(consequence) {
  return new Promise(resolve => {
    const body = $(`<div><h2>Allow this recording?</h2><p class="para" style="margin:16px 0">${esc(consequence)}</p><label style="display:flex;gap:12px;align-items:flex-start;margin:20px 0"><input type="checkbox" style="margin-top:5px"><span>Everyone being recorded is 16 or older, or has a parent or guardian present and agreeing.</span></label><button class="cta" type="button" disabled>Allow recording</button><button class="btn" type="button" style="width:100%;margin-top:12px">Not now</button></div>`);
    let settled = false;
    const close = sheet("Recording permission", body);
    const finish = value => { if (settled) return; settled = true; close(); resolve(value); };
    const allow = body.querySelector(".cta");
    body.querySelector("input").onchange = e => { allow.disabled = !e.target.checked; };
    allow.onclick = () => { if (!allow.disabled) finish(true); };
    body.querySelector(".btn").onclick = () => finish(false);
    const observer = new MutationObserver(() => { if (!body.isConnected) { observer.disconnect(); finish(false); } });
    observer.observe(document.body, { childList: true, subtree: true });
  });
}
window.addEventListener("beforeunload", e => {
  if (live || activeVoiceRecording || restoring) { e.preventDefault(); e.returnValue = ""; }
});

// Wipe everything this app keeps on the device: family details, recordings, wins. Used by "Delete everything".
