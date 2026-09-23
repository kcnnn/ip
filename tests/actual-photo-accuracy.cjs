// Separate from transcript tests: never send reference answers to the model.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {chromium}=require('playwright');
(async()=>{
 if(!process.env.APEX_EVAL_MANIFEST)throw new Error('Set APEX_EVAL_MANIFEST to a private manifest outside Git.');
 const cases=JSON.parse(fs.readFileSync(process.env.APEX_EVAL_MANIFEST,'utf8'));
 const readPhoto=photo=>{const bytes=fs.readFileSync(photo),ext=path.extname(photo).toLowerCase();
  if(!['.png','.jpg','.jpeg','.webp'].includes(ext))throw new Error('Decode HEIC to PNG/JPEG before evaluation.');
  return {sha256:crypto.createHash('sha256').update(bytes).digest('hex'),data:`data:image/${ext==='.jpg'||ext==='.jpeg'?'jpeg':ext.slice(1)};base64,${bytes.toString('base64')}`};};
 const inputs=cases.map(c=>{const primary=readPhoto(c.photo);return {...c,sha256:primary.sha256,photoData:primary.data,comparisons:(c.comparisons || []).map(p=>({...readPhoto(p.photo),phase:p.phase}))};});
 if(process.argv.includes('--preflight')){inputs.forEach(c=>console.log(`READY ${c.id}`));console.log('No AI calls made. No accuracy results yet.');return;}
 if(!process.argv.includes('--live')||!process.env.APEX_EVAL_API_KEY)throw new Error('Requires --live and APEX_EVAL_API_KEY. No AI calls made.');
 const output=path.resolve(process.env.APEX_EVAL_REPORT || '');
 const repo=path.resolve(__dirname,'..');
 if(!process.env.APEX_EVAL_REPORT||output===repo||output.startsWith(repo+path.sep)||fs.existsSync(output))throw new Error('Set APEX_EVAL_REPORT to a new private file outside Git.');
 const browser=await chromium.launch({channel:'chrome',headless:true}),rows=[];
 try{
  const page=await browser.newPage();await page.goto('http://127.0.0.1:8000/inspection-workspace.html');
  await page.evaluate(({key,workspace})=>{window.getAPIKey=()=>key;window.isAPIKeyConfigured=()=>true;if(workspace)window.getWorkspaceId=()=>workspace;},{key:process.env.APEX_EVAL_API_KEY,workspace:process.env.APEX_EVAL_WORKSPACE_ID});
  const model=await page.evaluate(()=>API_CONFIG.MODEL);
  for(const item of inputs){
   const result=await page.evaluate(async({kind,note,section,photoData,purpose,brittlePhase,comparisons})=>{
    const c=new AbortController(),timer=setTimeout(()=>c.abort(),90000);
    try{
     if(kind==='label')return await (await import('./jev-photo-context.js')).readEquipmentLabel(photoData,c.signal);
     if(kind==='accessory')return await (await import('./accessory-research.js')).describeAccessory(photoData,c.signal);
     return await Promise.race([ObservationExtraction.extract(note,InspectionField.componentsBySection,section,photoData,false,{purpose,brittlePhase,comparisons}),new Promise((_,reject)=>c.signal.addEventListener('abort',()=>reject(new Error('Timeout')),{once:true}))]);
    }catch(e){return {error:String(e.message).replace(/sk-[A-Za-z0-9_-]+/g,'[redacted]')};}finally{clearTimeout(timer);}
   },{kind:item.kind,note:item.note,section:item.section,photoData:item.photoData,purpose:item.purpose,brittlePhase:item.brittlePhase,comparisons:item.comparisons.map(({data,phase})=>({data,phase}))});
   const issues=[];
   if(result.error)issues.push('API/processing error');
   const norm=v=>typeof v==='string'?v.toUpperCase().replace(/\s+/g,'').replace(/[–—]/g,'-'):v;
   if(!result.error&&item.kind==='label')for(const [k,v] of Object.entries(item.expected || {}))if(norm(result[k])!==norm(v))issues.push(`${k} transcription mismatch`);
   if(!result.error&&item.kind==='accessory'&&item.noVisibleMarkings&&result.markings?.trim())issues.push('unsupported readable markings');
   if(!result.error&&item.kind==='observation'&&!result.review)issues.push('photo review unavailable');
   if(!result.error&&item.kind==='observation') {
    for(const [key,value] of Object.entries(item.expectedFields || {})) if(JSON.stringify(result.fields?.[key]??null)!==JSON.stringify(value))issues.push(`${key} field regression`);
    for(const type of item.forbiddenDamageTypes || [])if(result.fields?.damageTypes?.includes(type))issues.push(`incorrect ${type} classification`);
   }
   const status=issues.length?'FAIL':item.kind==='label'&&Object.keys(item.expected || {}).length?'OCR_PASS':'REVIEW_REQUIRED';
   rows.push({id:item.id,category:item.category,sha256:item.sha256,comparisonHashes:item.comparisons.map(p=>({phase:p.phase,sha256:p.sha256})),status,issues,expected:item.expected,expectedFields:item.expectedFields,reviewCriteria:item.reviewCriteria,result});
   console.log(`${status} ${item.id}${issues.length?': '+issues.join(', '):''}`);
  }
  const extractorHash=crypto.createHash('sha256').update(fs.readFileSync(path.join(repo,'observation-extraction.js'))).digest('hex');
  const sourceHashes=Object.fromEntries(require('./photo-release-check.cjs').sources.map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(path.join(repo,file))).digest('hex')]));
  fs.writeFileSync(output,JSON.stringify({testedAt:new Date().toISOString(),model,extractorHash,sourceHashes,results:rows},null,2).split(process.env.APEX_EVAL_API_KEY).join('[redacted]'),{flag:'wx',mode:0o600});
  console.log('Private responses saved for visual comparison. OCR passes are not general photo-accuracy certification.');
 }finally{await browser.close();}
 process.exitCode=rows.some(r=>r.status==='FAIL')?1:rows.some(r=>r.status==='REVIEW_REQUIRED')?2:0;
})().catch(e=>{console.error(String(e.message).replace(/sk-[A-Za-z0-9_-]+/g,'[redacted]'));process.exitCode=1;});
