const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try {
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.goto('http://127.0.0.1:8000/inspection-review.html');
  await page.evaluate(async()=>{
   const c=document.createElement('canvas');c.width=100;c.height=100;
   await InspectionStore.recordPhoto('Elevations','Front Elevation',c.toDataURL(),{id:'test-photo'});
   InspectionStore.saveObservation({id:'test-note',section:'Elevations',location:'Front wall',details:'Mechanical dent at door',photoId:'test-photo',aiReview:{status:'needs_detail',summary:'Test AI finding',checks:[]}});
   InspectionStore.note('fieldDraft',{id:'test-note',section:'Elevations',details:'Draft of saved note'});
  });
  const delPhoto=()=>page.locator('[data-delete-id="test-photo"]');
  page.once('dialog',d=>d.dismiss());await delPhoto().click();assert.equal(await delPhoto().count(),1);
  page.once('dialog',d=>d.accept());await delPhoto().click();
  assert.equal(await delPhoto().count(),0);assert.equal(await page.locator('[data-delete-id="test-note"]').count(),1);
  assert.match(await page.locator('#reviewContent').innerText(),/No longer in record/);
  await page.reload();await page.locator('.review-trash summary').click();await page.getByRole('button',{name:'Restore photo',exact:true}).click();
  assert.equal(await delPhoto().count(),1);assert.ok(await page.evaluate(()=>InspectionStore.getPhoto('test-photo')));
  page.once('dialog',d=>d.accept());await page.locator('[data-delete-id="test-note"]').click();
  assert.equal(await page.locator('[data-delete-id="test-note"]').count(),0);assert.equal(await delPhoto().count(),1);
  assert.equal(await page.evaluate(()=>InspectionStore.get().notes.fieldDraft?.id),undefined);
  const claim=await page.evaluate(()=>buildClaimNotes(InspectionStore.get(),InspectionField.sections,InspectionField.narrative));
  assert.doesNotMatch(claim,/Mechanical dent|Test AI finding/);
  await page.locator('.review-trash summary').click();await page.getByRole('button',{name:'Restore observation',exact:true}).click();
  assert.equal(await page.locator('[data-delete-id="test-note"]').count(),1);
  assert.match(await page.locator('#reviewContent').innerText(),/Test AI finding/);
  await page.evaluate(()=>{const t=InspectionStore.deleteReviewItem('photos','test-photo');const record=InspectionStore.get();record.photos['test-photo']={label:'New photo',section:'Elevations'};localStorage.setItem('apex_inspection_record_v1',JSON.stringify(record));window.testToken=t;});
  const message=await page.evaluate(()=>{try{InspectionStore.restoreReviewItem(window.testToken);}catch(e){return e.message;}});assert.match(message,/not overwritten/);
  await page.emulateMedia({media:'print'});assert.equal(await page.locator('[data-delete-id="test-note"]').isVisible(),false);
  await page.emulateMedia({media:'screen'});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  console.log('PASS delete confirmation/cancel, independent photo and note removal, reload undo, original retained, claim notes exclusion, restore conflicts, print and mobile.');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
