const assert = require('node:assert/strict');
const { chromium } = require('playwright');
(async () => {
    const browser = await chromium.launch({channel:'chrome',headless:true});
    try {
        const page = await browser.newPage({viewport:{width:390,height:844}});
        await page.goto('http://127.0.0.1:8000/index.html');
        await page.evaluate(() => {InspectionStore.property({address:'Test address'});InspectionStore.note('fieldDraft',{details:'Keep my draft'});localStorage.setItem('claude_api_key','synthetic-test-key');});
        const before = await page.evaluate(() => InspectionStore.get().id);
        await page.locator('.home-intro .home-primary').click();
        assert.equal(await page.locator('#workspaceChoice').isVisible(),true);
        await page.locator('#workspaceCancel').click();
        assert.equal(await page.evaluate(() => InspectionStore.get().id),before);
        await page.locator('.home-intro .home-primary').click();
        await page.locator('#workspaceContinue').click();
        await page.waitForURL('**/inspection-workspace.html');
        assert.equal(await page.evaluate(() => InspectionStore.get().notes.fieldDraft.details),'Keep my draft');
        await page.goto('http://127.0.0.1:8000/index.html');
        await page.locator('.home-intro .home-primary').click();
        page.once('dialog', dialog=>dialog.dismiss());
        await page.locator('#workspaceNew').click();
        assert.equal(await page.evaluate(() => InspectionStore.get().id),before);
        page.once('dialog', dialog=>dialog.accept());
        await page.locator('#workspaceNew').click();
        await page.waitForURL('**/inspection-workspace.html');
        assert.notEqual(await page.evaluate(() => InspectionStore.get().id),before);
        assert.deepEqual(await page.evaluate(() => InspectionStore.get().notes),{});
        assert.equal(await page.evaluate(() => localStorage.getItem('claude_api_key')),'synthetic-test-key');
        console.log('PASS: chooser opens, cancel preserves data, continue resumes, new requires confirmation, reset leaves API configuration intact.');
    } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
