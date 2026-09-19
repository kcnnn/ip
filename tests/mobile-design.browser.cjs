const assert = require('node:assert/strict');
const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    try {
        const page = await browser.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        for (const width of [320, 390, 768, 1440]) {
            await page.setViewportSize({ width, height: 900 });
            await page.goto('http://127.0.0.1:8000/index.html');
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
            const primary = await page.locator('.home-intro .home-primary').boundingBox();
            const secondary = await page.locator('.home-intro .home-secondary').boundingBox();
            assert.ok(primary.height >= 44 && secondary.height >= 44);
            if (width <= 640) {
                assert.equal(primary.width, secondary.width);
                assert.ok(secondary.y >= primary.y + primary.height + 8);
            }
            assert.equal(await page.locator('.home-intro .home-primary').getAttribute('href'), 'inspection-workspace.html');
            await page.screenshot({ path: `/tmp/apex-home-${width}.png`, fullPage: width >= 768 });
        }
        await page.setViewportSize({ width: 390, height: 900 });
        await page.goto('http://127.0.0.1:8000/inspection-workspace.html');
        assert.equal(await page.locator('.field-card-details:not([open])').count(), 7);
        await page.screenshot({ path: '/tmp/apex-workspace-polished-mobile.png' });
        await page.locator('.field-card-details summary').first().click();
        assert.equal(await page.locator('.field-card-details[open]').count(), 1);
        await page.locator('[data-review-section="Elevations"]').selectOption('In progress');
        assert.equal(await page.locator('.field-card-details[open]').count(), 1, 'Expansion survives saving');
        await page.locator('.field-card-details a').filter({ hasText: 'Rear Elevation' }).click();
        await page.waitForFunction(() => document.querySelector('#elevationTitle')?.textContent === 'Rear Elevation');
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        assert.deepEqual(errors, []);
        console.log('PASS: home at 320/390/768/1440px, equal mobile buttons, touch targets, mobile accordions, preserved expansion and step navigation.');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
