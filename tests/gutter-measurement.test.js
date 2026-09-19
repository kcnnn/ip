const assert = require('node:assert/strict');
const test = require('node:test');
const measurement = require('../gutter-measurement.js');

test('keeps the actual measurement from fenced JSON', () => {
    const result = measurement.parse('```json\n{"measurementReadable":true,"gutterSize":"6 inches","confidence":91}\n```');
    assert.equal(result.measurementReadable, true);
    assert.equal(result.gutterSize, '6 inches');
    assert.equal(result.confidence, 91);
});

test('never reports readable without a usable measurement', () => {
    for (const gutterSize of [undefined, null, 'unreadable', '', '5', 'approximately 6 inches', '0 inches', '1/0 inches', '<img src=x>']) {
        const result = measurement.normalize({ measurementReadable: true, gutterSize });
        assert.equal(result.measurementReadable, false);
        assert.equal(result.gutterSize, null);
    }
});

test('preserves fractions and units without assuming inches', () => {
    for (const [input, expected] of [['5 1/2 in.', '5 1/2 inches'], ['5.5″', '5.5 inches'], ['125 mm', '125 mm'], ['12.5 cm', '12.5 cm']]) {
        assert.equal(measurement.normalize({measurementReadable: true, gutterSize: input}).gutterSize, expected);
    }
});

test('rejects keyword-based guesses, malformed JSON and explicit negative findings', () => {
    for (const text of ['The measurement is not readable. Photo is good.', '{"measurementReadable":true', 'null']) {
        assert.equal(measurement.parse(text).measurementReadable, false);
        assert.equal(measurement.parse(text).confidence, null);
    }
    assert.equal(measurement.normalize({measurementReadable: false, gutterSize: '6 inches'}).gutterSize, null);
    assert.equal(measurement.normalize({measurementReadable: true, gutterSize: '6 inches', apiError: '401'}).gutterSize, null);
});
