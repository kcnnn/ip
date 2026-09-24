const assert = require('node:assert/strict');
const {chromium} = require('playwright');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try {
  const page=await browser.newPage();const base=process.env.TEST_BASE_URL || 'http://127.0.0.1:8000';
  await page.goto(`${base}/roof-overview.html`);
  const image=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=c.height=40;return c.toDataURL();});
  await page.evaluate(async image=>{displayPhotoPreview(image);await InspectionStore.flush();},image);
  assert.equal(await page.getByRole('button',{name:'Chimney is visible — add measurements',exact:true}).count(),0);
  const detected=await page.evaluate(async()=>{
   window.isAPIKeyConfigured=()=>true;window.getAPIKey=()=> 'test';window.getWorkspaceId=()=>'';
   window.sendAnthropicRequest=async()=>({ok:true,json:async()=>({content:[{type:'text',text:'```json\n{"chimneyVisible":true,"overallQuality":"good"}\n```'}]})});
   return (await analyzeOverviewWithChatGPT('data:image/png;base64,AA==',overviewPhotos[0])).chimneyVisible;
  });assert.equal(detected,true);
  await page.evaluate(()=>{aiAnalysis.style.display='block';displayAIResults({overallQuality:'good',confidence:80,roofCondition:'good',damageDetected:false,damageTypes:[],coverageQuality:'good',issues:[],recommendations:[],shouldRetake:false,valleyVisible:true,valleyType:'closed-cut',chimneyVisible:true});});
  assert.equal(await page.getByRole('button',{name:'Take valley / metal photo',exact:true}).count(),1);
  assert.equal(await page.getByRole('button',{name:'Take chimney measurement photo',exact:true}).count(),1);
  assert.equal(await page.getByRole('button',{name:/chimney/i}).count(),1);
  const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'Take chimney measurement photo',exact:true}).click();
  await (await chooser).setFiles({name:'measurement.png',mimeType:'image/png',buffer:Buffer.from(image.split(',')[1],'base64')});
  await page.waitForFunction(()=>Object.values(InspectionStore.get().photos).some(p=>p.parentPhotoId && p.storageStatus==='saved'));
  const record=await page.evaluate(()=>InspectionStore.get());const child=Object.values(record.photos).find(p=>p.parentPhotoId);
  assert.equal(child.section,'Accessories');assert.equal(record.photos[child.parentPhotoId].section,'Accessories');
  await page.goto(`${base}/inspection-review.html`);
  assert.equal(await page.locator('.review-chimney-group .review-photo').count(),2);
  assert.match(await page.locator('.review-chimney-group').evaluate(e=>e.closest('.review-section').querySelector('h2').textContent),/Accessories/);
  await page.goto(`${base}/roof-accessories.html`);
  await page.evaluate(image=>{selectAccessoryType('chimney');addNewAccessory();displayPhotoPreview(image);},image);
  assert.equal(await page.getByRole('button',{name:'Take chimney measurement photo',exact:true}).count(),1);
  console.log('PASS fenced detection, manual fallback, measurement upload, Accessories grouping and immediate accessory prompt');
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
