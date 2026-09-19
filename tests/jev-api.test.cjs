const {test}=require('node:test');
const assert=require('node:assert/strict');
const handler=require('../api/jev-next-step.js');
test('Jev server protects credentials, validates input and gates decisions',async()=>{
 const env={...process.env}, originalFetch=global.fetch;
 const call=async(body={},headers={},method='POST')=>{
  const response={headers:{},setHeader(k,v){this.headers[k]=v;},status(n){this.code=n;return this;},json(v){this.body=v;return this;}};
  await handler({method,body,headers:{'content-type':'application/json',...headers}},response);return response;
 };
 try {
  delete process.env.TYPESAFE_API_KEY;delete process.env.APEX_JEV_ACCESS_TOKEN;
  assert.equal((await call()).code,503);
  process.env.TYPESAFE_API_KEY='synthetic-provider-secret';process.env.APEX_JEV_ACCESS_TOKEN='x'.repeat(40);
  assert.equal((await call()).code,401);
  const auth={'x-apex-jev-access':'x'.repeat(40)};
  assert.equal((await call({},auth,'GET')).code,405);
  assert.equal((await call({note:'x'.repeat(12001)},auth)).code,400);
  assert.equal((await call({note:'Hi'},{...auth,'content-type':'text/plain'})).code,415);
  let payload;
  global.fetch=async(url,options)=>{assert.equal(url,'https://api.typesafe.ai/v1/systemone');assert.equal(options.headers.Authorization,'Bearer synthetic-provider-secret');payload=JSON.parse(options.body);return {ok:true,json:async()=>({answers:{next_step:{type:'choice',choice:'capture_label',confidence:0.9,probabilities:{capture_label:0.95}}}})};};
  const ok=await call({note:'Condenser with unreadable label',secret:'do not forward'},auth);
  assert.equal(ok.code,200);assert.equal(ok.body.choice,'capture_label');
  assert.doesNotMatch(JSON.stringify(ok.body),/synthetic-provider-secret/);
  assert.doesNotMatch(payload.state,/do not forward/);assert.equal(payload.questions.next_step.type,'choice');
  global.fetch=async()=>({ok:true,json:async()=>({answers:{next_step:{type:'choice',choice:'research_equipment',confidence:0.2,probabilities:{research_equipment:0.5}}}})});
  assert.equal((await call({note:'Equipment'},auth)).body.choice,'uncertain');
  global.fetch=async()=>({ok:true,json:async()=>({answers:{next_step:{type:'choice',choice:'execute_code',confidence:1}}})});
  assert.equal((await call({note:'Equipment'},auth)).code,502);
  global.fetch=async()=>({ok:false,status:401,json:async()=>({error:'synthetic-provider-secret'})});
  const failed=await call({note:'Equipment'},auth);assert.equal(failed.code,502);assert.doesNotMatch(JSON.stringify(failed.body),/synthetic-provider-secret/);
 } finally {process.env=env;global.fetch=originalFetch;}
});
