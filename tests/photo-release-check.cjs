// Offline release gate. Private photos, responses and reviewer notes stay outside Git.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const required=['normal-joints','manual-lift','real-crack','mechanical-not-hail','label','uncertain-photo'];
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function check(report,review,reportHash,sourceHashes){
 const issues=[];
 if(review.reportHash!==reportHash)issues.push('Reviewer decisions do not match this report.');
 if(!review.reviewer?.trim() || !review.reviewedAt || !Number.isFinite(Date.parse(review.reviewedAt)))issues.push('Named reviewer and review date required.');
 for(const [file,digest] of Object.entries(sourceHashes))if(report.sourceHashes?.[file]!==digest)issues.push(`Stale or missing source hash: ${file}`);
 const rows=report.results || [],decisions=review.decisions || [];
 if(!rows.length)issues.push('No photo results.');
 if(new Set(rows.map(r=>r.id)).size!==rows.length)issues.push('Duplicate case IDs.');
 for(const category of required)if(!rows.some(r=>r.category===category))issues.push(`Missing coverage: ${category}`);
 for(const row of rows){
  if(!/^[a-f0-9]{64}$/.test(row.sha256 || ''))issues.push(`${row.id}: missing photo hash`);
  if(!['OCR_PASS','REVIEW_REQUIRED'].includes(row.status)||row.issues?.length)issues.push(`${row.id}: automated check failed`);
  const matches=decisions.filter(d=>d.id===row.id);
  if(matches.length!==1 || matches[0].verdict!=='pass' || !matches[0].notes?.trim())issues.push(`${row.id}: visual review has not passed with supporting notes`);
 }
 return issues;
}
const sources=['observation-extraction.js','jev-photo-context.js','accessory-research.js'];
if(require.main===module){
 try{
  const [reportPath,reviewPath]=process.argv.slice(2);
  if(!reportPath||!reviewPath)throw Error('Usage: node tests/photo-release-check.cjs /private/results.json /private/review.json');
  const bytes=fs.readFileSync(reportPath),report=JSON.parse(bytes),review=JSON.parse(fs.readFileSync(reviewPath,'utf8'));
  const hashes=Object.fromEntries(sources.map(file=>[file,hash(fs.readFileSync(path.join(__dirname,'..',file)))]));
  const issues=check(report,review,hash(bytes),hashes);
  for(const issue of issues)console.log('BLOCKED '+issue);
  if(!issues.length)console.log('PASS reviewed photo regression suite for these source versions. Not a general accuracy certification.');
  process.exitCode=issues.length?1:0;
 }catch(error){console.error(error.message);process.exitCode=1;}
}
module.exports={check,required,sources};
