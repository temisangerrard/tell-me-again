"use strict";
// Voice call widget
function micMessage(e) {
  const n = e && e.name;
  if (!window.isSecureContext || !navigator.mediaDevices) return "This page can't use the microphone here. Open it in Safari or Chrome.";
  if (n === "NotAllowedError" || n === "SecurityError") return "The microphone is blocked for this site. Turn it on in your browser or phone settings, then try again.";
  if (n === "NotFoundError" || n === "OverconstrainedError") return "No microphone found on this device.";
  if (n === "NotReadableError" || n === "AbortError") return "Another app is using the microphone. End any phone or video call, then try again.";
  return "We couldn't start the microphone. Try again.";
}
let activeCall = null, onCallChange = null, onClipSaved = null, onCallSkip = null;
function callDock() {
  let d = document.getElementById("calldock"); if (!d) { d = document.createElement("div"); d.id = "calldock"; d.className = "calldock"; d.hidden = true; d.setAttribute("aria-live", "polite"); document.body.append(d); }
  const tb = document.querySelector(".tabbar"); document.documentElement.style.setProperty("--tabh", (tb ? tb.offsetHeight : 0) + "px");
  return d;
}
function voiceSitting(box, relay, myName, note) {
  const dockEl = callDock();
  let pc = null, local = null, ctx = null, mix = null, mr = null, chunks = [], t0 = 0, q = null, mode = "idle", from = "", muted = false, pend = [], isCaller = false;
  let control = null, peerRecording = false, requesting = false, requestId = null, permissionReply = null, requestTimer, disconnectTimer, saving = null, resolveSaving = null, recordingQuestion = null, ending = false;
  const sendControl = data => { if (control && control.readyState === "open") { control.send(JSON.stringify(data)); return true; } return false; };
  function bindControl(channel) {
    control = channel;
    channel.onopen = render;
    channel.onclose = () => { if (permissionReply) permissionReply(false); if (mr) stopRec(); peerRecording = false; render(); };
    channel.onmessage = async e => {
      let m; try { m = JSON.parse(e.data); } catch { return; }
      if (m.k === "record-request" && !isCaller && !requesting && mode === "live" && typeof m.id === "string") {
        requesting = true;
        const samePeer = pc;
        const allowed = await recordingPermission("Both voices will be saved on the caller's device. You can stop recording at any time.");
        requesting = false;
        if (pc === samePeer && channel === control && mode === "live") sendControl({ k: "record-answer", id: m.id, allowed });
      } else if (m.k === "record-answer" && isCaller && m.id === requestId && permissionReply) permissionReply(m.allowed === true);
      else if (m.k === "record-state" && !isCaller) { peerRecording = m.recording === true; render(); }
      else if (m.k === "record-stop" && isCaller && mr) stopRec();
    };
  }
  const sig = (o) => relay({ t: "sig", d: JSON.stringify(o) });
  const audio = new Audio(); audio.autoplay = true; audio.playsInline = true;

  function render() {
    const paint = (el) => { if (mode === "idle") { dockEl.hidden = true; dockEl.replaceChildren(); box.replaceChildren(el); } else { box.replaceChildren(); dockEl.hidden = false; dockEl.replaceChildren(el); } };
    const root = () => (mode === "idle" ? box : dockEl);
    if (mode === "idle") { paint($(`<div class="voice"><h2>Voice call</h2><div class="vrow"><button class="btn" id="vs" type="button">Start a voice call</button></div></div>`)); box.querySelector("#vs").onclick = start; if (onCallChange) onCallChange(); return; }
    if (mode === "ringing") { paint($(`<div class="voice"><h2>${esc(from)} is calling</h2><div class="vrow"><button class="cta" id="vj" type="button" style="width:auto">Join</button><button class="btn" id="vn" type="button">Not now</button></div></div>`)); dockEl.querySelector("#vj").onclick = join; dockEl.querySelector("#vn").onclick = () => { mode = "idle"; render(); }; return; }
    const rec = !!mr;
    const recording = rec || peerRecording;
    paint($(`<div class="voice"><h2>${mode === "calling" ? "Waiting for them to join" : mode === "connecting" ? "Connecting…" : "On the call"}</h2>
      ${q ? `<p class="vq">${esc(q)}</p>` : `<p class="hint">${isCaller ? "" : "Listening"}</p>`}
      ${recording ? `<p class="hint" role="status"><i class="live"></i>Recording on the caller's device</p>` : ""}
      <div class="vrow">
        ${isCaller ? `<button class="btn" id="vq" type="button" ${rec ? "disabled" : ""}>Skip question</button><button class="cta" id="vr" type="button" style="width:auto" ${!rec && (mode !== "live" || control?.readyState !== "open" || requesting || saving) ? "disabled" : ""}>${rec ? "Stop and save" : requesting ? "Waiting for permission…" : "Record the answer"}</button>` : ""}
        ${!isCaller && peerRecording ? `<button class="btn" id="stop-peer" type="button">Stop recording</button>` : ""}
        <button class="btn" id="vm" type="button" aria-pressed="${muted}">${muted ? "Unmute" : "Mute"}</button><button class="btn danger" id="vh" type="button">Hang up</button></div></div>`));
    const g = (i) => root().querySelector(i);
    if (g("#vq")) g("#vq").onclick = () => { if (onCallSkip) onCallSkip(); };
    if (g("#vr")) g("#vr").onclick = rec ? stopRec : startRec;
    if (g("#stop-peer")) g("#stop-peer").onclick = () => sendControl({ k: "record-stop" });
    g("#vm").onclick = () => { muted = !muted; if (local) local.getAudioTracks().forEach((t) => t.enabled = !muted); render(); };
    g("#vh").onclick = () => { sig({ k: "bye" }); end(); };
    if (onCallChange) onCallChange();
  }
  function mkPc() {
    pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.cloudflare.com:3478" }] });
    if (isCaller) bindControl(pc.createDataChannel("recording-permission"));
    else pc.ondatachannel = e => { if (e.channel.label === "recording-permission") bindControl(e.channel); };
    local.getTracks().forEach((t) => pc.addTrack(t, local));
    pc.onicecandidate = (e) => { if (e.candidate) sig({ k: "ice", c: e.candidate }); };
    pc.ontrack = (e) => { audio.srcObject = e.streams[0]; audio.play().catch(() => {}); };
    pc.onconnectionstatechange = () => {
      if (pc && pc.connectionState === "connected") { clearTimeout(disconnectTimer); mode = "live"; render(); }
      if (pc && pc.connectionState === "disconnected") { clearTimeout(disconnectTimer); disconnectTimer = setTimeout(() => { if (pc && pc.connectionState === "disconnected") { note("Connection lost. Saving the recorded part."); end(); } }, 5000); }
      if (pc && pc.connectionState === "failed") { note("The call couldn't connect. Try Wi-Fi or mobile data."); end(); }
    };
  }
  async function mic() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { note(micMessage()); return false; }
    try { local = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); return true; }
    catch (e) {
      if (e && (e.name === "OverconstrainedError" || e.name === "TypeError")) { try { local = await navigator.mediaDevices.getUserMedia({ audio: true }); return true; } catch (e2) { e = e2; } }
      note(micMessage(e), 8000); return false;
    }
  }
  async function start() {
    if (!navigator.mediaDevices || typeof RTCPeerConnection === "undefined") return note("This browser can't make voice calls yet. Try the latest Chrome or Safari.");
    if (!(await mic())) return;
    isCaller = true; mode = "calling"; sig({ k: "call", n: myName() }); render();
  }
  async function join() {
    if (!(await mic())) { mode = "idle"; return render(); }
    isCaller = false; mode = "connecting"; mkPc(); sig({ k: "join" }); render();
  }
  async function flush() { for (const c of pend.splice(0)) { try { await pc.addIceCandidate(c); } catch {} } }
  async function onSig(raw) {
    let m; try { m = JSON.parse(raw); } catch { return; }
    if (m.k === "call" && mode === "idle") { from = String(m.n || "Someone").slice(0, 30); mode = "ringing"; render(); }
    else if (m.k === "join" && isCaller && mode === "calling" && local) {
      mode = "connecting"; mkPc(); render();
      const o = await pc.createOffer(); await pc.setLocalDescription(o); sig({ k: "offer", s: pc.localDescription });
    } else if (m.k === "offer" && pc && !isCaller) {
      await pc.setRemoteDescription(m.s); await flush();
      const a = await pc.createAnswer(); await pc.setLocalDescription(a); sig({ k: "answer", s: pc.localDescription });
    } else if (m.k === "answer" && pc && isCaller) { await pc.setRemoteDescription(m.s); await flush(); }
    else if (m.k === "ice" && m.c) { if (pc && pc.remoteDescription) { try { await pc.addIceCandidate(m.c); } catch {} } else pend.push(m.c); }
    else if (m.k === "q") { q = String(m.q || "").slice(0, 400); if (mode === "live") render(); }
    else if (m.k === "bye") { if (mode === "ringing" || mode === "idle") { mode = "idle"; render(); } else { note("The call ended."); end(); } }
  }
  async function startRec() {
    if (requesting || saving || mode !== "live" || restoring || !control || control.readyState !== "open") return;
    const samePeer = pc;
    requesting = true; render();
    const hostAllowed = await recordingPermission("Both voices will be saved on this device. The other person will also be asked for permission.");
    if (!hostAllowed || pc !== samePeer || ending || mode !== "live") { requesting = false; render(); return; }
    const allowed = await new Promise(resolve => {
      requestId = crypto.randomUUID();
      permissionReply = value => { clearTimeout(requestTimer); permissionReply = null; requestId = null; resolve(value); };
      requestTimer = setTimeout(() => { if (permissionReply) permissionReply(false); }, 60000);
      if (!sendControl({ k: "record-request", id: requestId })) permissionReply(false);
    });
    requesting = false;
    if (!allowed || pc !== samePeer || mode !== "live" || ending) { note("Recording wasn't allowed. You can keep talking."); render(); return; }
    const remote = audio.srcObject;
    if (!remote || typeof MediaRecorder === "undefined") { note("Can't record on this browser."); render(); return; }
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)(); await ctx.resume(); mix = ctx.createMediaStreamDestination();
      if (pc !== samePeer || mode !== "live" || ending || control?.readyState !== "open") { await ctx.close(); ctx = null; return; }
      ctx.createMediaStreamSource(local).connect(mix); ctx.createMediaStreamSource(remote).connect(mix);
      chunks = []; mr = new MediaRecorder(mix.stream); mr.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
      mr.onstop = saveRec; mr.onerror = () => { note("Recording was interrupted. Saving what was captured."); stopRec(); };
      recordingQuestion = q || "Free story"; t0 = Date.now(); activeVoiceRecording = true;
      saving = new Promise(resolve => { resolveSaving = resolve; });
      mr.start(1000); sendControl({ k: "record-state", recording: true }); render();
    } catch { mr = null; activeVoiceRecording = false; try { ctx && ctx.close(); } catch {} ctx = null; saving = null; note("Recording couldn't start. Your call is still connected."); render(); }
  }
  function stopRec() {
    if (mr && mr.state !== "inactive") { mr.stop(); sendControl({ k: "record-state", recording: false }); }
    return saving;
  }
  async function saveRec() {
    const recorder = mr;
    const blob = new Blob(chunks, { type: recorder.mimeType }), clip = { id: crypto.randomUUID(), q: recordingQuestion, at: t0, dur: Math.max(1, Math.round((Date.now() - t0) / 1000)), blob, recordingConsent: { method: "remote", at: t0 } };
    mr = null; try { await ctx.close(); } catch {} ctx = null;
    let kept = true;
    if (!DEV.has("data")) { try { await idbDo("readwrite", st => st.put(clip)); } catch { kept = false; } }
    clips.unshift({ ...clip, url: URL.createObjectURL(blob), _unsaved: !kept }); S.told++; if (recordingQuestion !== "Free story") S.asked.push(recordingQuestion); save(); q = null;
    activeVoiceRecording = false;
    const finish = resolveSaving; resolveSaving = null; saving = null; if (finish) finish(); if (onClipSaved) onClipSaved();
    note(kept ? "Saved on this device." : "Storage is full or unavailable. Keep this page open and download a backup to save the recording.", 0); render();
  }
  async function end() {
    if (ending) return;
    ending = true; clearTimeout(disconnectTimer); clearTimeout(requestTimer);
    if (permissionReply) permissionReply(false);
    if (mr || saving) await stopRec();
    try { ctx && ctx.close(); } catch {} ctx = null;
    try { control && control.close(); } catch {} control = null;
    try { pc && pc.close(); } catch {} pc = null;
    if (local) local.getTracks().forEach(t => t.stop()); local = null;
    audio.srcObject = null; announced = -1; mode = "idle"; isCaller = false; q = null; pend = []; muted = false; peerRecording = false; requesting = false; ending = false; render();
  }
  // The caller's Sit screen steers the call: the current question is pushed to the other phone.
  let announced = -1;
  const api = {
    onSig, end, start, join,
    mode: () => mode, live: () => mode === "live" && isCaller, calling: () => mode === "calling", recording: () => !!mr || requesting,
    toggleRec: () => (mr ? stopRec() : startRec()),
    setQuestion: (t) => { if (!isCaller || mode === "idle") return; const v = t || null; if (v === q) return; q = v; sig({ k: "q", q: v || "" }); render(); },
    announce: (n) => { if (mode === "calling" && n !== announced) { announced = n; sig({ k: "call", n: myName() }); } }
  };
  activeCall = api;
  render();
  return api;
}

