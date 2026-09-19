const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try {
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.goto('http://127.0.0.1:8000/inspection-workspace.html');
  await page.getByText('Suggested next step · TypeSafe Jev',{exact:true}).click();
  await page.locator('[name=details]').fill('HVAC condenser has an unreadable label.');
  await page.locator('#jevAsk').click();assert.match(await page.locator('#jevStatus').innerText(),/access code/);
  await page.locator('#jevAccess').fill('synthetic-team-access-code');
  let body;
  await page.route('**/api/jev-next-step',route=>{body=route.request().postDataJSON();return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({message:'Photograph the equipment label.'})});});
  await page.locator('#jevAsk').click();
  await page.waitForFunction(()=>document.getElementById('jevStatus').textContent.includes('Jev suggestion'));
  assert.deepEqual(Object.keys(body).sort(),['component','note','photoReview','section']);
  assert.equal(await page.evaluate(()=>Object.keys(InspectionStore.get().observations).length),0);
  assert.ok(!await page.evaluate(()=>JSON.stringify(localStorage).includes('synthetic-team-access-code')));
  await page.unroute('**/api/jev-next-step');
  await page.route('**/api/jev-next-step',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Jev is not configured.'})}));
  await page.locator('#jevAsk').click();await page.waitForFunction(()=>document.getElementById('jevStatus').textContent.includes('not configured'));
  assert.equal(await page.locator('[name=details]').inputValue(),'HVAC condenser has an unreadable label.');
  assert.equal(await page.locator('#fieldNoteForm [type=submit]').isDisabled(),false);
  await page.unroute('**/api/jev-next-step');
  let release;
  await page.route('**/api/jev-next-step',async route=>{await new Promise(resolve=>{release=resolve;});await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({message:'Old suggestion'})});});
  await page.locator('#jevAsk').click();
  while(!release) await new Promise(resolve=>setTimeout(resolve,20));
  await page.locator('[name=details]').fill('Updated observation.');release();
  await page.waitForFunction(()=>document.getElementById('jevStatus').textContent.includes('observation changed'));
  assert.doesNotMatch(await page.locator('#jevStatus').innerText(),/Old suggestion/);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  console.log('PASS optional Jev UI, access gate, bounded data, no credential persistence, no autosave, failure isolation and mobile layout.');
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
