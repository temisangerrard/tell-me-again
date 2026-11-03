import assert from "node:assert/strict";
import test from "node:test";
import { app } from "./app.mjs";

async function fixture() {
  const a = app();
  await a.w.eval('loadClips()');
  a.w.eval('S.step=7; S.name="Etim"; S.me.name="Ada"; S.elder.name="Papa"; reseat(); S.consent.transcribe=true; S.autoTx=true;');
  a.w.sampleBlob = new Blob([new Uint8Array([0, 255, 1, 42])], {type:"audio/webm"});
  await a.w.eval('clips=[{id:"story-1",q:"Your first home?",at:1700000000000,dur:12,blob:sampleBlob,text:"We lived by the river.",tx:"edited",url:"blob:old"}]; idbDo("readwrite",st=>st.put(clipRecord(clips[0])))');
  return a;
}

test("backup round trip preserves audio bytes, family and edited transcript", async () => {
  const a = await fixture();
  try {
    const backup = await a.w.eval('createBackup()');
    a.w.backup = backup;
    const parsed = a.w.eval('parseBackup(backup)');
    assert.equal(parsed.family.name,"Etim");
    assert.equal(parsed.recordings[0].text,"We lived by the river.");
    assert.equal(parsed.recordings[0].tx,"edited");
    assert.deepEqual([...new Uint8Array(await parsed.recordings[0].blob.arrayBuffer())],[0,255,1,42]);
    assert.equal(parsed.recordings[0].url,undefined);
    a.w.eval('S.name="Other"');
    await a.w.eval('restoreBackup(parseBackup(backup))');
    assert.equal(a.w.eval('S.name'),"Etim");
    assert.equal(a.w.eval('S.consent.transcribe'),false);
    assert.equal(a.w.eval('S.autoTx'),false);
    assert.equal((await a.w.eval('idbDo("readonly",st=>st.getAll())')).length,1);
  } finally { a.close(); }
});

for (const [name, change] of [
  ["version", 'b.version=999'],
  ["duplicate ids", 'b.recordings.push({...b.recordings[0]})'],
  ["non-audio", 'b.recordings[0].type="text/html"'],
  ["invalid base64", 'b.recordings[0].audio="!?invalid"'],
  ["invalid family", 'b.family.seats="bad"'],
  ["prototype keys", 'b.family=JSON.parse(\'{"__proto__":{"polluted":true}}\')']
]) test(`rejects ${name} before replacing stored data`, async () => {
  const a = await fixture();
  try {
    a.w.backup = await a.w.eval('createBackup()');
    assert.throws(()=>a.w.eval(`{const b=JSON.parse(backup); ${change}; parseBackup(JSON.stringify(b));}`));
    assert.equal(a.w.eval('S.name'),"Etim");
    assert.equal((await a.w.eval('idbDo("readonly",st=>st.getAll())')).length,1);
  } finally { a.close(); }
});

test("failed recording transaction restores previous family settings and audio", async () => {
  const a = await fixture();
  try {
    a.w.backup = await a.w.eval('createBackup()');
    a.w.eval('save(); S.name="Original"; save();');
    const db = await a.w.eval('idbOpen()');
    const txOriginal = db.constructor.prototype.transaction;
    db.constructor.prototype.transaction = function(...args) {
      const tx = txOriginal.apply(this,args);
      if(args[1]==="readwrite") {const put=tx.objectStore("clips").put; tx.objectStore("clips").put=function(...args){const r=put.apply(this,args);tx.abort();return r;};}
      return tx;
    };
    try { await assert.rejects(a.w.eval('restoreBackup(parseBackup(backup))')); }
    finally { db.constructor.prototype.transaction=txOriginal;db.close(); }
    assert.equal(a.w.eval('S.name'),"Original");
    assert.equal(JSON.parse(a.w.localStorage.getItem("sitting-v2")).name,"Original");
    assert.equal((await a.w.eval('idbDo("readonly",st=>st.getAll())'))[0].text,"We lived by the river.");
  } finally { a.close(); }
});

