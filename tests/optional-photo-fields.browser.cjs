const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try {
  const page=await browser.newPage();
  await page.goto('http://127.0.0.1:8000/elevation-photos.html');
  await page.evaluate(()=>{localStorage.setItem('claude_api_key','synthetic-key');InspectionField.startElevationDetail('front');});
  const png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=100;c.height=100;return c.toDataURL().split(',')[1];});
  await page.locator('#fieldUploadInput').setInputFiles({name:'reference.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});
  await page.waitForFunction(()=>document.getElementById('fieldPhotoStatus').textContent.startsWith('Photo ready'));
  await page.locator('[name=details]').fill('Reference photo for the file.');
  await page.route('https://api.anthropic.com/**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({content:[{type:'text',text:JSON.stringify({multipleObservations:false,fields:{component:null,condition:null},photoReview:{status:'unable_to_assess',summary:'Reference photo; no damage assessment made.',checks:[]}})}]})}));
  await page.locator('#fieldFill').click();
  await page.waitForFunction(()=>document.getElementById('fieldFillStatus').textContent.startsWith('Saved to'));
  const note=await page.evaluate(()=>Object.values(InspectionStore.get().observations)[0]);
  assert.equal(note.component,'');assert.equal(note.condition,'');assert.deepEqual(note.damageTypes,[]);
  assert.equal(await page.locator('[name=condition]').getAttribute('required'),null);
  assert.equal(await page.locator('[name=component]').getAttribute('required'),null);
  assert.doesNotMatch(await page.locator('#fieldNarrative').innerText(),/unspecified|Not inspected|No visible damage/i);
  await page.locator('#fieldNoteForm [type=submit]').click();
  assert.equal(await page.evaluate(()=>Object.keys(InspectionStore.get().observations).length),1,'Manual save updates, not duplicates');
  await page.goto('http://127.0.0.1:8000/inspection-review.html');
  assert.match(await page.locator('#reviewContent').innerText(),/Reference photo for the file/);
  assert.doesNotMatch(await page.locator('#reviewContent').innerText(),/Component unspecified|Observation unspecified/);
  console.log('PASS reference photo auto-save without component/condition, blank preserved, no invented assessment, clean report.');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
