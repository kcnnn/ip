const assert = require('node:assert/strict');
const { chromium } = require('playwright');
(async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    try {
        const page = await browser.newPage();
        await page.goto('http://127.0.0.1:8000/roof-edge.html');
        await page.waitForFunction(() => !document.getElementById('captureBtn').disabled);
        await page.evaluate(async () => {
            const canvas = document.createElement('canvas'); canvas.width = 20; canvas.height = 20;
            await InspectionStore.recordPhoto('Roof edge', 'Gutter Measurement', canvas.toDataURL());
            InspectionStore.note('fieldDraft', { details: 'Keep this unrelated draft' });
            displayAIResults({ overallQuality: 'needs_improvement', confidence:55, measurementReadable:false, gutterSize:null, issues:[], recommendations:[] });
        });
        // Reveal the result without making any live AI request.
        await page.evaluate(() => { document.getElementById('aiAnalysis').style.display = 'block'; });
        await page.locator('#gutterConfirmation [name=size]').fill('5');
        await page.locator('#gutterConfirmation [name=verified]').check();
        await page.locator('#gutterConfirmation [type=submit]').click();
        await page.waitForFunction(() => document.getElementById('gutterConfirmationStatus').textContent.startsWith('Saved:'));
        const record = await page.evaluate(() => InspectionStore.get());
        assert.equal(Object.values(record.observations)[0].quantity, '5');
        assert.match(Object.values(record.observations)[0].details, /not an AI finding/);
        assert.equal(record.notes.fieldDraft.details, 'Keep this unrelated draft');
        assert.match(await page.locator('.measurement-analysis').innerText(), /Measurement Readable: No/);
        await page.locator('#gutterConfirmation [type=submit]').click();
        assert.equal(await page.evaluate(() => Object.keys(InspectionStore.get().observations).length), 1);
        await page.goto('http://127.0.0.1:8000/inspection-review.html');
        assert.match(await page.locator('#reviewContent').innerText(), /Inspector-confirmed gutter size: 5 inches/);
        console.log('PASS: inspector measurement is saved, distinct from AI, preserves draft, avoids duplicate notes and appears in review.');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
