/* Run with a local server on :8000 and Playwright available in NODE_PATH.
   Uses a fresh browser context, synthetic images and mocked dictation; no AI calls. */
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    try {
        const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
        await context.route('**/*', route => route.request().url().startsWith('http://127.0.0.1:8000/') ? route.continue() : route.abort());
        await context.addInitScript(() => {
            class SpeechMock {
                constructor() { window.testSpeech = this; }
                start() { this.onstart?.(); }
                stop() { this.onend?.(); }
                abort() { this.onend?.(); }
            }
            window.SpeechRecognition = SpeechMock;
        });
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        const go = file => page.goto(`http://127.0.0.1:8000/${file}`);
        await go('inspection-workspace.html');
        assert.equal(await page.locator('.field-section-card').count(), 7);
        const componentOptions = () => page.locator('#fieldNoteForm [name=component] option').allTextContents();
        const wallOptions = await componentOptions();
        for (const component of ['Siding', 'Window', 'Window screen', 'Door', 'Overhead door', 'Downspout']) assert.ok(wallOptions.includes(component));
        assert.ok(!wallOptions.includes('Shingles'));
        await page.locator('#fieldNoteForm [name=component]').selectOption('Window screen');
        await page.locator('#fieldNoteForm [name=section]').selectOption('Roof overview');
        assert.equal(await page.locator('#fieldNoteForm [name=component]').inputValue(), '', 'Changing section clears an incompatible component');
        assert.ok((await componentOptions()).includes('Shingles'));
        await page.evaluate(() => InspectionField.editNote({ section: 'Elevations', component: 'Shingles', location: 'Legacy note', condition: 'Not inspected' }));
        assert.equal(await page.locator('#fieldNoteForm [name=component]').inputValue(), 'Shingles', 'Legacy notes are not silently changed');
        assert.ok((await componentOptions()).includes('Shingles (previously saved)'));
        await page.evaluate(() => InspectionField.editNote({ section: 'Elevations' }));
        assert.ok(!(await componentOptions()).includes('Shingles (previously saved)'), 'Legacy option is not offered on new notes');
        await page.locator('#fieldProperty [name=address]').fill('123 Example Street');
        await page.locator('#fieldNoteForm [name=section]').selectOption('Roof edge');
        await page.locator('#fieldNoteForm [name=location]').fill('Rear elevation');
        await page.locator('#fieldNoteForm [name=component]').selectOption('Gutter');
        await page.locator('#fieldNoteForm [name=condition]').selectOption('Observed damage');
        await page.locator('[name=damageType][value="Dent / deformation"]').check();
        await page.locator('#fieldNoteForm [name=quantity]').fill('6');
        await page.locator('#fieldNoteForm [name=unit]').selectOption('inches');
        await page.locator('#fieldNoteForm [name=details]').fill('Tape read at the opening.');
        await page.locator('#fieldDictate').click();
        assert.equal(await page.locator('#fieldNoteForm [type=submit]').isDisabled(), true);
        await page.evaluate(() => { const result = [{ transcript: 'Dent on the rear gutter.' }]; result.isFinal = true; window.testSpeech.onresult({ resultIndex: 0, results: [result] }); });
        await page.locator('#fieldDictate').click();
        await page.locator('#fieldNoteForm [type=submit]').click();
        assert.equal(await page.locator('.field-saved-note').count(), 1);
        await page.locator('#fieldDictate').click();
        await page.evaluate(() => window.testSpeech.onerror({ error: 'not-allowed' }));
        assert.equal(await page.locator('#fieldNoteForm [type=submit]').isDisabled(), false);
        assert.match(await page.locator('#fieldVoiceStatus').innerText(), /not-allowed/);
        await page.reload();
        assert.match(await page.locator('.field-saved-note').innerText(), /Dent on the rear gutter/);
        await page.locator('[data-edit-note]').click();
        await page.locator('#fieldNoteForm [name=condition]').selectOption('No visible damage');
        assert.equal(await page.locator('[name=damageType]:checked').count(), 0);
        assert.doesNotMatch(await page.locator('#fieldNarrative').innerText(), /Damage type:/);
        await page.locator('#fieldNoteForm [name=details]').fill('No visible deformation on inspection.');
        await page.locator('#fieldNoteForm [type=submit]').click();
        assert.equal(await page.locator('.field-saved-note').count(), 1, 'Editing updates rather than duplicates');
        // A draft follows the inspector between pages, even without submitting it.
        await page.locator('#fieldNoteForm [name=details]').fill('Draft retained across sections');
        await go('ridge-inspection.html?item=1');
        await page.waitForFunction(() => !document.getElementById('captureBtn').disabled);
        assert.equal(await page.locator('#inspectionTitle').innerText(), 'Under-Ridge Inspection');
        assert.equal(await page.locator('#fieldNoteForm [name=details]').inputValue(), 'Draft retained across sections');

        const image = await page.evaluate(() => {
            const canvas = document.createElement('canvas'); canvas.width = 1200; canvas.height = 900;
            const ctx = canvas.getContext('2d'); ctx.fillStyle = '#668899'; ctx.fillRect(0, 0, 1200, 900); return canvas.toDataURL();
        });
        // Simultaneous photo saves must not overwrite notes written during thumbnail generation.
        await page.evaluate(async image => {
            const a = InspectionStore.recordPhoto('Elevations', 'Rear Elevation', image);
            const b = InspectionStore.recordPhoto('Ridge', 'Under-Ridge Inspection', image);
            InspectionStore.note('raceTest', 'kept'); await Promise.all([a, b]);
        }, image);
        assert.equal(await page.evaluate(() => InspectionStore.get().notes.raceTest), 'kept');
        assert.equal(await page.evaluate(() => Object.keys(InspectionStore.get().photos).length), 2);
        const routes = [['Elevations', 'elevation-photos.html?item=2', 'Rear Elevation'], ['Roof edge', 'roof-edge.html?item=1', 'Underlayment Inspection'], ['Ridge', 'ridge-inspection.html?item=1', 'Under-Ridge Inspection'], ['Roof overview', 'roof-overview.html?item=3', 'Left Overview'], ['Hail documentation', 'hail-test-square.html?item=2', 'Hail Hit Closeup 2']];
        for (const [section, route, label] of routes) {
            await page.evaluate(async ({ section, label, image }) => InspectionStore.recordPhoto(section, label, image), { section, label, image });
            await go(route); await page.waitForFunction(() => !document.getElementById('captureBtn').disabled);
            assert.ok(await page.locator('#photoPreview img').getAttribute('src') === image, `${section} restores original`);
            assert.equal(await page.locator('#fieldPhotoJump').inputValue(), new URLSearchParams(route.split('?')[1]).get('item'));
        }
        await go('roof-accessories.html'); await page.waitForFunction(() => !document.getElementById('captureBtn').disabled);
        await page.evaluate(async image => {
            selectAccessoryType('vent'); addNewAccessory(); displayPhotoPreview(image); await InspectionStore.flush();
            addNewAccessory(); displayPhotoPreview(image); await InspectionStore.flush();
        }, image);
        await page.reload(); await page.waitForFunction(() => !document.getElementById('captureBtn').disabled);
        assert.equal(await page.evaluate(() => capturedPhotos.length), 2, 'Two vents stay separate');
        assert.equal(await page.evaluate(() => Object.values(InspectionStore.get().photos).filter(p => p.section === 'Accessories').length), 2);
        await go('insured-interview.html');
        await page.locator('#damageNotes').fill('Interview draft retained');
        await page.reload(); assert.equal(await page.locator('#damageNotes').inputValue(), 'Interview draft retained');
        assert.equal(await page.locator('#totalPhotos').innerText(), '7');

        await go('inspection-review.html');
        assert.match(await page.locator('#reviewContent').innerText(), /No visible deformation on inspection/);
        assert.match(await page.locator('#reviewProperty').innerText(), /123 Example Street/);
        await page.locator('[data-open-photo]').first().click();
        await page.locator('#reviewPhotoDialog[open]').waitFor();
        assert.ok(await page.locator('#reviewFullPhoto').getAttribute('src') === image, 'Review loads full original');
        await page.locator('#reviewPhotoClose').click();
        await page.emulateMedia({ media: 'print' });
        assert.equal(await page.locator('.field-toolbar').isVisible(), false);
        assert.equal(await page.locator('.review-note').first().isVisible(), true);
        await page.emulateMedia({ media: 'screen' });
        await go('inspection-workspace.html');
        await page.screenshot({ path: '/tmp/apex-workspace-desktop.png', fullPage: true });
        await page.setViewportSize({ width: 390, height: 844 });
        await page.screenshot({ path: '/tmp/apex-workspace-mobile.png', fullPage: true });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'No horizontal overflow');
        // Storage failure is visible, never reported as a successful save.
        await page.evaluate(() => { const original = Storage.prototype.setItem; Storage.prototype.setItem = function(key, value) { if (key === 'apex_inspection_record_v1') throw new DOMException('Full', 'QuotaExceededError'); return original.call(this, key, value); }; });
        await page.locator('#fieldNoteForm [name=details]').fill('Unsaved change');
        assert.equal(await page.locator('.field-save-error').isVisible(), true);
        assert.match(await page.locator('#fieldSaveStatus').innerText(), /not saved/);
        assert.deepEqual(errors, []);
        const unsupported = await browser.newContext();
        await unsupported.addInitScript(() => { window.SpeechRecognition = undefined; window.webkitSpeechRecognition = undefined; });
        const typingPage = await unsupported.newPage();
        await typingPage.goto('http://127.0.0.1:8000/inspection-workspace.html');
        assert.equal(await typingPage.locator('#fieldDictate').isDisabled(), true);
        assert.equal(await typingPage.locator('#fieldNoteForm [name=details]').isEditable(), true);
        await unsupported.close();
        console.log('PASS: nonlinear steps, note edit/draft persistence, mocked dictation/denied/unsupported states, originals/resume, concurrent saves, duplicate accessories, interview resume/counts, review/print, mobile layout and storage failure.');
        await context.close();
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
