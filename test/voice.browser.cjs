// Run against local Wrangler dev; all stories/audio are synthetic test fixtures.
const { join } = require('node:path');
const { tmpdir } = require('node:os');
const { chromium }=require('playwright');const assert=require('node:assert/strict');
(async()=>{
 const b=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream']});
 const c=await b.newContext({permissions:['microphone']}),d=await b.newContext({permissions:['microphone']});const p=await c.newPage(),q=await d.newPage();const errors=[];for(const page of [p,q])page.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://localhost:8787');await p.evaluate(async()=>{await loadClips();S.step=7;S.name='Etim';S.me.name='Ada';S.elder.name='Papa';reseat();save();render();});
 await p.getByRole('tab',{name:'Play',exact:true}).click();await p.getByRole('button',{name:'Create a room'}).click();await p.locator('.rcode b').waitFor();const code=await p.locator('.rcode b').innerText();
 await q.goto('http://localhost:8787/?room='+code);await q.getByRole('textbox',{name:'Your name',exact:true}).fill('Papa');await q.getByRole('button',{name:'Join the room'}).click();
 await p.getByRole('button',{name:'Start a voice call'}).click();await q.getByRole('button',{name:'Join',exact:true}).click();await p.getByRole('heading',{name:'On the call'}).waitFor();
 async function accept(page){const dlg=page.getByRole('dialog',{name:'Recording permission',exact:true});await dlg.waitFor();await dlg.getByRole('checkbox').check();await dlg.getByRole('button',{name:'Allow recording'}).click();}
 await p.getByRole('button',{name:'Record the answer'}).click();await accept(p);await q.getByRole('dialog',{name:'Recording permission'}).getByRole('button',{name:'Not now'}).click();
 await p.getByText("Recording wasn't allowed. You can keep talking.",{exact:true}).waitFor();assert.equal(await p.evaluate(()=>clips.length),0);
 await p.getByRole('button',{name:'Record the answer'}).click();await accept(p);await accept(q);await q.getByRole('button',{name:'Stop recording',exact:true}).waitFor();
 await p.waitForTimeout(1200);await p.getByRole('button',{name:'Hang up',exact:true}).click();await p.waitForFunction(()=>clips.length===1&&!activeVoiceRecording);
 assert.ok(await p.evaluate(()=>clips[0].blob.size>0));assert.equal(await p.evaluate(()=>clips[0].recordingConsent.method),'remote');
 await p.getByRole('tab',{name:'Sit',exact:true}).click();await p.locator('.clips audio').waitFor();await p.reload();await p.locator('.clips audio').waitFor();assert.equal(await p.evaluate(()=>clips.length),1);
 assert.deepEqual(errors,[]);console.log('Two-browser WebRTC: refusal prevents recording, peer consent required, both see recording state, hangup saves audio, reload retains it.');await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
