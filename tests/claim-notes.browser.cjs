const assert = require('node:assert/strict');
const {chromium} = require('playwright');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try {
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.goto('http://127.0.0.1:8000/inspection-review.html');
  await page.evaluate(()=>InspectionStore.saveObservation({section:'Elevations',location:'Front',component:'Window screen',condition:'Observed damage',severity:'Moderate',damageTypes:['Wear / deterioration'],details:'Two screens affected.'}));
  await page.locator('#claimNotesOpen').click();
  assert.match(await page.locator('#claimNotesText').inputValue(),/Two screens affected/);
  await page.locator('#claimNotesText').fill('Edited claim summary.');
  await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async value=>{window.copiedSummary=value;}}}));
  await page.locator('#claimNotesCopy').click();
  assert.equal(await page.evaluate(()=>window.copiedSummary),'Edited claim summary.');
  const downloadPromise=page.waitForEvent('download');await page.locator('#claimNotesDownload').click();const download=await downloadPromise;
  let contents='';for await(const chunk of await download.createReadStream()) contents+=chunk.toString();
  assert.equal(contents,'Edited claim summary.');assert.equal(download.suggestedFilename(),'inspection-claim-notes.txt');
  await page.evaluate(()=>InspectionStore.note('unrelated','change'));assert.equal(await page.locator('#claimNotesText').inputValue(),'Edited claim summary.');
  page.once('dialog',dialog=>dialog.dismiss());await page.locator('#claimNotesRefresh').click();assert.equal(await page.locator('#claimNotesText').inputValue(),'Edited claim summary.');
  await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw new Error('denied');}}}));
  await page.locator('#claimNotesCopy').click();assert.match(await page.locator('#claimNotesStatus').innerText(),/summary is selected/);
  await page.locator('#claimNotesSave').click();
  assert.match(await page.locator('#claimNotesStatus').innerText(),/saved on this device/);
  await page.reload();await page.locator('#claimNotesOpen').click();
  assert.equal(await page.locator('#claimNotesText').inputValue(),'Edited claim summary.');
  assert.equal(await page.locator('#claimNotesStale').isVisible(),false);
  page.once('dialog',dialog=>dialog.dismiss());await page.locator('#claimNotesFormat').selectOption('detailed');
  assert.equal(await page.locator('#claimNotesFormat').inputValue(),'concise');
  await page.evaluate(()=>InspectionStore.saveObservation({section:'Elevations',location:'Rear',details:'New recorded finding.'}));
  assert.equal(await page.locator('#claimNotesStale').isVisible(),true);
  assert.equal(await page.locator('#claimNotesText').inputValue(),'Edited claim summary.');
  page.once('dialog',dialog=>dialog.accept());await page.locator('#claimNotesRefresh').click();
  assert.match(await page.locator('#claimNotesText').inputValue(),/New recorded finding/);
  assert.equal(await page.locator('#claimNotesStale').isVisible(),false);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.emulateMedia({media:'print'});assert.equal(await page.locator('#claimNotesPanel').isVisible(),false);
  console.log('PASS: editable summary, exact copy/download, protected edits, clipboard fallback and PDF exclusion.');
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
