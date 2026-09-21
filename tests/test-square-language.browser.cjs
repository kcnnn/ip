const assert = require('node:assert/strict');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage();
    await page.goto('http://127.0.0.1:8000/hail-test-square.html');
    assert.equal(await page.locator('h1').innerText(), 'Test square');
    const result = await page.evaluate(async () => {
      const base = { overallQuality: 'good', confidence: 90, issues: [], recommendations: [], shouldRetake: false, damageSeverity: 'severe' };
      const square = { ...base, testSquareQuality: 'good', hailDamageDetected: true, countBasis: 'counted_circles', circledHailHitCount: 1, countConfidence: 'high' };
      const closeup = { ...base, chalkMarkingVisible: true, hailHitVisible: true, hailHitGenuine: true };
      const texts = [];
      for (const item of [square, closeup, {...square, hailDamageDetected:false}, {...closeup, hailHitGenuine:false}]) {
        displayAIResults(item);
        texts.push(document.getElementById('aiResults').innerText);
      }
      const prompts = [];
      window.isAPIKeyConfigured = () => true;
      window.getAPIKey = () => 'test-only-placeholder';
      window.getWorkspaceId = () => '';
      window.sendAnthropicRequest = async ({payload}) => {
        prompts.push(payload.messages[0].content.filter(c=>c.type==='text').map(c=>c.text).join('\n'));
        return {ok:true,json:async()=>({content:[{type:'text',text:JSON.stringify(square)}]})};
      };
      const canvas = document.createElement('canvas');
      for (const step of ['test-square','closeup-1']) await analyzeHailDamageWithChatGPT(canvas.toDataURL(), step);
      return {texts, prompts};
    });
    for (const text of result.texts) {
      assert.match(text, /inspector makes the final damage and cause determination/i);
      assert.doesNotMatch(text, /Hail Damage Detected:|Damage Severity:|Marked hail hit visible:/);
    }
    for (const text of result.texts.slice(0,2)) assert.match(text,/potentially consistent with hail damage/);
    for (const text of result.texts.slice(2)) assert.match(text,/does not rule out damage/);
    for (const prompt of result.prompts) {
      assert.match(prompt,/never confirm hail causation/);
      assert.match(prompt,/potentially consistent with hail damage/);
      assert.doesNotMatch(prompt,/Is this a genuine hail hit/);
    }
    console.log('PASS Test square title, tentative positive/negative results, inspector authority and both AI prompts (mocked API).');
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exit(1);});
