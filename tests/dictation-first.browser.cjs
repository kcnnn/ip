const assert = require('node:assert/strict');
const { chromium } = require('playwright');
(async () => {
    const browser = await chromium.launch({channel:'chrome',headless:true});
    try {
        const page = await browser.newPage({viewport:{width:390,height:844}});
        await page.addInitScript(() => {
            window.SpeechRecognition = class {
                constructor(){window.testSpeech=this;}
                start(){this.onstart?.();} stop(){this.onend?.();} abort(){this.onend?.();}
            };
        });
        await page.goto('http://127.0.0.1:8000/inspection-workspace.html');
        const errors = []; page.on('pageerror', e => errors.push(e.message));
        const transcript = 'Front elevation window screen. Moderate wear. Two screens affected.';
        const response = {multipleObservations:false,fields:{
            section:{value:'Elevations',evidence:'Front elevation'},location:{value:'Front elevation',evidence:'Front elevation'},
            component:{value:'Window screen',evidence:'window screen'},condition:{value:'Observed damage',evidence:'wear'},
            severity:{value:'Moderate',evidence:'Moderate'},damageTypes:{value:['Wear / deterioration'],evidence:'wear'},
            quantity:{value:'2',evidence:'Two screens'},unit:{value:'items',evidence:'Two screens'}
        }};
        await page.route('https://api.anthropic.com/**', route => route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({content:[{type:'text',text:JSON.stringify(response)}]})}));
        await page.evaluate(() => localStorage.setItem('claude_api_key','synthetic-test-key'));
        const dictation = await page.locator('#fieldDictate').boundingBox();
        const section = await page.locator('[name=section]').boundingBox();
        assert.ok(dictation.y < section.y);
        await page.locator('#fieldDictate').click();
        await page.evaluate(text => {const result=[{transcript:text}];result.isFinal=true;testSpeech.onresult({resultIndex:0,results:[result]});}, transcript);
        await page.locator('#fieldDictate').click();
        await page.waitForFunction(() => document.getElementById('fieldFillStatus').textContent.startsWith('Details filled'));
        assert.equal(await page.locator('[name=component]').inputValue(),'Window screen');
        assert.equal(await page.locator('[name=quantity]').inputValue(),'2');
        assert.equal(await page.locator('[name=severity]').inputValue(),'Moderate');
        assert.equal(await page.locator('[name=details]').inputValue(),transcript);
        assert.equal(await page.evaluate(() => Object.keys(InspectionStore.get().observations).length),0,'Auto-fill does not submit');
        await page.locator('#fieldNoteForm [type=submit]').click();
        assert.equal(await page.evaluate(() => Object.keys(InspectionStore.get().observations).length),1);
        // A late result must not overwrite an edit made while it was running.
        await page.evaluate(() => InspectionField.editNote({}));
        await page.locator('[name=details]').fill(transcript);
        await page.unroute('https://api.anthropic.com/**');
        let release;
        await page.route('https://api.anthropic.com/**', async route => {await new Promise(resolve=>{release=resolve;});await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({content:[{type:'text',text:JSON.stringify(response)}]})});});
        await page.locator('#fieldFill').click();
        await page.locator('[name=location]').fill('Inspector correction');
        while (!release) await new Promise(resolve=>setTimeout(resolve,10)); release();
        await page.waitForFunction(() => document.getElementById('fieldFillStatus').textContent.includes('changes were kept'));
        assert.equal(await page.locator('[name=location]').inputValue(),'Inspector correction');
        await page.evaluate(() => {InspectionField.editNote({});localStorage.removeItem('claude_api_key');});
        await page.locator('[name=details]').fill('Back gutter is five inches');
        await page.locator('#fieldFill').click();
        await page.waitForFunction(() => document.getElementById('fieldFillStatus').textContent.includes('AI setup is needed'));
        assert.equal(await page.locator('[name=details]').inputValue(),'Back gutter is five inches');
        assert.equal(await page.locator('#fieldNoteForm [type=submit]').isDisabled(),false);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),false);
        await page.locator('.field-dictation-first[aria-label="Dictate your observation"]').evaluate(element => element.scrollIntoView({block:'start'}));
        await page.screenshot({path:'/tmp/apex-dictation-first-mobile.png'});
        assert.deepEqual(errors,[]);
        console.log('PASS: dictation-first order, mocked auto-fill, review-before-save, transcript preservation, late-response protection, missing-key fallback and mobile width.');
    } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
