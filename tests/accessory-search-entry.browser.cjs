const assert=require('node:assert/strict');const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch({channel:'chrome',headless:true});try{
 const p=await b.newPage({viewport:{width:390,height:844}});await p.goto('http://127.0.0.1:8000/roof-accessories.html');
 await p.waitForFunction(()=>!!InspectionField.openAccessoryResearch);
 await p.evaluate(async()=>{
  const c=document.createElement('canvas');c.width=100;c.height=100;const photoData=c.toDataURL();
  capturedPhotos=[{id:123,recordId:'Accessories:123',type:{name:'Vent',icon:'V',description:'Roof vent'},photoData}];currentAccessoryIndex=0;
  await InspectionStore.recordPhoto('Accessories','Vent',photoData,{id:'Accessories:123'});updateChecklist();
  window.isAPIKeyConfigured=()=>true;window.getAPIKey=()=> 'synthetic-key';
  window.sendAnthropicRequest=async()=>({ok:true,json:async()=>({content:[{type:'text',text:JSON.stringify({description:'Gray box vent',markings:'',limitations:'Material uncertain; measure dimensions.'})}]})});
 });
 await p.getByRole('button',{name:'Identify & search',exact:true}).click();
 await p.locator('#accessoryFeatures').waitFor({state:'visible'});
 assert.equal(await p.locator('[name=photoId]').inputValue(),'Accessories:123');
 assert.equal(await p.locator('#fieldAccessoryResearch').evaluate(e=>e.open),true);
 assert.equal(await p.locator('#fieldNotebook').evaluate(e=>e.open),true);
 assert.equal(await p.locator('#accessoryDescription').inputValue(),'Gray box vent');
 await p.evaluate(()=>displayAnalysisUnavailable('401'));
 assert.equal(await p.getByRole('button',{name:'Identify & search this accessory',exact:true}).count(),1);
 assert.equal(await p.evaluate(()=>Object.keys(InspectionStore.get().observations).length),0);
 console.log('PASS accessory-card search entry selects original photo, opens research, reads photo, and is available after API failure.');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
