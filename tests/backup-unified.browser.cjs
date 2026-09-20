const assert=require('node:assert/strict');const {chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage({viewport:{width:390,height:844}});await page.goto('http://127.0.0.1:8000/inspection-review.html');
 await page.evaluate(async()=>{
  const c=document.createElement('canvas');c.width=120;c.height=100;
  await InspectionStore.recordPhoto('Elevations','Front Elevation',c.toDataURL(),{id:'photo-a'});
  await InspectionStore.recordPhoto('Elevations','Detail photo',c.toDataURL(),{id:'photo-b'});
  InspectionStore.saveObservation({id:'note-a',section:'Elevations',location:'Front',details:'Mechanical door dent',photoId:'photo-a',aiReview:{status:'needs_detail',summary:'Original AI review',checks:[]},equipmentResearch:{model:'TEST',findings:[{text:'Manufacturer specification',sources:[{title:'Manual',url:'https://example.com/manual'}]}]}});
  InspectionStore.saveObservation({id:'note-b',section:'Elevations',location:'Rear',details:'Unrelated note',photoId:'photo-b'});
 });
 const card=page.locator('.review-photo').filter({has:page.locator('[data-delete-id="photo-a"]')});
 assert.match(await card.innerText(),/Mechanical door dent/);assert.match(await card.innerText(),/Original AI review/);assert.match(await card.innerText(),/Manufacturer specification/);assert.doesNotMatch(await card.innerText(),/Unrelated note/);
 await card.screenshot({path:'/tmp/apex-unified-review-mobile.png'});
 await card.getByRole('button',{name:'Edit note',exact:true}).click();assert.equal(await page.locator('[name=details]').inputValue(),'Mechanical door dent');
 await page.evaluate(()=>InspectionStore.deleteReviewItem('photos','photo-b'));
 const original=await page.evaluate(()=>InspectionStore.getPhoto('photo-a'));
 const result=await page.evaluate(async()=>{
  const m=await import('./inspection-backup.js');window.testBackup=await m.createBackup();
  const before=JSON.stringify(InspectionStore.get()), corrupt=structuredClone(testBackup);Object.values(corrupt.assets)[0].sha256='invalid';
  let rejected=false;try{await m.restoreBackup(corrupt);}catch{rejected=true;}
  return {assetCount:Object.keys(testBackup.assets).length,rejected,unchanged:before===JSON.stringify(InspectionStore.get())};
 });assert.deepEqual(result,{assetCount:2,rejected:true,unchanged:true});
 await page.evaluate(async()=>{InspectionStore.startNew();InspectionStore.property({address:'Keep this current inspection'});const m=await import('./inspection-backup.js');await m.restoreBackup(testBackup);});
 assert.equal(await page.evaluate(()=>InspectionStore.getPhoto('photo-a')),original);
 assert.equal(await page.evaluate(()=>Object.keys(InspectionStore.get().observations).length),2);
 await page.reload();assert.match(await page.locator('#reviewContent').innerText(),/Mechanical door dent/);
 await page.evaluate(async()=>{const token=Object.keys(InspectionStore.get().deletedItems)[0];InspectionStore.restoreReviewItem(token);});assert.ok(await page.evaluate(()=>InspectionStore.getPhoto('photo-b')));
 await page.evaluate(()=>InspectionStore.undoRestore());assert.equal(await page.evaluate(()=>InspectionStore.get().property.address),'Keep this current inspection');
 const quota=await page.evaluate(async()=>{const m=await import('./inspection-backup.js'),bundle=await m.createBackup(),before=JSON.stringify(InspectionStore.get()),original=Storage.prototype.setItem;let rejected=false;Storage.prototype.setItem=function(key,value){if(key==='apex_inspection_record_v1')throw new DOMException('Full','QuotaExceededError');return original.call(this,key,value);};try{await m.restoreBackup(bundle);}catch{rejected=true;}finally{Storage.prototype.setItem=original;}return {rejected,unchanged:JSON.stringify(InspectionStore.get())===before};});assert.deepEqual(quota,{rejected:true,unchanged:true});
 const malformed=await page.evaluate(async()=>{const {validateBackup}=await import('./inspection-backup.js');let count=0;for(const b of [{record:{}},JSON.parse('{"format":"apex-inspection-backup","version":1,"record":{"__proto__":{}},"assets":{}}')]){try{validateBackup(b);}catch{count++;}}return count;});assert.equal(malformed,2);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 console.log('PASS unified source-linked cards, edit, full original backup, deleted-original recovery, hash failure isolation, reload, previous inspection recovery and mobile.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1);});
