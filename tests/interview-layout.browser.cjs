const assert=require('node:assert/strict');const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch({channel:'chrome',headless:true});try{
 const p=await b.newPage();await p.goto('http://127.0.0.1:8000/insured-interview.html');
 assert.ok(await p.locator('#satelliteSection').isVisible());
 await p.getByText('Unknown / not confirmed',{exact:true}).click();await p.reload();assert.ok(await p.locator('#satelliteUnknown').isChecked());
 await p.getByText('No satellite dish',{exact:true}).click();await p.reload();assert.ok(await p.locator('#satelliteAbsent').isChecked());
 assert.equal(await p.evaluate(()=>hasSatelliteDish),false);
 for(const width of [1280,390]){await p.setViewportSize({width,height:844});
 const box=await p.locator('.page-title').boundingBox();const header=await p.locator('.header').boundingBox();assert.ok(Math.abs(box.x+box.width/2-header.x-header.width/2)<2);
 assert.equal(await p.locator('.safety-content p').evaluate(e=>getComputedStyle(e).color),'rgb(75, 52, 23)');
 }
 console.log('PASS interview alignment, contrast, satellite visibility and restored answers');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exit(1);});