test("a fresh device can reach restore without completing onboarding", () => {
  const a=app();
  try {
    const restore=[...a.w.document.querySelectorAll("button")].find(b=>b.textContent==="Restore backup");
    assert.ok(restore);restore.click();
    assert.ok(a.w.document.querySelector('[role="dialog"] input[type="file"]'));
  } finally {a.close();}
});

test("recording permission requires age/guardian confirmation and explicit agreement", async () => {
  const a=app();
  try {
    const decision=a.w.eval('recordingPermission("Both voices will be saved on this phone.")');
    const dialog=a.w.document.querySelector('[role="dialog"]');
    const allow=[...dialog.querySelectorAll('button')].find(b=>b.textContent==='Allow recording');
    assert.equal(allow.disabled,true);
    const check=dialog.querySelector('input[type="checkbox"]');check.checked=true;check.dispatchEvent(new a.w.Event('change'));
    assert.equal(allow.disabled,false);allow.click();assert.equal(await decision,true);
  } finally {a.close();}
});

test("dismissing recording permission refuses recording", async () => {
  const a=app();
  try {
    const decision=a.w.eval('recordingPermission("Saved on this phone.")');
    a.w.document.querySelector('.sheetback').dispatchEvent(new a.w.MouseEvent('click',{bubbles:true}));
    assert.equal(await decision,false);
  } finally {a.close();}
});

test("magazine uses only selected transcripts and escapes family-provided HTML", async () => {
  const a=await fixture();
  try {
    a.w.eval('S.name="Etim <script>alert(1)</script>"; clips[0].text="<img src=x onerror=alert(1)>\\n\\nWe lived by the river."; clips.push({...clips[0],id:"omit-me",text:"THIS STORY IS NOT SELECTED"});');
    const html=a.w.eval('buildMagazine(["story-1"])');
    assert.ok(html.includes('We lived by the river.'));assert.ok(!html.includes('THIS STORY IS NOT SELECTED'));
    assert.ok(!html.includes('<script>'));assert.ok(!html.includes('<img src=x'));assert.ok(html.includes('&lt;img'));
    const doc=new a.w.DOMParser().parseFromString(html,'text/html');
    assert.equal(doc.querySelectorAll('article').length,1);
    assert.match(doc.querySelector('article').textContent,/Your first home\?/);
  } finally {a.close();}
});

test("magazine rejects empty or missing transcripts", async () => {
  const a=await fixture();
  try {
    assert.throws(()=>a.w.eval('buildMagazine([])'),/Choose/);
    assert.throws(()=>a.w.eval('buildMagazine(["missing"])'),/transcript/);
    a.w.eval('clips[0].text="  "');assert.throws(()=>a.w.eval('buildMagazine(["story-1"])'));
  } finally {a.close();}
});

test("backup accepts a multi-megabyte audio recording", async () => {
  const a=await fixture();
  try {
    a.w.largeAudio=new Blob([new Uint8Array(4*1024*1024)],{type:'audio/webm;codecs=opus'});
    a.w.eval('clips[0].blob=largeAudio');a.w.backup=await a.w.eval('createBackup()');
    assert.equal(a.w.eval('parseBackup(backup).recordings[0].blob.size'),4*1024*1024);
  } finally {a.close();}
});

test("transcript storage failures are reported instead of silently succeeding", async () => {
  const a=await fixture();
  try {
    const db=await a.w.eval('idbOpen()'), original=db.constructor.prototype.transaction;
    db.constructor.prototype.transaction=function(...args){const tx=original.apply(this,args);if(args[1]==='readwrite'){const st=tx.objectStore('clips'),put=st.put;st.put=function(...args){const r=put.apply(this,args);tx.abort();return r;};}return tx;};
    try { await assert.rejects(a.w.eval('saveClip(clips[0])')); }
    finally {db.constructor.prototype.transaction=original;db.close();}
  } finally {a.close();}
});


test("a recording that failed to persist exposes an immediate save warning", async () => {
  const a=await fixture();
  try {
    a.w.eval('clips[0]._unsaved=true; renderSitting(document.getElementById("app"))');
    assert.match(a.w.document.querySelector('.save-warning')?.textContent || '',/not saved/i);
  } finally {a.close();}
});
