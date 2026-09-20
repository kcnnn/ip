const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try {
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.goto('http://127.0.0.1:8000/inspection-workspace.html');
  await page.waitForFunction(()=>!!InspectionField.splitDictation);
  const cards=await page.locator('.field-section-card h2').allTextContents();
  assert.ok(cards.findIndex(s=>s.includes('Miscellaneous'))===cards.findIndex(s=>s.includes('Interview'))-1);
  await page.locator('[name=details]').fill('Front window screen is worn. Rear door has mechanical damage, not hail.');
  await page.evaluate(()=>{ObservationExtraction.extract=async(t,c,s,p,m)=>{
   if(!m||p)throw new Error('Expected text-only multi mode');
   return {observations:[{location:'Front elevation',section:'Elevations',component:'Window screen',condition:'Observed damage',damageTypes:['Wear / deterioration'],details:'Front window screen is worn.'},{location:'Rear elevation',section:'Elevations',component:'Door',condition:'Observed damage',damageTypes:['Mechanical damage'],details:'Rear door has mechanical damage, not hail.'}]};
  };});
  await page.locator('#fieldMultiMode').check();await page.locator('#fieldFill').click();
  await page.waitForFunction(()=>document.querySelector('#fieldMultiQueue')?.textContent.includes('0 of 2'));
  assert.equal(await page.evaluate(()=>Object.keys(InspectionStore.get().observations).length),0);
  assert.equal(await page.locator('[name=photoId]').inputValue(),'');
  await page.locator('[name=details]').fill('Front window screen is worn. Inspector reviewed.');
  await page.locator('[data-multi-index="1"]').click();
  assert.match(await page.locator('[name=details]').inputValue(),/not hail/);
  await page.locator('#fieldNoteForm [type=submit]').click();
  assert.equal(await page.evaluate(()=>Object.keys(InspectionStore.get().observations).length),1);
  await page.reload();await page.waitForFunction(()=>!!InspectionField.splitDictation);
  assert.match(await page.locator('#fieldMultiQueue').innerText(),/1 of 2/);
  await page.locator('[data-multi-index="0"]').click();
  assert.match(await page.locator('[name=details]').inputValue(),/Inspector reviewed/);
  await page.locator('#fieldNoteForm [type=submit]').click();
  await page.locator('#fieldNoteForm [type=submit]').click();
  assert.equal(await page.evaluate(()=>Object.keys(InspectionStore.get().observations).length),2);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.goto('http://127.0.0.1:8000/miscellaneous.html');
  await page.locator('#miscAdd').click();
  assert.equal(await page.locator('[name=section]').inputValue(),'Miscellaneous');
  await page.locator('[name=details]').fill('General reference photo.');
  await page.locator('#fieldEditDetails').evaluate(e=>e.open=true);
  await page.locator('[name=location]').fill('Property entrance');
  await page.locator('#fieldNoteForm [type=submit]').click();
  assert.match(await page.locator('#miscItems').innerText(),/General reference photo/);
  await page.goto('http://127.0.0.1:8000/inspection-review.html');
  assert.match(await page.locator('#reviewContent').innerText(),/Miscellaneous/);
  console.log('PASS multi-note preparation, independent edit/save, reload recovery, no duplicates, mobile and miscellaneous navigation/report.');
 } finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
