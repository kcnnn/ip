const test = require('node:test');
const assert = require('node:assert/strict');
const extraction = require('../observation-extraction.js');
const components = { Elevations: ['Window screen', 'Window', 'Door'], 'Roof edge': ['Gutter'], 'Roof overview': ['Shingles'] };
const field = (value, evidence) => ({ value, evidence });
const vm = require('node:vm');
const fs = require('node:fs');
function requestHarness(response) {
    let request;
    const context = {
        module: {exports: {}}, isAPIKeyConfigured: () => true,
        getAPIKey: () => 'synthetic-secret', getWorkspaceId: () => 'test-workspace',
        API_CONFIG: {MODEL: 'claude-sonnet-5'},
        sendAnthropicRequest: async value => { request = value; return response; },
        getAITextContent: value => value.content[0].text
    };
    vm.runInNewContext(fs.readFileSync(require.resolve('../observation-extraction.js'), 'utf8'), context);
    return {run: () => context.module.exports.extract('Door has a dent', components, 'Elevations'), request: () => request};
}

test('auto-fill request uses supported model defaults without sampling overrides', async () => {
    const harness = requestHarness({ok:true,json:async()=>({content:[{text:'{"multipleObservations":false,"fields":{}}'}]})});
    await harness.run();
    assert.equal(harness.request().payload.model, 'claude-sonnet-5');
    for (const key of ['temperature', 'top_p', 'top_k']) assert.equal(key in harness.request().payload, false);
});
test('API errors show provider details and redact credentials', async () => {
    const harness = requestHarness({ok:false,status:400,json:async()=>({error:{message:'Unsupported temperature for key synthetic-secret sk-example-token'}})});
    await assert.rejects(harness.run(), error => {
        assert.match(error.message, /API 400.*Unsupported temperature/);
        assert.doesNotMatch(error.message, /synthetic-secret|sk-example-token/);
        assert.match(error.message, /note and selections are unchanged/);
        return true;
    });
});
test('non-JSON API errors still produce an actionable message', async () => {
    const harness = requestHarness({ok:false,status:503,json:async()=>{throw new Error('HTML response');}});
    await assert.rejects(harness.run(), /Auto-fill unavailable \(API 503\).*note and selections are unchanged/);
});

test('validates supported transcript fields, including spoken counts', () => {
    const note = 'Front elevation, window screen. Moderate wear. Two screens affected.';
    const result = extraction.validate({ multipleObservations: false, fields: {
        section: field('Elevations', 'Front elevation'), location: field('Front elevation', 'Front elevation'),
        component: field('Window screen', 'window screen'), condition: field('Observed damage', 'wear'),
        severity: field('Moderate', 'Moderate'), damageTypes: field(['Wear / deterioration'], 'wear'),
        quantity: field('2', 'Two screens'), unit: field('items', 'Two screens')
    } }, note, components, 'Elevations');
    assert.equal(result.component, 'Window screen'); assert.equal(result.quantity, '2'); assert.equal(result.severity, 'Moderate');
});
test('rejects unsupported evidence, wrong-section components and multiple observations', () => {
    assert.throws(() => extraction.validate({multipleObservations:false,fields:{severity:field('Severe','severe')}}, 'Window wear', components, 'Elevations'));
    assert.throws(() => extraction.validate({multipleObservations:false,fields:{component:field('Shingles','shingles')}}, 'shingles', components, 'Elevations'));
    assert.throws(() => extraction.validate({multipleObservations:true,fields:{}}, 'Window and roof', components, 'Elevations'));
});
test('unstated fields stay absent and negative observations do not gain damage types', () => {
    assert.deepEqual(extraction.validate({multipleObservations:false,fields:{}}, 'Looking here', components, 'Elevations'), {});
    const negative = extraction.validate({multipleObservations:false,fields:{condition:field('No visible damage','No damage'),damageTypes:field(['Hail / impact'],'hail')}}, 'No damage from hail', components, 'Elevations');
    assert.equal(negative.condition, 'No visible damage'); assert.equal(negative.damageTypes, undefined);
});
test('ambiguous numbers or unpaired units are not made into measurements', () => {
    assert.throws(() => extraction.validate({multipleObservations:false,fields:{quantity:field('10+','10+')}}, '10+ hits', components, 'Elevations'));
    assert.deepEqual(extraction.validate({multipleObservations:false,fields:{quantity:field('5','five')}}, 'five', components, 'Elevations'), {});
});
test('accepts explicitly dictated mechanical damage and exposes matching UI selection', () => {
    const result = extraction.validate({multipleObservations:false,fields:{
        condition:field('Observed damage','mechanical damage'),
        damageTypes:field(['Mechanical damage'],'mechanical damage')
    }}, 'Door has mechanical damage, not hail.', components, 'Elevations');
    assert.deepEqual(result.damageTypes,['Mechanical damage']);
    const ui=fs.readFileSync(require.resolve('../inspection-field.js'),'utf8');
    assert.match(ui, /'Mechanical damage'/);
});
