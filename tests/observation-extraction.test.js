const test = require('node:test');
const assert = require('node:assert/strict');
const extraction = require('../observation-extraction.js');
const components = { Elevations: ['Window screen', 'Window', 'Door'], 'Roof edge': ['Gutter'], 'Roof overview': ['Shingles'] };
const field = (value, evidence) => ({ value, evidence });

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
