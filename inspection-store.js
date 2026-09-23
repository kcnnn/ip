const INSPECTION_STORE_KEY = 'apex_inspection_record_v1';
const pendingInspectionSaves = new Set();
let inspectionDatabase;

function inspectionId() { return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`; }

function inspectionOriginals() {
    if (!inspectionDatabase) inspectionDatabase = new Promise((resolve, reject) => {
        const request = indexedDB.open('apex_inspection_originals', 1);
        request.onupgradeneeded = () => request.result.createObjectStore('photos');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    }).catch(error => { inspectionDatabase = null; throw error; });
    return inspectionDatabase;
}

async function originalTransaction(key, value) {
    const db = await inspectionOriginals();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction('photos', value === undefined ? 'readonly' : 'readwrite');
        const store = transaction.objectStore('photos');
        const request = value === undefined ? store.get(key) : store.put(value, key);
        transaction.oncomplete = () => resolve(request.result);
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error || new Error('Photo save interrupted'));
    });
}

function readInspectionRecord() {
    try {
        const record = JSON.parse(localStorage.getItem(INSPECTION_STORE_KEY)) || {
            startedAt: new Date().toISOString(), photos: {}, absences: {}, notes: {}
        };
        if (!record.id) { record.id = inspectionId(); localStorage.setItem(INSPECTION_STORE_KEY, JSON.stringify(record)); }
        record.observations ||= {};
        record.sectionStates ||= {};
        // Rename presentation metadata, not IDs or IndexedDB keys referenced by notes.
        const renameSection = value => {
            if (!value || typeof value !== 'object') return;
            if (value.section === 'Ridge') value.section = 'Shingles';
            Object.values(value).forEach(child => { if (child && typeof child === 'object') renameSection(child); });
        };
        renameSection(record);
        if (record.sectionStates.Ridge && !record.sectionStates.Shingles) record.sectionStates.Shingles = record.sectionStates.Ridge;
        delete record.sectionStates.Ridge;
        for(const photo of Object.values(record.photos || {})) {
            if(photo.hailSlopeId && photo.hailStep) {
                const slope=record.notes?.hailSlopes?.find(s=>s.id===photo.hailSlopeId);
                if(slope)photo.label=`${slope.name} · ${photo.hailStep}`;
            }
        }
        // Presentation labels for detail photos come from saved inspection words,
        // never filenames. Keep stable IDs/original keys and sourceName intact.
        const linked = new Map();
        Object.values(record.observations).sort((a,b)=>String(a.updatedAt||'').localeCompare(String(b.updatedAt||''))).forEach(note=>{
            linked.set(note.photoId,note);
            for (const ids of Object.values(note.brittleTest?.photos || {})) if(Array.isArray(ids)) ids.forEach(id=>linked.set(id,note));
        });
        for (const [id, photo] of Object.entries(record.photos || {})) {
            if (!id.startsWith('observation-photo:')) continue;
            const note=linked.get(id);
            const generated=note?.photoTitle;
            const title=generated?.photoId===id && generated?.transcript===note.details && typeof generated.value==='string' ? generated.value.trim().slice(0,100) : String(note?.details || '').trim().replace(/\s+/g,' ').slice(0,100);
            const prefix=photo.elevationKey ? `${photo.elevationKey.charAt(0).toUpperCase()+photo.elevationKey.slice(1)} Elevation` : '';
            const chimneyPrefix = photo.parentPhotoId && record.photos[photo.parentPhotoId]?.component === 'Chimney' ? 'Chimney measurement' : '';
            const testPrefix = ['before','during','after'].includes(photo.brittlePhase) ? `Brittle test · ${photo.brittlePhase === 'before' ? 'Before test' : photo.brittlePhase === 'during' ? 'During lift' : 'After test'}` : '';
            photo.label=[prefix,chimneyPrefix,testPrefix,title || (testPrefix ? '' : 'Detail photo')].filter(Boolean).join(' · ');
        }
        return record;
    } catch {
        return { id: inspectionId(), startedAt: new Date().toISOString(), photos: {}, absences: {}, notes: {}, observations: {}, sectionStates: {} };
    }
}

function writeInspectionRecord(record) {
    record.updatedAt = new Date().toISOString();
    try { localStorage.setItem(INSPECTION_STORE_KEY, JSON.stringify(record)); }
    catch (error) {
        window.dispatchEvent(new CustomEvent('inspection-save-error', { detail: 'Device storage is unavailable or full. This change was not saved. Export your record before leaving.' }));
        throw error;
    }
    window.dispatchEvent(new CustomEvent('inspection-record-changed'));
}

function makeThumbnail(dataUrl) {
    return new Promise(resolve => {
        const image = new Image();
        image.onload = () => {
            const scale = Math.min(1, 360 / Math.max(image.width, image.height));
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.round(image.width * scale));
            canvas.height = Math.max(1, Math.round(image.height * scale));
            canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg', 0.62));
        };
        image.onerror = () => resolve('');
        image.src = dataUrl;
    });
}

window.InspectionStore = {
    startNew() {
        writeInspectionRecord({ startedAt: new Date().toISOString(), photos: {}, absences: {}, notes: {} });
    },
    get: readInspectionRecord,
    hailSteps() {
        const record=readInspectionRecord(),steps=['Test Square Full View','Hail Hit Closeup 1','Hail Hit Closeup 2','Hail Hit Closeup 3'];
        return (record.notes?.hailSlopes || []).flatMap(s=>steps.map((step,index)=>({label:`${s.name} · ${step}`,url:`hail-test-square.html?slope=${encodeURIComponent(s.id)}&item=${index}`})));
    },
    assignLegacyHailSlope(id) {
        const record=readInspectionRecord(),slope=record.notes.hailSlopes?.find(s=>s.id===id);
        if(!slope)throw new Error('Choose an existing slope.');
        if(Object.values(record.photos).some(p=>p.hailSlopeId===id))throw new Error('That slope already has photos. Choose an empty slope.');
        for(const photo of Object.values(record.photos))if(photo.section==='Hail documentation'&&!photo.hailSlopeId){photo.hailStep=photo.hailStep||photo.label;photo.hailSlopeId=id;}
        writeInspectionRecord(record);
    },
    readStoredAsset: key => originalTransaction(key),
    async activateRestoredRecord(record, assets, expected) {
        if (pendingInspectionSaves.size || JSON.stringify(readInspectionRecord()) !== expected) throw new Error('The inspection changed during restore. Try again after saving finishes.');
        const previous=readInspectionRecord(), recoveryKey=`recovery:${inspectionId()}`;
        const db=await inspectionOriginals();
        await new Promise((resolve,reject)=>{
            const tx=db.transaction('photos','readwrite'), store=tx.objectStore('photos');
            store.put(JSON.stringify(previous),recoveryKey);
            for(const [key,value] of assets) store.put(value,key);
            tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error || new Error('Restore storage failed.'));
        });
        if (pendingInspectionSaves.size || JSON.stringify(readInspectionRecord()) !== expected) throw new Error('The inspection changed during restore. Your current inspection was kept.');
        record.restoreRecoveryKey=recoveryKey;
        writeInspectionRecord(record);
        window.dispatchEvent(new Event('inspection-restored'));
    },
    async undoRestore() {
        const current=readInspectionRecord();
        if(!current.restoreRecoveryKey) throw new Error('No previous inspection is available.');
        const previous=JSON.parse(await originalTransaction(current.restoreRecoveryKey));
        if(!previous?.id) throw new Error('Previous inspection could not be read.');
        await this.activateRestoredRecord(previous,[],JSON.stringify(current));
    },
    groupChimneyPhoto(id) {
        const record = readInspectionRecord();
        if (!record.photos[id]) return false;
        record.photos[id].section = 'Accessories';
        record.photos[id].component = 'Chimney';
        record.photos[id].accessoryType = {icon:'🏠',name:'Chimney',description:'Chimney or flue'};
        for (const note of Object.values(record.observations)) {
            if (note.photoId === id) note.section = 'Accessories';
        }
        writeInspectionRecord(record);
        return true;
    },
    recordPhoto(section, label, dataUrl, details = {}) {
        const record = readInspectionRecord();
        const id = details.id || (section === 'Shingles' && record.photos[`Ridge:${label}`] ? `Ridge:${label}` : `${section}:${label}`);
        const revision = inspectionId();
        record.photos[id] = {
            ...details, section, label, capturedAt: new Date().toISOString(), revision,
            originalKey: `${record.id}:${id}:${revision}`, storageStatus: 'saving'
        };
        delete record.absences[id];
        // Older gutter records used a different capitalization.
        if (section === 'Roof edge' && label === 'Gutter Measurement') delete record.absences['Roof edge:Gutter measurement'];
        try { writeInspectionRecord(record); } catch { return Promise.resolve(false); }
        const save = (async () => {
            try {
                const thumbnail = await makeThumbnail(dataUrl);
                await originalTransaction(record.photos[id].originalKey, dataUrl);
                const latest = readInspectionRecord();
                if (latest.id !== record.id || latest.photos[id]?.revision !== revision) return false;
                Object.assign(latest.photos[id], { thumbnail, storageStatus: 'saved' });
                writeInspectionRecord(latest);
                return true;
            } catch {
                const latest = readInspectionRecord();
                if (latest.id === record.id && latest.photos[id]?.revision === revision) {
                    latest.photos[id].storageStatus = 'failed';
                    try { writeInspectionRecord(latest); } catch { /* Error already reported. */ }
                }
                window.dispatchEvent(new CustomEvent('inspection-save-error', { detail: 'The original photo could not be saved on this device. Keep this page open and retry the upload.' }));
                return false;
            }
        })();
        pendingInspectionSaves.add(save);
        save.finally(() => pendingInspectionSaves.delete(save));
        return save;
    },
    async getPhoto(id) {
        const photo = readInspectionRecord().photos[id];
        return photo?.originalKey ? originalTransaction(photo.originalKey) : null;
    },
    flush() { return Promise.all([...pendingInspectionSaves]); },
    isSaving() { return pendingInspectionSaves.size > 0; },
    deleteReviewItem(kind, id) {
        if (!['photos', 'observations'].includes(kind)) throw new Error('Unknown item type.');
        if (pendingInspectionSaves.size) throw new Error('Wait for your photos to finish saving, then try again.');
        const record=readInspectionRecord(), item=record[kind][id];
        if (!item) throw new Error('This item is no longer in the record.');
        record.deletedItems ||= {};
        const token=inspectionId();
        record.deletedItems[token]={kind,id,item,deletedAt:new Date().toISOString()};
        delete record[kind][id];
        if (kind==='observations' && record.notes.fieldDraft?.id===id) delete record.notes.fieldDraft;
        writeInspectionRecord(record);
        window.dispatchEvent(new CustomEvent('inspection-item-deleted',{detail:{kind,id}}));
        return token;
    },
    restoreReviewItem(token) {
        const record=readInspectionRecord(), entry=record.deletedItems?.[token];
        if (!entry) throw new Error('This deleted item is no longer available.');
        if (record[entry.kind][entry.id]) throw new Error('A newer item uses this location. It was not overwritten.');
        record[entry.kind][entry.id]=entry.item;
        delete record.deletedItems[token];
        writeInspectionRecord(record);
    },
    saveObservation(value, { clearDraft = true } = {}) {
        const record = readInspectionRecord();
        const id = value.id || inspectionId();
        record.observations[id] = { ...value, id, source: 'Inspector note', updatedAt: new Date().toISOString() };
        if (clearDraft) delete record.notes.fieldDraft;
        writeInspectionRecord(record);
        return id;
    },
    sectionState(section, status, reason = '') {
        const record = readInspectionRecord();
        record.sectionStates[section] = { status, reason, updatedAt: new Date().toISOString() };
        writeInspectionRecord(record);
    },
    property(value) { const record = readInspectionRecord(); record.property = value; writeInspectionRecord(record); },
    removePhoto(section, label, id = `${section}:${label}`) {
        const record = readInspectionRecord();
        if (section === 'Shingles' && record.photos[`Ridge:${label}`]) id = `Ridge:${label}`;
        delete record.photos[id];
        writeInspectionRecord(record);
    },
    markNotPresent(section, label, note = 'Not present') {
        const record = readInspectionRecord();
        const id = `${section}:${label}`;
        record.absences[id] = { section, label, note, recordedAt: new Date().toISOString() };
        delete record.photos[id];
        writeInspectionRecord(record);
    },
    note(key, value) {
        const record = readInspectionRecord();
        record.notes[key] = value;
        writeInspectionRecord(record);
    },
    clear() { localStorage.removeItem(INSPECTION_STORE_KEY); }
};

window.addEventListener('beforeunload', event => {
    if (pendingInspectionSaves.size) { event.preventDefault(); event.returnValue = ''; }
});
