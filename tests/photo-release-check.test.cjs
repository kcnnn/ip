const {test}=require('node:test'),assert=require('node:assert/strict');
const {check,required}=require('./photo-release-check.cjs');
function fixture(){
 const results=required.map(category=>({id:category,category,sha256:'a'.repeat(64),status:'REVIEW_REQUIRED',issues:[]}));
 return {report:{sourceHashes:{extractor:'current'},results},review:{reportHash:'report',reviewer:'Inspector',reviewedAt:'2026-09-21',decisions:results.map(r=>({id:r.id,verdict:'pass',notes:'Compared original photo and response against the case rubric.'}))}};
}
test('complete reviewed suite passes',()=>{const {report,review}=fixture();assert.deepEqual(check(report,review,'report',{extractor:'current'}),[]);});
test('OCR passes alone cannot satisfy the release gate',()=>{const {report,review}=fixture();report.results=report.results.filter(r=>r.category==='label');report.results[0].status='OCR_PASS';review.decisions=[];assert.ok(check(report,review,'report',{extractor:'current'}).length);});
test('changed report, changed code, failure and missing reviewer block',()=>{
 for(const mutate of [r=>r.report.sourceHashes.extractor='old',r=>r.review.reportHash='old',r=>r.report.results[0].status='FAIL',r=>r.review.decisions[0].verdict='fail',r=>r.review.reviewer='',r=>r.review.decisions[0].notes='']){
  const f=fixture();mutate(f);assert.ok(check(f.report,f.review,'report',{extractor:'current'}).length);
 }
});
