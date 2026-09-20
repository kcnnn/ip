const imagePattern=/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/;
const object=value=>value && typeof value==='object' && !Array.isArray(value);
function checkTree(value,depth=0) {
    if(depth>40) throw new Error('Backup nesting is invalid.');
    if(value && typeof value==='object') for(const [key,child] of Object.entries(value)) {
        if(['__proto__','prototype','constructor'].includes(key)) throw new Error('Backup contains an unsafe field.');
        checkTree(child,depth+1);
    }
}
function photosIn(record) {
    return [...Object.values(record.photos),...Object.values(record.deletedItems || {}).filter(e=>e.kind==='photos').map(e=>e.item)];
}
async function hash(value) {return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))].map(b=>b.toString(16).padStart(2,'0')).join('');}
export function validateBackup(bundle) {
    if(!object(bundle) || bundle.format!=='apex-inspection-backup' || bundle.version!==1 || !object(bundle.record) || !object(bundle.assets)) throw new Error('Choose a full APEX inspection backup, not a notes-only JSON export.');
    checkTree(bundle);
    const r=bundle.record;
    for(const key of ['photos','observations','notes','absences','sectionStates']) if(!object(r[key])) throw new Error(`Backup ${key} are invalid.`);
    if(typeof r.id!=='string' || (r.deletedItems && !object(r.deletedItems))) throw new Error('Backup record is invalid.');
    for(const [id,note] of Object.entries(r.observations)) if(!object(note)||note.id!==id||typeof note.updatedAt!=='string') throw new Error('Saved observation identity is invalid.');
    for(const e of Object.values(r.deletedItems || {})) if(!object(e) || !['photos','observations'].includes(e.kind) || typeof e.id!=='string' || !object(e.item)) throw new Error('Deleted item is invalid.');
    for(const photo of photosIn(r)) {
        if(!object(photo) || typeof photo.label!=='string' || typeof photo.section!=='string') throw new Error('Photo metadata is invalid.');
        if(photo.thumbnail && !imagePattern.test(photo.thumbnail)) throw new Error('A photo thumbnail is invalid.');
        if(photo.originalKey && (typeof photo.originalKey!=='string' || !Object.hasOwn(bundle.assets,photo.originalKey))) throw new Error('An original photo is missing from this backup.');
        if(photo.elevationKey && !['front','right','rear','left'].includes(photo.elevationKey)) throw new Error('Invalid photo elevation.');
    }
    const notes=[...Object.values(r.observations),...Object.values(r.deletedItems || {}).filter(e=>e.kind==='observations').map(e=>e.item),...(r.notes.fieldDraft?[r.notes.fieldDraft]:[])];
    for(const note of notes) {
        if(!object(note) || typeof note.section!=='string') throw new Error('An observation is invalid.');
        for(const key of ['id','location','details','component','condition','severity','unit','updatedAt','photoId']) if(note[key]!=null && typeof note[key]!=='string') throw new Error(`Observation ${key} is invalid.`);
        if(note.damageTypes && (!Array.isArray(note.damageTypes) || note.damageTypes.some(s=>typeof s!=='string'))) throw new Error('Damage selections are invalid.');
        if(note.aiReview && (typeof note.aiReview.status!=='string' || typeof note.aiReview.summary!=='string' || !Array.isArray(note.aiReview.checks) || note.aiReview.checks.some(s=>typeof s!=='string'))) throw new Error('Photo review is invalid.');
        if(note.equipmentResearch) {
            const e=note.equipmentResearch;
            if(!Array.isArray(e.findings) || e.findings.some(f=>!object(f)||typeof f.text!=='string'||!Array.isArray(f.sources)||f.sources.some(s=>!object(s)||typeof s.url!=='string'||typeof s.title!=='string'))) throw new Error('Equipment research is invalid.');
        }
    }
    for(const a of Object.values(r.absences)) if(!object(a)||typeof a.label!=='string'||typeof a.section!=='string') throw new Error('Absence record is invalid.');
    return bundle;
}
export async function createBackup() {
    await InspectionStore.flush();
    const record=InspectionStore.get(), snapshot=JSON.stringify(record), assets={};
    for(const photo of photosIn(record)) if(photo.originalKey && !Object.hasOwn(assets,photo.originalKey)) {
        const data=await InspectionStore.readStoredAsset(photo.originalKey);
        if(typeof data!=='string' || !imagePattern.test(data)) throw new Error(`Original unavailable for “${photo.label}”. Re-upload it before making a full backup.`);
        assets[photo.originalKey]={data,sha256:await hash(data)};
    }
    if(snapshot!==JSON.stringify(InspectionStore.get())) throw new Error('The inspection changed during backup. Finish editing and try again.');
    // Recovery archives belong to this device; do not export a dangling reference.
    delete record.restoreRecoveryKey;
    return {format:'apex-inspection-backup',version:1,createdAt:new Date().toISOString(),record,assets};
}
export async function restoreBackup(bundle) {
    validateBackup(bundle);
    if(InspectionStore.isSaving()) throw new Error('Wait for photo saving to finish.');
    const expected=JSON.stringify(InspectionStore.get());
    const record=structuredClone(bundle.record), newId=crypto.randomUUID(), assets=[], mapping=new Map();
    for(const photo of photosIn(record)) if(photo.originalKey) {
        const oldKey=photo.originalKey;
        if(!mapping.has(oldKey)) {
            const asset=bundle.assets[oldKey];
            if(!object(asset) || typeof asset.data!=='string' || !imagePattern.test(asset.data) || typeof asset.sha256!=='string' || await hash(asset.data)!==asset.sha256) throw new Error('Photo integrity check failed. The current inspection was not changed.');
            const key=`${newId}:restored:${crypto.randomUUID()}`;mapping.set(oldKey,key);assets.push([key,asset.data]);
        }
        photo.originalKey=mapping.get(oldKey);photo.storageStatus='saved';
    }
    record.id=newId;delete record.restoreRecoveryKey;
    await InspectionStore.activateRestoredRecord(record,assets,expected);
}
export function mountBackupControls() {
    const host=document.querySelector('.review-actions') || document.querySelector('.field-header .field-actions');if(!host) return;
    const panel=document.createElement('details');panel.className='field-backup-controls review-manage';
    panel.innerHTML='<summary>Backup / restore inspection</summary><p>A private backup includes notes, accepted research, original photos and deleted items. Keep it somewhere secure. Older thumbnail-only photos stay thumbnail-only.</p><button type="button" data-backup>Download full backup</button> <button type="button" data-import>Restore backup…</button> <button type="button" data-undo-restore>Return to previous inspection</button><input type="file" accept=".json,application/json" hidden><p role="status"></p>';
    host.after(panel);const status=panel.querySelector('[role=status]'),input=panel.querySelector('input');
    const buttons=[...panel.querySelectorAll('button')];let busy=false;
    const sync=()=>{panel.querySelector('[data-undo-restore]').hidden=!InspectionStore.get().restoreRecoveryKey;};sync();window.addEventListener('inspection-record-changed',sync);
    async function run(action){if(busy)return;busy=true;buttons.forEach(b=>b.disabled=true);try{await action();}catch(e){status.textContent=e.message || 'Backup operation failed; your inspection was kept.';}finally{busy=false;buttons.forEach(b=>b.disabled=false);sync();}}
    panel.querySelector('[data-backup]').onclick=()=>run(async()=>{
        status.textContent='Gathering original photos and notes…';const bundle=await createBackup();const blob=new Blob([JSON.stringify(bundle)],{type:'application/json'});
        if(blob.size>512*1024*1024) throw new Error('This inspection exceeds the current 512 MB backup limit. Nothing was removed; keep this browser data and export the report while a larger archive option is arranged.');
        const url=URL.createObjectURL(blob);
        const link=document.createElement('a');link.href=url;link.download=`apex-inspection-${new Date().toISOString().slice(0,10)}.backup.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
        status.textContent='Backup download started. Check that the file is saved before closing this browser.';
    });
    panel.querySelector('[data-import]').onclick=()=>input.click();
    input.onchange=()=>run(async()=>{
        const file=input.files[0];input.value='';if(!file)return;
        if(file.size>512*1024*1024) throw new Error('This backup exceeds the current 512 MB restore limit. Keep the file; do not clear your current inspection.');
        let bundle;try{bundle=JSON.parse(await file.text());}catch{throw new Error('This file is not a readable APEX backup.');}validateBackup(bundle);
        if(!confirm(`Restore ${Object.keys(bundle.record.photos).length} photos and ${Object.keys(bundle.record.observations).length} observations? This switches the active inspection. The current inspection is kept on this device under Return to previous inspection.`)) return;
        status.textContent='Checking and restoring original photos…';await restoreBackup(bundle);location.reload();
    });
    panel.querySelector('[data-undo-restore]').onclick=()=>run(async()=>{if(!confirm('Return to the inspection that was active before the last restore? This inspection will be kept too.'))return;await InspectionStore.undoRestore();location.reload();});
}
