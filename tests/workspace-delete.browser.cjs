const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try {
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.goto('http://127.0.0.1:8000/inspection-workspace.html');
  await page.evaluate(async()=>{const c=document.createElement('canvas');c.width=100;c.height=100;await InspectionStore.recordPhoto('Elevations','Front Elevation',c.toDataURL(),{id:'test-photo'});InspectionStore.saveObservation({id:'test-note',section:'Elevations',location:'Garage',details:'Water heater rating plate',photoId:'test-photo'});});
  const button=()=>page.locator('[data-delete-note="test-note"]');
  page.once('dialog',d=>d.dismiss());await button().click();assert.equal(await button().count(),1);
  await page.locator('[data-edit-note="test-note"]').click();
  page.once('dialog',d=>d.accept());await button().click();assert.equal(await button().count(),0);
  assert.equal(await page.locator('[name=id]').inputValue(),'');
  assert.ok(await page.evaluate(()=>InspectionStore.get().photos['test-photo']));
  await page.reload();await page.locator('.field-deleted-notes summary').click();await page.getByRole('button',{name:'Restore observation',exact:true}).click();assert.equal(await button().count(),1);
  assert.match(await page.locator('#fieldSavedNotes').innerText(),/Water heater rating plate/);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  console.log('PASS saved-list delete/cancel, editing draft cleared, linked photo kept, restore after reload, mobile.');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
