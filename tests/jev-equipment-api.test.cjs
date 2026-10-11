const {test}=require('node:test');
const assert=require('node:assert/strict');
const handler=require('../api/jev-equipment');
const body={manufacturer:'Rheem',model:'ABC-123',confirmed:true};
const result={provider:'Jev Ultrafast',manufacturer:'Rheem',model:'ABC-123',retrievedAt:new Date().toISOString(),findings:[{text:'ABC-123 capacity: 50 gallons',evidence:'capacity: 50 gallons',sources:[{url:'https://www.rheem.com/spec',title:'Specifications'}]}]};
const call=async(body,headers={},method='POST')=>{
 const res={setHeader(){},status(code){this.code=code;return this;},json(body){this.body=body;return this;}};
 await handler({method,body,headers:{'content-type':'application/json',...headers}},res);return res;
};
test('authenticated bridge validates identity, strips unexpected output, rejects missing evidence and hides secrets',async()=>{
 const env={...process.env},original=global.fetch;
 try {
  process.env.APEX_JEV_ACCESS_TOKEN='a'.repeat(40);process.env.JEV_WORKER_TOKEN='b'.repeat(40);process.env.JEV_WORKER_URL='https://worker.example/v1/equipment';
  const auth={'x-apex-jev-access':process.env.APEX_JEV_ACCESS_TOKEN};
  assert.equal((await call(body)).code,401);
  assert.equal((await call(body,auth,'GET')).code,405);
  assert.equal((await call({...body,confirmed:false},auth)).code,400);
  assert.equal((await call({...body,url:'http://127.0.0.1:9222'},auth)).code,400);
  assert.equal((await call({...body,serial:'PRIVATE'},auth)).code,400);
  assert.equal((await call(body,{...auth,'content-type':'text/plain'})).code,415);
  let seen;
  global.fetch=async(url,options)=>{seen={url,options};return new Response(JSON.stringify({...result,secret:'must-not-leak'}));};
  const ok=await call(body,auth);assert.equal(ok.code,200);assert.equal(ok.body.findings.length,1);
  assert.equal(seen.options.headers.Authorization,'Bearer '+'b'.repeat(40));assert.equal(seen.options.redirect,'error');assert.deepEqual(JSON.parse(seen.options.body),body);
  assert.doesNotMatch(JSON.stringify(ok.body),/must-not-leak|bbbbbbbb/);
  for (const bad of [{...result,model:'other'},{...result,findings:[]},{...result,findings:[{...result.findings[0],evidence:''}]},{...result,findings:[{...result.findings[0],sources:[{url:'javascript:alert(1)',title:'Bad'}]}]}]) {
   global.fetch=async()=>new Response(JSON.stringify(bad));assert.equal((await call(body,auth)).code,502);
  }
  global.fetch=async()=>new Response('x'.repeat(20001));assert.equal((await call(body,auth)).code,502);
  global.fetch=async()=>new Response('private failure',{status:429});assert.equal((await call(body,auth)).code,429);
  global.fetch=async()=>{throw new Error('SECRET');};const fail=await call(body,auth);assert.equal(fail.code,502);assert.doesNotMatch(JSON.stringify(fail),/SECRET/);
  process.env.NODE_ENV='production';process.env.JEV_WORKER_URL='http://127.0.0.1:8787/v1/equipment';assert.equal((await call(body,auth)).code,503);
  process.env.JEV_WORKER_URL='https://worker.example/v1/equipment';process.env.JEV_WORKER_TOKEN=process.env.APEX_JEV_ACCESS_TOKEN;assert.equal((await call(body,auth)).code,503);
 } finally {process.env=env;global.fetch=original;}
});
