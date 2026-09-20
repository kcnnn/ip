const assert=require('node:assert/strict');const {chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage();await page.goto('http://127.0.0.1:8000/roof-accessories.html');
 await page.evaluate(()=>{capturedPhotos=[{type:{name:'Vent'},photoData:'data:image/png;base64,test',analysis:{confidence:86}}];currentAccessoryIndex=0;window.isAPIKeyConfigured=()=>true;window.resizeImageForAPI=async p=>p;analyzeAccessoryWithChatGPT=async()=>{throw new Error('API Error: 401 - API key is invalid.');};});
 await page.evaluate(()=>analyzePhotoWithAI());
 let text=await page.locator('#aiResults').innerText();assert.match(text,/Not analyzed/);assert.match(text,/401/);assert.doesNotMatch(text,/Confidence:|86%|Photo Quality:|Using fallback|Issues Found/);
 assert.equal(await page.evaluate(()=>capturedPhotos[0].analysis),null);assert.ok(await page.evaluate(()=>capturedPhotos[0].photoData));
 assert.equal(await page.getByRole('link',{name:'Fix Claude API settings'}).getAttribute('href'),'api-setup.html');
 await page.evaluate(()=>proceedWithoutAPI());text=await page.locator('#aiResults').innerText();assert.match(text,/skipped/);assert.doesNotMatch(text,/Confidence:|Photo Quality:/);
 await page.evaluate(()=>displayAnalysisUnavailable('<img src=x onerror=alert(1)> sk-test-secret'));assert.equal(await page.locator('#aiResults img').count(),0);assert.doesNotMatch(await page.locator('#aiResults').innerText(),/sk-test-secret/);
 await page.reload();
 const invalid=await page.evaluate(async()=>{window.isAPIKeyConfigured=()=>true;window.sendAnthropicRequest=async()=>({ok:true,json:async()=>({content:[{type:'text',text:'No damage. Good photo.'}]})});try{await analyzeAccessoryWithChatGPT('data:image/png;base64,test',{name:'Vent'});return false;}catch{return true;}});assert.equal(invalid,true);
 assert.equal(await page.evaluate(()=>typeof simulateAccessoryAnalysis),'undefined');
 console.log('PASS 401/skip produce no simulated findings, photo retained, settings link, safe errors and malformed response rejection.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
