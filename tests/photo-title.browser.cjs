const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try {
  const page=await browser.newPage();await page.goto('http://127.0.0.1:8000/inspection-workspace.html');
  await page.evaluate(()=>{InspectionField.startElevationDetail('front');localStorage.setItem('claude_api_key','synthetic');});
  const png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=100;c.height=100;return c.toDataURL().split(',')[1];});
  await page.locator('#fieldUploadInput').setInputFiles({name:'IMG_1198.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});
  await page.waitForFunction(()=>document.getElementById('fieldPhotoStatus').textContent.startsWith('Photo ready'));
  await page.locator('[name=details]').fill('  This is the hvac serial number label.  ');
  await page.route('https://api.anthropic.com/**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({content:[{type:'text',text:JSON.stringify({multipleObservations:false,fields:{photoTitle:{value:'HVAC serial number label',evidence:'hvac serial number label'}},photoReview:{status:'unable_to_assess',summary:'Synthetic test image',checks:[]}})}]})}));
  await page.locator('#fieldFill').click();await page.waitForFunction(()=>document.getElementById('fieldFillStatus').textContent.startsWith('Saved to'));
  const saved=await page.evaluate(()=>({photo:Object.values(InspectionStore.get().photos)[0],note:Object.values(InspectionStore.get().observations)[0]}));
  assert.equal(saved.photo.label,'Front Elevation · HVAC serial number label');assert.equal(saved.photo.sourceName,'IMG_1198.png');
  await page.goto('http://127.0.0.1:8000/inspection-review.html');
  assert.equal(await page.locator('.review-photo h3').innerText(),'Front Elevation · HVAC serial number label');
  await page.goto('http://127.0.0.1:8000/inspection-workspace.html');await page.evaluate(note=>InspectionField.editNote(note),saved.note);
  await page.locator('[name=details]').fill('Downspout attachment detail');await page.locator('#fieldNoteForm [type=submit]').click();
  assert.equal(await page.evaluate(()=>Object.values(InspectionStore.get().photos)[0].label),'Front Elevation · Downspout attachment detail');
  assert.equal(await page.evaluate(()=>Object.values(InspectionStore.get().photos)[0].originalKey),saved.photo.originalKey);
  console.log('PASS AI dictation title, whitespace, report/reload, source filename retained, changed note invalidation and original photo preserved.');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
