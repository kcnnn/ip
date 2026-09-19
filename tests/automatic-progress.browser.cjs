const assert = require('node:assert/strict');
const { chromium } = require('playwright');
(async () => {
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try {
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.goto('http://127.0.0.1:8000/inspection-workspace.html');
  assert.equal(await page.locator('[data-review-section]').count(),0);
  const status=()=>page.locator('.field-section-card').first().locator('.field-status').innerText();
  assert.equal(await status(),'Not started');
  await page.evaluate(()=>InspectionStore.sectionState('Elevations','Reviewed'));
  assert.equal(await status(),'Not started','Legacy manual status is ignored');
  await page.evaluate(()=>InspectionStore.note('fieldDraft',{section:'Elevations',details:'Unsaved'}));
  assert.equal(await status(),'Not started');
  await page.evaluate(()=>InspectionStore.saveObservation({section:'Elevations',details:'Saved note'}));
  assert.equal(await status(),'In progress');
  const cases=await page.evaluate(()=>{
   const progress=InspectionField.sectionProgress;
   return [progress({photos:{p:{section:'Elevations',storageStatus:'saved'}}},'Elevations'),progress({photos:{p:{section:'Elevations',storageStatus:'failed'}}},'Elevations'),progress({absences:{g:{section:'Roof edge'}}},'Roof edge'),progress({notes:{insuredInterview:{}}},'Interview')];
  });
  assert.deepEqual(cases,['In progress','Not started','In progress','In progress']);
  await page.reload(); assert.equal(await status(),'In progress');
  await page.goto('http://127.0.0.1:8000/inspection-review.html');
  assert.doesNotMatch(await page.locator('#reviewContent').innerText(),/Inspector review:|Not reviewed/);
  assert.match(await page.locator('#reviewContent').innerText(),/Documentation: In progress/);
  console.log('PASS automatic progress, legacy statuses ignored, no dropdown, draft exclusion, saved notes/photos/absences/interview and report.');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
