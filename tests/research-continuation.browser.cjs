const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try {
  const page=await browser.newPage();await page.goto('http://127.0.0.1:8000/inspection-workspace.html');
  await page.evaluate(()=>localStorage.setItem('claude_api_key','synthetic'));
  const source={type:'web_search_tool_result',content:[{type:'web_search_result',url:'https://manufacturer.example/manual'}]};
  const cited={type:'text',text:'Exact model documentation.',citations:[{type:'web_search_result_location',url:'https://manufacturer.example/manual',title:'Manual'}]};
  const pause={stop_reason:'pause_turn',content:[{type:'thinking',thinking:'Synthetic',signature:'preserve-signature'},source]};
  let queue=[],sent=[];
  await page.route('https://api.anthropic.com/**',route=>{sent.push(route.request().postDataJSON());return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(queue.shift())});});
  const run=()=>page.evaluate(async()=>{const {researchEquipment}=await import('./equipment-research.js');const messages=[];try{return {findings:await researchEquipment({model:'TEST',manufacturer:''},new AbortController().signal,m=>messages.push(m)),messages};}catch(e){return {error:e.message};}});
  queue=[pause,{stop_reason:'pause_turn',content:[{type:'text',text:'Still searching'}]},{stop_reason:'end_turn',content:[cited]}];
  let result=await run();assert.equal(result.findings[0].sources[0].url,'https://manufacturer.example/manual');assert.equal(sent.length,3);
  assert.deepEqual(sent[1].messages[1].content,pause.content);assert.equal(sent[2].messages.length,2);assert.equal(sent[2].messages[1].content.length,3);assert.equal(result.messages.length,2);
  assert.deepEqual(sent[0].tools,sent[1].tools);
  sent=[];queue=[{stop_reason:'max_tokens',content:[{type:'text',text:'Do not keep truncated facts'}]},{stop_reason:'end_turn',content:[source,cited]}];
  result=await run();assert.equal(result.findings.length,1);assert.equal(sent[1].max_tokens,16000);assert.deepEqual(sent[0].messages,sent[1].messages);
  sent=[];queue=[pause,pause,pause,pause];result=await run();assert.equal(sent.length,4);assert.match(result.error,/too many continuations/);
  sent=[];queue=[{stop_reason:'max_tokens',content:[]},{stop_reason:'max_tokens',content:[]}];result=await run();assert.equal(sent.length,2);assert.match(result.error,/No partial findings/);
  sent=[];queue=[{stop_reason:'refusal',content:[]}];result=await run();assert.equal(sent.length,1);assert.match(result.error,/declined/);
  const aborted=await page.evaluate(async()=>{const {researchEquipment}=await import('./equipment-research.js');const c=new AbortController();c.abort();try{await researchEquipment({model:'TEST'},c.signal);}catch(e){return e.name;}});assert.equal(aborted,'AbortError');assert.equal(sent.length,1);
  console.log('PASS paused tool continuation, signed blocks, cross-turn sources, larger-budget retry, request caps, refusal and abort.');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
