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
test('concise notes group findings and separate reported, uninspected, research and AI sources', () => {
    const record={observations:{
        rear:{section:'Elevations',location:'Rear',condition:'Suspected damage',details:'Possible impact.'},
        front:{section:'Elevations',location:'Front',condition:'Observed damage',details:'Mechanical dent.',aiReview:{status:'needs_review',summary:'AI suggestion'},equipmentResearch:{model:'X',findings:[{text:'Published specification',sources:[{title:'Manufacturer',url:'https://example.com/spec'}]}]}},
        roof:{section:'Roof overview',location:'Rear slope',condition:'Not inspected',details:'Access unavailable.'}
    },notes:{insuredInterview:{damageNotes:'Owner reports a leak.'},fieldDraft:{details:'UNSAVED'}}};
    const text=build(record,sections,n=>n.details,{format:'concise'});
    assert.ok(text.indexOf('FRONT ELEVATION')<text.indexOf('REAR ELEVATION'));
    assert.match(text,/Observed finding: Mechanical dent/);
    assert.match(text,/Suspected — not confirmed: Possible impact/);
    assert.match(text,/AREAS RECORDED AS NOT INSPECTED\nRoof overview · Rear slope: Access unavailable/);
    assert.match(text,/REPORTED INFORMATION — NOT INDEPENDENTLY VERIFIED/);
    assert.match(text,/DOCUMENTATION GAPS — NOT A STATEMENT THAT AREAS WERE UNINSPECTED/);
    assert.match(text,/Source: Manufacturer — https:\/\/example.com\/spec/);
    assert.doesNotMatch(text,/AI suggestion|UNSAVED/);
    const optional=build(record,sections,n=>n.details,{format:'concise',research:false,gaps:false,ai:true});
    assert.match(optional,/AI PHOTO REVIEW — SEPARATE FROM INSPECTOR FINDINGS/);
    assert.doesNotMatch(optional,/Published specification|DOCUMENTATION GAPS/);
    assert.equal(record.observations.front.aiReview.summary,'AI suggestion');
});
