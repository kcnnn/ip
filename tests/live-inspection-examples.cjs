// Explicitly opt-in: sends private photos to the user's configured Claude API.
// Never run as part of the offline suite or commit test photos/credentials.
const fs=require('node:fs');const path=require('node:path');const {chromium}=require('playwright');
const cases=require('./fixtures/inspection-examples.json');
(async()=>{
 if(!process.argv.includes('--live') || !process.env.APEX_EVAL_API_KEY || !process.env.APEX_EVAL_PHOTO_DIR) throw new Error('Requires --live, APEX_EVAL_API_KEY and APEX_EVAL_PHOTO_DIR. This sends photos to Claude and incurs API usage.');
 const inputs=cases.map(c=>({...c,photoData:`data:image/${c.photo.endsWith('.jpg')?'jpeg':'png'};base64,${fs.readFileSync(path.join(process.env.APEX_EVAL_PHOTO_DIR,c.photo)).toString('base64')}`}));
 const browser=await chromium.launch({channel:'chrome',headless:true});let failed=0;
 try {
  const page=await browser.newPage();await page.goto('http://127.0.0.1:8000/inspection-workspace.html');
  // In-memory key, isolated test context. No browser storage or logging.
  await page.evaluate(key=>{window.getAPIKey=()=>key;window.isAPIKeyConfigured=()=>true;},process.env.APEX_EVAL_API_KEY);
  for(const item of inputs) {
   const result=await page.evaluate(async item=>{
    try {const r=await ObservationExtraction.extract(item.note,{Elevations:['Door','Gutter','Downspout','Other'],'Hail documentation':['Shingles','Other']},item.id==='chalk-tally'?'Hail documentation':'Elevations',item.photoData);return {fields:r.fields,review:r.review};}
    catch{return {error:true};}
   },item);
   const f=result.fields || {}, issues=[];
   if(result.error || !result.review) issues.push('photo review unavailable');
   if(item.location && !String(f.location||'').toLowerCase().includes(item.location)) issues.push('location missing/incorrect');
   if(item.condition!==undefined && (f.condition || '')!==item.condition) issues.push('condition changed');
   if(item.damage && !f.damageTypes?.includes(item.damage)) issues.push('damage selection missing');
   if(item.forbiddenDamage.some(d=>f.damageTypes?.includes(d))) issues.push('negation not preserved');
   if(item.quantity && String(f.quantity)!==item.quantity) issues.push('measurement incorrect');
   if(item.unit && f.unit!==item.unit) issues.push('unit incorrect');
   if(item.noExactCount && f.quantity!==undefined) issues.push('approximate tally became exact');
   if(!f.photoTitle) issues.push('descriptive title missing');
   console.log(`${issues.length?'FAIL':'PASS'} ${item.id}${issues.length?': '+issues.join(', '):''}`);if(issues.length) failed++;
  }
 } finally {await browser.close();}
 process.exitCode=failed?1:0;
})().catch(()=>{console.error('Live evaluation could not run. Check opt-in flag, credentials, local server and fixture files.');process.exit(1);});
