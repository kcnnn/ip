const assert=require('node:assert/strict');const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch({channel:'chrome',headless:true});try{
 const p=await b.newPage({viewport:{width:390,height:844}});await p.goto('http://127.0.0.1:8000/inspection-workspace.html');
 const result=await p.evaluate(()=>{
  const choices=InspectionField.componentsBySection;
  return ['Exterior light','HVAC equipment','Fence','Other'].map(component=>ObservationExtraction.validate({multipleObservations:false,fields:{component:{value:component,evidence:component},section:{value:'Elevations',evidence:'Rear'}}},`Rear ${component}`,choices,'Elevations'));
 });
 assert.deepEqual(result.map(r=>r.component),['Exterior light','HVAC equipment','Fence','Other']);
 assert.ok(result.every(r=>r.section==='Elevations'));
 await p.evaluate(()=>InspectionField.startElevationDetail('rear'));
 assert.equal(await p.locator('[name=section]').inputValue(),'Elevations');
 await p.locator('#fieldEditDetails summary').click();
 await p.locator('[name=component]').selectOption('HVAC equipment');
 assert.equal(await p.locator('[name=component]').inputValue(),'HVAC equipment');
 console.log('PASS exterior components available within side-specific elevation observations');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exit(1);});
