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
    recordPhoto(section, label, dataUrl, details = {}) {
        const record = readInspectionRecord();
        const id = details.id || `${section}:${label}`;
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
