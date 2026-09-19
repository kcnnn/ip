const assert = require('node:assert/strict');
const { chromium } = require('playwright');
(async () => {
    const browser = await chromium.launch({channel:'chrome',headless:true});
    try {
        const page = await browser.newPage();
        await page.goto('http://127.0.0.1:8000/inspection-workspace.html');
        const result = await page.evaluate(async () => {
            const { preparePhoto } = await import('/photo-import.js');
            const canvas = document.createElement('canvas');
            canvas.width = 100; canvas.height = 100;
            const png = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
            // Valid PNG plus trailing padding tests file-size handling without
            // allocating a huge decoded image or committing private photos.
            const large = new File([png, new Uint8Array(25 * 1024 * 1024)], 'large.png', {type:'image/png'});
            const prepared = await preparePhoto(large);
            // A lightweight file-like object verifies the limit before any read.
            let oversized;
            try { await preparePhoto({size:101 * 1024 * 1024}); }
            catch (error) { oversized = error.message; }
            return {size:large.size, valid:prepared.dataUrl.startsWith('data:image/png;base64,'), oversized};
        });
        assert.ok(result.size > 20 * 1024 * 1024);
        assert.equal(result.valid, true);
        assert.match(result.oversized, /over 100 MB/);
        console.log('PASS: photo above 20 MB accepted; 100 MB safety limit enforced before reading.');
    } finally { await browser.close(); }
})().catch(error => {console.error(error);process.exit(1);});
