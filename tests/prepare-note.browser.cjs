const assert=require('node:assert/strict');const {chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage({viewport:{width:390,height:844}});await page.goto('http://127.0.0.1:8000/inspection-workspace.html');
 await page.waitForSelector('#fieldEquipmentResearch',{state:'attached'});
 assert.equal(await page.locator('#fieldEditDetails').getAttribute('open'),null);assert.equal(await page.locator('#fieldEquipmentResearch').isVisible(),false);
 await page.evaluate(()=>localStorage.setItem('claude_api_key','synthetic'));
 await page.locator('[name=details]').fill('Window screen has mechanical damage, not hail.');
 const answer={multipleObservations:false,fields:{component:{value:'Window screen',evidence:'Window screen'},condition:{value:'Observed damage',evidence:'damage'},damageTypes:{value:['Mechanical damage'],evidence:'mechanical damage'}}};
 await page.route('https://api.anthropic.com/**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({content:[{type:'text',text:JSON.stringify(answer)}]})}));
 await page.getByRole('button',{name:'Analyze & prepare note',exact:true}).click();await page.waitForFunction(()=>document.getElementById('fieldFillStatus').textContent.startsWith('Note prepared'));
 assert.match(await page.locator('#fieldNarrative').innerText(),/Mechanical damage/);assert.equal(await page.locator('#fieldMissingDetail').isVisible(),true);
 assert.equal(await page.evaluate(()=>Object.keys(InspectionStore.get().observations).length),0);
 await page.locator('#fieldAddLocation').click();await page.locator('[name=location]').fill('Rear elevation');
 await page.locator('#fieldNoteForm [type=submit]').click();assert.equal(await page.evaluate(()=>Object.keys(InspectionStore.get().observations).length),1);
 await page.locator('#fieldEditDetails summary').click();await page.locator('.field-note-panel').screenshot({path:'/tmp/apex-prepare-note-mobile.png'});
 await page.locator('[name=details]').fill('water heater label in garage');assert.equal(await page.locator('#fieldEquipmentResearch').isVisible(),true);assert.equal(await page.locator('#fieldEquipmentResearch').getAttribute('open'),null);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 console.log('PASS one prepare action, collapsed corrections, specific location prompt, explicit save, conditional equipment research and mobile.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1);});
