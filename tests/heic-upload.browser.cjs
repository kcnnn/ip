const assert = require('node:assert/strict');
const { chromium } = require('playwright');
(async () => {
 const browser = await chromium.launch({channel:'chrome',headless:true});
 try {
  const page = await browser.newPage({viewport:{width:390,height:844}});
  const errors=[]; const external=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(/^https?:/.test(r.url()) && !r.url().startsWith('http://127.0.0.1:8000/')) external.push(r.url());});
  await page.goto('http://127.0.0.1:8000/inspection-workspace.html');
  await page.locator('[name=details]').fill('Rear elevation. Keep my dictated note.');
  const path = process.env.HEIC_TEST_FILE;
  assert.ok(path, 'Provide HEIC_TEST_FILE outside the repository; personal photos are never committed.');
  await page.locator('#fieldUploadInput').setInputFiles(path);
  await page.waitForFunction(()=>document.getElementById('fieldPhotoStatus').textContent.startsWith('Photo ready'),{},{timeout:90000});
  assert.equal(await page.locator('[name=details]').inputValue(),'Rear elevation. Keep my dictated note.');
  const stored=await page.evaluate(async()=>{
   const id=document.querySelector('[name=photoId]').value;
   const data=await InspectionStore.getPhoto(id);
   return {photo:InspectionStore.get().photos[id],prefix:data.slice(0,23), width:document.getElementById('fieldPhotoPreview').naturalWidth,height:document.getElementById('fieldPhotoPreview').naturalHeight};
  });
  assert.equal(stored.photo.convertedFrom,'HEIC/HEIF');
  assert.equal(stored.photo.storageStatus,'saved');
  assert.match(stored.prefix,/data:image\/jpeg;base64,/);
  assert.ok(stored.width>1000 && stored.height>1000);
  await page.locator('.field-photo-first').screenshot({path:'/tmp/apex-heic-upload.png'});
  const id=await page.locator('[name=photoId]').inputValue();
  // Corrupt files get an error without losing the selected photo or the note.
  await page.locator('#fieldUploadInput').setInputFiles({name:'broken.heic',mimeType:'image/heic',buffer:Buffer.from('broken')});
  await page.waitForFunction(()=>document.getElementById('fieldPhotoStatus').textContent.includes('not a supported image'));
  assert.equal(await page.locator('[name=photoId]').inputValue(),id);
  assert.equal(await page.locator('#fieldUpload').isDisabled(),false);
  // Valid PNGs with no browser MIME type are detected by signature.
  const data=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=100;c.height=100;return c.toDataURL().split(',')[1];});
  await page.locator('#fieldUploadInput').setInputFiles({name:'untyped.png',mimeType:'',buffer:Buffer.from(data,'base64')});
  await page.waitForFunction(()=>document.getElementById('fieldPhotoStatus').textContent.startsWith('Photo ready'));
  assert.notEqual(await page.locator('[name=photoId]').inputValue(),id);
  assert.equal(await page.locator('[name=details]').inputValue(),'Rear elevation. Keep my dictated note.');
  assert.deepEqual(errors,[]); assert.deepEqual(external,[]);
  console.log('PASS real HEIC import:',stored.width,'x',stored.height,'; local JPEG storage, no external requests, malformed-file recovery and empty-MIME PNG.');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
