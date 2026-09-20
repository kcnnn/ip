const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try {
  const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8000/inspection-workspace.html');
  await page.locator('#equipmentIdentify').click();assert.match(await page.locator('#equipmentStatus').innerText(),/photo first/);
  const png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=200;c.height=100;return c.toDataURL().split(',')[1];});
  await page.locator('#fieldUploadInput').setInputFiles({name:'equipment.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});
  await page.waitForFunction(()=>document.getElementById('fieldPhotoStatus').textContent.startsWith('Photo ready'));
  await page.locator('[name=details]').fill('Equipment label at rear wall.');await page.locator('[name=location]').fill('Rear wall');
  await page.evaluate(()=>localStorage.setItem('claude_api_key','synthetic-key'));
  let research, mode='success';
  const response={stop_reason:'end_turn',content:[{type:'web_search_tool_result',content:[{type:'web_search_result',url:'https://manufacturer.example/manual',title:'Manufacturer ABC manual'}]},{type:'text',text:'ABC-123 is a split-system unit; the manufacturer manual lists R-410A.',citations:[{type:'web_search_result_location',url:'https://manufacturer.example/manual',title:'Manufacturer ABC manual'}]}]};
  await page.route('https://api.anthropic.com/**',route=>{
   const payload=route.request().postDataJSON();
   if(payload.tools){research=payload;return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(mode==='success'?response:{stop_reason:'end_turn',content:[{type:'text',text:'Unsupported claim without search.'}]})});}
   return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({content:[{type:'text',text:JSON.stringify({summary:'Equipment label',manufacturer:null,model:'ABC-123',serial:'PRIVATE-SERIAL',limitations:'Brand not visible.'})}]})});
  });
  await page.locator('#equipmentIdentify').click();await page.locator('#equipmentModel').waitFor({state:'visible'});
  assert.equal(await page.locator('#equipmentModel').inputValue(),'ABC-123');
  await page.locator('#equipmentSearch').click();await page.waitForFunction(()=>document.getElementById('equipmentStatus').textContent.startsWith('Sources found'));
  assert.equal(research.tools[0].type,'web_search_20250305');assert.equal(research.tools[0].max_uses,4);
  assert.doesNotMatch(JSON.stringify(research),/PRIVATE-SERIAL|Rear wall/);
  assert.equal(await page.evaluate(()=>Object.keys(InspectionStore.get().observations).length),0);
  await page.screenshot({path:'/tmp/apex-equipment-research-mobile.png',fullPage:true});
  const accept=page.getByRole('button',{name:'Add selected details to report'});
  await accept.click();assert.match(await page.locator('#equipmentStatus').innerText(),/Choose at least one/);
  await page.locator('[data-finding="0"]').check();await page.locator('#equipmentConfirm').check();await accept.click();
  await page.waitForFunction(()=>document.getElementById('equipmentStatus').textContent.startsWith('Accepted equipment'));
  const note=await page.evaluate(()=>Object.values(InspectionStore.get().observations)[0]);
  assert.equal(note.equipmentResearch.model,'ABC-123');assert.equal(note.condition,'');assert.equal(note.details,'Equipment label at rear wall.');
  await page.goto('http://127.0.0.1:8000/inspection-review.html');
  assert.match(await page.locator('#reviewContent').innerText(),/ACCEPTED EQUIPMENT RESEARCH/);
  assert.equal(await page.locator('#reviewContent a[href="https://manufacturer.example/manual"]').count(),1);
  const claim=await page.evaluate(()=>buildClaimNotes(InspectionStore.get(),InspectionField.sections,InspectionField.narrative));
  assert.match(claim,/Accepted equipment research/);assert.match(claim,/https:\/\/manufacturer.example\/manual/);
  await page.goto('http://127.0.0.1:8000/inspection-workspace.html');await page.evaluate(n=>InspectionField.editNote(n),note);
  await page.locator('#fieldNoteForm [type=submit]').click();
  assert.equal(await page.evaluate(()=>Object.values(InspectionStore.get().observations)[0].equipmentResearch.model),'ABC-123');
  await page.locator('#equipmentIdentify').click();await page.locator('#equipmentModel').waitFor({state:'visible'});
  mode='empty';await page.locator('#equipmentSearch').click();await page.waitForFunction(()=>document.getElementById('equipmentStatus').textContent.includes('no sources'));
  assert.equal(await page.getByRole('button',{name:'Add selected details to report'}).count(),0);
  const guards=await page.evaluate(async()=>{const m=await import('./equipment-research.js');let rejected=0;for(const data of [{stop_reason:'max_tokens'},{content:[{type:'web_search_tool_result',content:[{type:'web_search_result'}]},{type:'text',text:'Fake',citations:[{type:'web_search_result_location',url:'javascript:alert(1)'}]}]}]){try{m.parseResearch(data);}catch{rejected++;}}return [rejected,m.sourceURL('javascript:alert(1)'),m.sourceURL('https://user:pass@example.com')];});
  assert.deepEqual(guards,[2,null,null]);assert.deepEqual(errors,[]);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  console.log('PASS label reading, real search payload, citations, explicit acceptance, reports, reload, failure guards, mobile and privacy.');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
