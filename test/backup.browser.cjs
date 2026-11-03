// Run against local Wrangler dev; all stories/audio are synthetic test fixtures.
const { join } = require('node:path');
const { tmpdir } = require('node:os');
const { chromium }=require('playwright');const fs=require('fs');const assert=require('node:assert/strict');
(async()=>{
 const b=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE});
 const c=await b.newContext({acceptDownloads:true}),p=await c.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('http://localhost:8787');
 await p.evaluate(async()=>{await loadClips();S.step=7;S.name='Etim';S.me.name='Ada';S.elder.name='Papa';reseat();save();const blob=new Blob([new Uint8Array([0,255,1,42])],{type:'audio/webm'});const clip={id:'roundtrip',q:'Your first home?',at:Date.now(),dur:2,blob,text:'We lived by the river.',tx:'edited'};await idbDo('readwrite',st=>st.put(clip));await loadClips();render();});
 await p.getByRole('tab',{name:'Family',exact:true}).click();await p.locator('summary').filter({hasText:'Your information'}).click();
 const dl=p.waitForEvent('download');await p.getByRole('button',{name:'Download full backup'}).click();const download=await dl;await download.saveAs(join(tmpdir(), 'tma-roundtrip.json'));
 const json=JSON.parse(fs.readFileSync(join(tmpdir(), 'tma-roundtrip.json')));assert.equal(json.recordings[0].audio,'AP8BKg==');
 const fresh=await b.newContext();const q=await fresh.newPage();q.on('pageerror',e=>errors.push(e.message));await q.goto('http://localhost:8787');await q.getByRole('button',{name:'Restore backup',exact:true}).click();await q.locator('input[type=file]').setInputFiles(join(tmpdir(), 'tma-roundtrip.json'));await q.getByRole('button',{name:'Replace and restore'}).click();await q.getByRole('tab',{name:'Family',exact:true}).waitFor();
 assert.equal(await q.evaluate(()=>S.name),'Etim');assert.deepEqual(await q.evaluate(async()=>[...new Uint8Array(await clips[0].blob.arrayBuffer())]),[0,255,1,42]);
 await q.reload();await q.locator('.clips textarea').waitFor();assert.equal(await q.locator('.clips textarea').inputValue(),'We lived by the river.');
 assert.deepEqual(errors,[]);console.log('Real-browser backup download, fresh-device import, exact audio bytes, transcript and reload persistence passed.');await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
