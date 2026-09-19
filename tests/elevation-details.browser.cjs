const assert = require('node:assert/strict');
const { chromium } = require('playwright');
(async () => {
 const browser = await chromium.launch({channel:'chrome',headless:true});
 try {
  const page = await browser.newPage({viewport:{width:390,height:844}});
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8000/elevation-photos.html');
  await page.evaluate(()=>localStorage.setItem('claude_api_key','synthetic-key'));
  const png = await page.evaluate(()=>{const c=document.createElement('canvas');c.width=200;c.height=200;return c.toDataURL().split(',')[1];});
  let fail=false;
  const answer={multipleObservations:false,fields:{component:{value:'Downspout',evidence:'downspout'},condition:{value:'Observed damage',evidence:'dent'},damageTypes:{value:['Dent / deformation'],evidence:'dent'}},photoReview:{status:'needs_detail',summary:'Closer detail would help assess the dent.',checks:[]}};
  await page.route('https://api.anthropic.com/**',route=>route.fulfill({status:fail?400:200,contentType:'application/json',body:JSON.stringify(fail?{error:{message:'Mock error'}}:{content:[{type:'text',text:JSON.stringify(answer)}]})}));
  for (let i=0;i<4;i++) {
   const key=['front','right','rear','left'][i];
   await page.evaluate(i=>{currentElevationIndex=i;updateElevationDisplay();aiAnalysis.style.display='block';displayAIResults({overallQuality:'good',confidence:80,issues:[],recommendations:[]});},i);
   await page.locator('#aiResults').getByRole('button',{name:/Add detail photos/}).click();
   assert.match(await page.locator('#fieldElevationContext').innerText(),new RegExp(key,'i'));
   for(let j=0;j<(i===0?2:1);j++) {
    if(j) await page.locator('#fieldAnotherDetail').click();
    await page.locator('#fieldUploadInput').setInputFiles({name:'detail.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});
    await page.waitForFunction(()=>document.getElementById('fieldPhotoStatus').textContent.startsWith('Photo ready'));
    await page.locator('[name=details]').fill('The downspout has a dent.');
    await page.locator('#fieldFill').click();
    await page.waitForFunction(()=>document.getElementById('fieldFillStatus').textContent.startsWith('Saved to'));
    assert.equal(await page.locator('[name=section]').inputValue(),'Elevations');
   }
   const counts=await page.evaluate(key=>({photos:Object.values(InspectionStore.get().photos).filter(p=>p.elevationKey===key).length,notes:Object.values(InspectionStore.get().observations).filter(n=>n.elevationKey===key).length}),key);
   assert.equal(counts.photos,i===0?2:1); assert.equal(counts.notes,counts.photos);
  }
  assert.equal(await page.evaluate(()=>Object.keys(InspectionStore.get().observations).length),5);
  fail=true;
  await page.locator('#fieldAnotherDetail').click();
  await page.locator('#fieldUploadInput').setInputFiles({name:'retry.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});
  await page.waitForFunction(()=>document.getElementById('fieldPhotoStatus').textContent.startsWith('Photo ready'));
  await page.locator('[name=details]').fill('The downspout has a dent.');
  await page.locator('#fieldFill').click();
  await page.waitForFunction(()=>document.getElementById('fieldFillStatus').textContent.includes('API 400'));
  assert.equal(await page.evaluate(()=>Object.keys(InspectionStore.get().observations).length),5);
  await page.reload();
  assert.match(await page.locator('#fieldElevationContext').textContent(),/Left Elevation/);
  assert.equal(await page.locator('[name=details]').inputValue(),'The downspout has a dent.');
  await page.evaluate(()=>{currentElevationIndex=0;updateElevationDisplay();});
  assert.equal(await page.locator('.elevation-detail-grid article').count(),2);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.locator('#elevationDetailPanel').screenshot({path:'/tmp/apex-elevation-details.png'});
  await page.goto('http://127.0.0.1:8000/inspection-review.html');
  const text=await page.locator('#reviewContent').innerText();
  assert.match(text,/front elevation/); assert.match(text,/rear elevation/); assert.match(text,/AI PHOTO REVIEW/);
  assert.deepEqual(errors,[]);
  console.log('PASS all four elevations, multiple close-ups, auto-save, distinct IDs, report, API failure draft, reload and mobile layout.');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
