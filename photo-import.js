// Files are decoded on-device. Only the existing Analyze action sends a photo to AI.
// Accommodate large iPhone captures; retain a bound for mobile decode memory.
const maxBytes = 100 * 1024 * 1024;
function readDataUrl(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('The photo could not be read. Please select it again.'));
        reader.readAsDataURL(blob);
    });
}
function withTimeout(promise, message) {
    let timer;
    return Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(message)), 60000); })]).finally(() => clearTimeout(timer));
}
export async function preparePhoto(file, progress = () => {}) {
    if (!file.size) throw new Error('This photo is empty. Select another file.');
    if (file.size > maxBytes) throw new Error('This photo is over 100 MB, the per-photo browser safety limit. Choose a smaller copy.');
    // Inspect bytes, not File.type: some browsers supply an empty or generic MIME type.
    const bytes = new Uint8Array(await file.slice(0, 64).arrayBuffer());
    const ascii = (a, b) => String.fromCharCode(...bytes.slice(a, b));
    let type;
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) type = 'image/jpeg';
    else if ([137,80,78,71,13,10,26,10].every((value, i) => bytes[i] === value)) type = 'image/png';
    else if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') type = 'image/webp';
    const heic = ascii(4, 8) === 'ftyp' && /heic|heix|hevc|hevx|mif1|msf1/.test(ascii(8, 64));
    let blob;
    if (heic) {
        progress('Preparing your iPhone photo… converting HEIC on this device.');
        try {
            blob = await withTimeout(import('./vendor/heic-to-1.5.2/dist/csp/heic-to.js').then(({ heicTo }) => heicTo({blob:file, type:'image/jpeg', quality:0.95})), 'HEIC conversion took too long. Please try again.');
        } catch {
            throw new Error('This HEIC photo could not be converted. Your note is safe. Retry, or export this photo as JPEG from Photos.');
        }
    } else if (type) blob = new Blob([file], { type });
    else throw new Error('Choose an iPhone HEIC/HEIF, JPEG, PNG or WebP photo. This file is not a supported image.');
    // Validate decoding before saving, so corrupt files cannot create stuck photo records.
    const dataUrl = await readDataUrl(blob);
    await withTimeout(new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => image.naturalWidth && image.naturalHeight ? resolve() : reject(new Error('Photo is empty.'));
        image.onerror = () => reject(new Error('This photo is damaged or cannot be opened. Please choose another copy.'));
        image.src = dataUrl;
    }), 'Opening the photo took too long. Please try again.');
    return {dataUrl, convertedFrom: heic ? 'HEIC/HEIF' : null, sourceName: file.name};
}
