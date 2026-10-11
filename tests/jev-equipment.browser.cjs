// Full HTTP integration through the real JS bridge and Python worker. Agent is
// a deterministic fixture; browser_smoke.py separately checks official Agent/Chrome.
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const http=require('node:http');
const fs=require('node:fs/promises');
const path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
(async()=>{
 const worker=spawn(process.env.JEV_TEST_PYTHON || 'python3',['worker/tests/fixture_server.py'],{cwd:root,env:{...process.env,PYTHONPATH:path.join(root,'worker')},stdio:['ignore','pipe','inherit']});
 let server,browser;
 try {
  const port=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Fixture worker did not start')),10000);worker.once('exit',code=>{clearTimeout(timer);reject(new Error(`Fixture exited ${code}`));});worker.stdout.once('data',data=>{clearTimeout(timer);resolve(Number(data.toString().trim()));});});
  process.env.APEX_JEV_ACCESS_TOKEN='fixture-access-'+'a'.repeat(32);process.env.JEV_WORKER_TOKEN='fixture-service-'+'s'.repeat(32);process.env.JEV_WORKER_URL=`http://127.0.0.1:${port}/v1/equipment`;process.env.NODE_ENV='test';
  const handler=require('../api/jev-equipment');
  server=http.createServer(async(req,res)=>{
   if(req.url==='/api/jev-equipment'){
    let body='';for await(const part of req) body+=part;req.body=JSON.parse(body);
    res.status=n=>{res.statusCode=n;return res;};res.json=data=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(data));return res;};
    return handler(req,res);
   }
   const pathname=new URL(req.url,'http://localhost').pathname;
   const file=path.resolve(root,'.'+pathname);
   if(!file.startsWith(root+path.sep) || !/\.(html|js|css|json|svg|png)$/.test(file)) {res.writeHead(404);return res.end();}
   try {const data=await fs.readFile(file);res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/octet-stream');res.end(data);}catch{res.writeHead(404);res.end();}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}`;
  browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:390,height:844}});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(base+'/inspection-workspace.html');
  await page.locator('[name=details]').fill('Equipment label at rear wall.');
  await page.locator('#fieldEquipmentResearch summary').click();
  const png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=200;c.height=100;return c.toDataURL().split(',')[1];});
  await page.locator('#fieldUploadInput').setInputFiles({name:'equipment.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});
  await page.waitForFunction(()=>document.getElementById('fieldPhotoStatus').textContent.startsWith('Photo ready'));
  await page.locator('[name=details]').fill('Equipment label at rear wall.');
  await page.locator('#fieldEditDetails summary').click();await page.locator('[name=location]').fill('Rear wall');
  await page.evaluate(()=>localStorage.setItem('claude_api_key','fixture-photo-key'));
  await page.route('https://api.anthropic.com/**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({content:[{type:'text',text:JSON.stringify({summary:'Equipment label',manufacturer:'Rheem',model:'ABC-123',serial:'PRIVATE-SERIAL',limitations:''})}]})}));
  await page.locator('#equipmentIdentify').click();await page.locator('#equipmentModel').waitFor({state:'visible'});
  assert.equal(await page.locator('#equipmentProvider').inputValue(),'claude');
  await page.locator('#equipmentProvider').selectOption('jev');await page.locator('#equipmentSearch').click();
  assert.match(await page.locator('#equipmentStatus').innerText(),/Confirm the manufacturer/);
  await page.locator('#equipmentIdentityConfirmed').check();await page.locator('#equipmentBrowserAccess').fill('wrong-code');
  await page.locator('#equipmentSearch').click();await page.waitForFunction(()=>document.getElementById('equipmentStatus').textContent.includes('Enter your APEX'));
  await page.locator('#equipmentBrowserAccess').fill(process.env.APEX_JEV_ACCESS_TOKEN);
  const requestPromise=page.waitForRequest(r=>r.url().endsWith('/api/jev-equipment'));
  await page.locator('#equipmentSearch').click();const request=await requestPromise;
  assert.deepEqual(request.postDataJSON(),{manufacturer:'Rheem',model:'ABC-123',confirmed:true});
  await page.waitForFunction(()=>document.getElementById('equipmentStatus').textContent.startsWith('Sources found'));
  assert.equal(await page.evaluate(()=>Object.keys(InspectionStore.get().observations).length),0);
  const save=page.getByRole('button',{name:'Add selected details to report'});await save.click();assert.match(await page.locator('#equipmentStatus').innerText(),/Choose at least one/);
  await page.locator('[data-finding="0"]').check();await page.locator('#equipmentConfirm').check();await save.click();
  await page.waitForFunction(()=>document.getElementById('equipmentStatus').textContent.startsWith('Accepted equipment'));
  const note=await page.evaluate(()=>Object.values(InspectionStore.get().observations)[0]);
  assert.equal(note.equipmentResearch.provider,'Jev Ultrafast');assert.match(note.equipmentResearch.findings[0].text,/50 gallons/);assert.equal(note.condition,'');
  assert.doesNotMatch(await page.evaluate(()=>JSON.stringify(localStorage)+JSON.stringify(sessionStorage)),/fixture-access|fixture-service/);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.locator('#equipmentModel').fill('ABC-123A');assert.equal(await page.locator('#equipmentIdentityConfirmed').isChecked(),false);assert.equal(await page.locator('[data-finding]').count(),0);
  await page.goto(base+'/inspection-review.html');assert.match(await page.locator('#reviewContent').innerText(),/50 gallons/);
  assert.equal(await page.locator('#reviewContent a[href="https://www.rheem.com/product"]').count(),1);
  const claim=await page.evaluate(()=>buildClaimNotes(InspectionStore.get(),InspectionField.sections,InspectionField.narrative));assert.match(claim,/https:\/\/www.rheem.com\/product/);
  await page.reload();assert.match(await page.locator('#reviewContent').innerText(),/50 gallons/);
  assert.deepEqual(errors,[]);
  console.log('PASS UI → authenticated JS bridge → Python HTTP worker → fixture Agent evidence → inspector approval → report and reload. No live model calls.');
 } finally {await browser?.close();if(server) await new Promise(resolve=>server.close(resolve));worker.kill();}
})().catch(error=>{console.error(error);process.exitCode=1;});
