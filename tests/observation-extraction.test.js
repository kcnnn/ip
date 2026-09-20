const test = require('node:test');
const assert = require('node:assert/strict');
const extraction = require('../observation-extraction.js');
const components = { Elevations: ['Window screen', 'Window', 'Door'], 'Roof edge': ['Gutter'], 'Roof overview': ['Shingles'] };
const field = (value, evidence) => ({ value, evidence });
test('manual lift for a passed brittle test is not wind damage',()=>{
    const text='Rear slope. I manually lifted the shingle. Passed the brittle test with no damage.';
    const result={multipleObservations:false,fields:{condition:field('Observed damage','lifted the shingle'),damageTypes:field(['Wind / lifted shingle'],'lifted the shingle'),severity:field('Moderate','lifted the shingle')}};
    const output=extraction.validate(result,text,components,'Roof overview');
    assert.equal(output.condition,'No visible damage');assert.equal(output.damageTypes,undefined);assert.equal(output.severity,undefined);
    for(const text of ['Did not pass the brittle test. Cracking occurred.','Brittle test passed but pre-existing wind damage is present.','Brittle test not performed.','Might have passed the brittle test.']) {
        const out=extraction.validate({multipleObservations:false,fields:{}},text,components,'Roof overview');
        assert.notEqual(out.condition,'No visible damage',text);
    }
    const damaged='Brittle test passed but pre-existing wind damage is present.';
    const out=extraction.validate({multipleObservations:false,fields:{condition:field('Observed damage','wind damage'),damageTypes:field(['Wind / lifted shingle'],'wind damage')}},damaged,components,'Roof overview');
    assert.equal(out.condition,'Observed damage');assert.deepEqual(out.damageTypes,['Wind / lifted shingle']);
});
test('multiple observations retain all transcript passages and isolate evidence',()=>{
    const transcript='Front window screen is worn. Rear door has mechanical damage, not hail.';
    const result={observations:[
        {quotes:['Front window screen is worn.'],fields:{location:field('Front','Front'),component:field('Window screen','window screen'),condition:field('Observed damage','is worn'),quantity:field('2','Rear door')}},
        {quotes:['Rear door has mechanical damage, not hail.'],fields:{location:field('Rear','Rear'),component:field('Door','door'),condition:field('Observed damage','has mechanical damage'),damageTypes:field(['Mechanical damage'],'mechanical damage, not hail')}}
    ]};
    const notes=extraction.validateMany(result,transcript,components,'Elevations');
    assert.equal(notes.length,2);assert.equal(notes[0].quantity,undefined);
    assert.deepEqual(notes[1].damageTypes,['Mechanical damage']);
    assert.equal(notes[0].details,'Front window screen is worn.');
    assert.throws(()=>extraction.validateMany({observations:[result.observations[0]]},transcript,components,'Elevations'),/left part/);
    assert.throws(()=>extraction.validateMany({observations:[{quotes:['Invented text'],fields:{}}]},transcript,components,'Elevations'),/traced/);
    assert.throws(()=>extraction.validateMany({observations:[]},transcript,components,'Elevations'),/incomplete/);
});
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
    assert.deepEqual(extraction.validate({multipleObservations:false,fields:{severity:field('Severe','severe')}}, 'Window wear', components, 'Elevations'),{});
    assert.deepEqual(extraction.validate({multipleObservations:false,fields:{component:field('Shingles','shingles')}}, 'shingles', components, 'Elevations'),{});
    assert.throws(() => extraction.validate({multipleObservations:true,fields:{}}, 'Window and roof', components, 'Elevations'));
});
test('unstated fields stay absent and negative observations do not gain damage types', () => {
    assert.deepEqual(extraction.validate({multipleObservations:false,fields:{}}, 'Looking here', components, 'Elevations'), {});
    const negative = extraction.validate({multipleObservations:false,fields:{condition:field('No visible damage','No damage'),damageTypes:field(['Hail / impact'],'hail')}}, 'No damage from hail', components, 'Elevations');
    assert.equal(negative.condition, 'No visible damage'); assert.equal(negative.damageTypes, undefined);
});
test('ambiguous numbers or unpaired units are not made into measurements', () => {
    assert.deepEqual(extraction.validate({multipleObservations:false,fields:{quantity:field('10+','10+')}}, '10+ hits', components, 'Elevations'),{});
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
test('photo titles require transcript evidence and a bounded title', () => {
    assert.equal(extraction.validate({multipleObservations:false,fields:{photoTitle:field('HVAC serial number label','hvac serial number label')}},'Front elevation hvac serial number label',components,'Elevations').photoTitle,'HVAC serial number label');
    assert.deepEqual(extraction.validate({multipleObservations:false,fields:{photoTitle:field('Roof damage','roof')}},'hvac label',components,'Elevations'),{});
    assert.deepEqual(extraction.validate({multipleObservations:false,fields:{photoTitle:field('x'.repeat(101),'hvac')}},'hvac label',components,'Elevations'),{});
});
test('one unsupported label field does not discard valid location and title',()=>{
    const omitted=[];
    const result=extraction.validate({multipleObservations:false,fields:{location:field('Garage','garage'),photoTitle:field('Water heater rating plate','water heater rating plate'),component:field('Water heater','water heater'),condition:field('No visible damage','no damage visible')}},'water heater  rating plate in garage',components,'Elevations',omitted);
    assert.deepEqual(result,{location:'Garage',photoTitle:'Water heater rating plate'});
    assert.deepEqual(omitted.sort(),['component','condition']);
});
test('photo review tolerates absent checks and preserves actual visual notes',()=>{
    assert.deepEqual(extraction.normalizePhotoReview({status:'supports_note',summary:'Water heater label visible.'}).review,{status:'supports_note',summary:'Water heater label visible.',checks:[]});
    assert.deepEqual(extraction.normalizePhotoReview({status:'needs_detail',summary:'Label visible.',checks:'Serial partly obscured.'}).review.checks,['Serial partly obscured.']);
    const unknown=extraction.normalizePhotoReview({status:'documentation_only',summary:'Rating plate visible.',checks:[null,'Check model']});
    assert.equal(unknown.review.status,'unable_to_assess');assert.match(unknown.reviewNotice,/not as photo approval/);
    assert.equal(extraction.normalizePhotoReview({status:'supports_note',checks:[]}).review,null);
    assert.equal(extraction.normalizePhotoReview(null).review,null);
    const bounded=extraction.normalizePhotoReview({status:'needs_detail',summary:'x'.repeat(4000),checks:Array(9).fill('x'.repeat(2000))}).review;
    assert.equal(bounded.summary.length,3000);assert.equal(bounded.checks.length,6);assert.equal(bounded.checks[0].length,1000);
});
