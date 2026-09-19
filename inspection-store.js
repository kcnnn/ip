const INSPECTION_STORE_KEY = 'apex_inspection_record_v1';

function readInspectionRecord() {
    try {
        return JSON.parse(localStorage.getItem(INSPECTION_STORE_KEY)) || {
            startedAt: new Date().toISOString(), photos: {}, absences: {}, notes: {}
        };
    } catch {
        return { startedAt: new Date().toISOString(), photos: {}, absences: {}, notes: {} };
    }
}

function writeInspectionRecord(record) {
    record.updatedAt = new Date().toISOString();
    try { localStorage.setItem(INSPECTION_STORE_KEY, JSON.stringify(record)); } catch (error) {
        console.warn('Unable to save full inspection record locally.', error);
    }
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
    async recordPhoto(section, label, dataUrl, details = {}) {
        const record = readInspectionRecord();
        const id = `${section}:${label}`;
        record.photos[id] = {
            section, label, capturedAt: new Date().toISOString(),
            thumbnail: await makeThumbnail(dataUrl), ...details
        };
        delete record.absences[id];
        writeInspectionRecord(record);
    },
    removePhoto(section, label) {
        const record = readInspectionRecord();
        delete record.photos[`${section}:${label}`];
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
