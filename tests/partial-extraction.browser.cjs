const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try {
  const page=await browser.newPage();await page.goto('http://127.0.0.1:8000/inspection-workspace.html');
  await page.evaluate(()=>localStorage.setItem('claude_api_key','synthetic'));
  const png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=100;c.height=100;return c.toDataURL().split(',')[1];});
  await page.locator('#fieldUploadInput').setInputFiles({name:'waterheater.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});
  await page.waitForFunction(()=>document.getElementById('fieldPhotoStatus').textContent.startsWith('Photo ready'));
  await page.locator('[name=details]').fill('water heater rating plate in garage');
  const f=(value,evidence)=>({value,evidence});
  await page.route('https://api.anthropic.com/**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({content:[{type:'text',text:JSON.stringify({multipleObservations:false,fields:{location:f('Garage','garage'),component:f('Water heater','water heater'),photoTitle:f('Water heater rating plate','water heater rating plate'),condition:f('No visible damage','no visible damage')},photoReview:{status:'needs_detail',summary:'Rating plate documented. Test reading.',checks:[]}})}]})}));
  await page.locator('#fieldFill').click();await page.waitForFunction(()=>document.getElementById('fieldFillStatus').textContent.startsWith('Details filled'));
  assert.match(await page.locator('#fieldFillStatus').innerText(),/left blank/);
  assert.equal(await page.locator('[name=location]').inputValue(),'Garage');assert.equal(await page.locator('[name=condition]').inputValue(),'');
  assert.match(await page.locator('#fieldPhotoReview').innerText(),/Rating plate documented/);
  await page.locator('#fieldNoteForm [type=submit]').click();
  const note=await page.evaluate(()=>Object.values(InspectionStore.get().observations)[0]);
  assert.equal(note.details,'water heater rating plate in garage');assert.equal(note.condition,'');assert.ok(note.aiReview);
  assert.equal(await page.evaluate(()=>Object.values(InspectionStore.get().photos)[0].label),'Water heater rating plate');
  console.log('PASS unsupported suggestions omitted, valid location/title and photo review kept, original note saved without invented condition.');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
