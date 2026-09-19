const assert = require('node:assert/strict');
const test = require('node:test');
const build = require('../claim-notes.js');
const sections = [['Elevations','', ['Front Elevation']], ['Roof edge','', ['Gutter Measurement']], ['Interview','',[]]];
test('includes saved findings, absences, measurements and reported discussion, not private payment or drafts', () => {
    const text = build({property:{address:'123 Example',claim:'ABC'},photos:{a:{section:'Elevations',label:'Front Elevation'}},
        observations:{a:{section:'Elevations',details:'Window screen has moderate wear.'},b:{section:'Roof edge',details:'Inspector-confirmed gutter size: 5 inches.'}},
        absences:{a:{section:'Roof edge',label:'Other component',note:'Not present'}},notes:{fieldDraft:{details:'DRAFT OMITTED'},insuredInterview:{damageNotes:'Insured reports staining.',zellePhone:'PRIVATE OMITTED'}}},sections,n=>n.details);
    assert.match(text,/Window screen has moderate wear/); assert.match(text,/5 inches/); assert.match(text,/reported.*Insured reports staining/);
    assert.doesNotMatch(text,/DRAFT OMITTED|PRIVATE OMITTED|Inspector review:|Not reviewed/);
});
test('photos without observations do not become negative damage findings', () => {
    const text = build({photos:{a:{section:'Elevations',label:'Front Elevation'}}},sections,n=>n.details);
    assert.match(text,/No inspector findings have been saved/); assert.doesNotMatch(text,/No damage detected|No visible damage/);
    assert.match(text,/Photos not recorded: Gutter Measurement/);
});
