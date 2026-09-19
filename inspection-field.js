/* Shared field notebook. All findings here are inspector-entered, not AI conclusions. */
(() => {
    const sections = [
        ['Elevations', 'elevation-photos.html', ['Front Elevation', 'Right Elevation', 'Rear Elevation', 'Left Elevation']],
        ['Roof edge', 'roof-edge.html', ['Gutter Measurement', 'Underlayment Inspection']],
        ['Ridge', 'ridge-inspection.html', ['Ridge Closeup', 'Under-Ridge Inspection']],
        ['Roof overview', 'roof-overview.html', ['Front Overview', 'Right Overview', 'Rear Overview', 'Left Overview']],
        ['Accessories', 'roof-accessories.html', []],
        ['Hail documentation', 'hail-test-square.html', ['Test Square Full View', 'Hail Hit Closeup 1', 'Hail Hit Closeup 2', 'Hail Hit Closeup 3']],
        ['Interview', 'insured-interview.html', []]
    ];
    const componentsBySection = {
        'Elevations': ['Siding', 'Window', 'Window screen', 'Door', 'Overhead door', 'Downspout', 'Trim', 'Fascia', 'Soffit', 'Brick / masonry', 'Stucco', 'Exterior light', 'Exterior vent', 'Other'],
        'Roof edge': ['Gutter', 'Downspout', 'Drip edge', 'Underlayment', 'Fascia', 'Soffit', 'Flashing', 'Shingles', 'Other'],
        'Ridge': ['Ridge shingles / caps', 'Ridge vent', 'Underlayment', 'Flashing', 'Other'],
        'Roof overview': ['Shingles', 'Roof covering', 'Ridge', 'Valley', 'Flashing', 'Vent', 'Chimney', 'Other'],
        'Accessories': ['Vent', 'Pipe boot', 'Rain cap', 'Rain diverter', 'Satellite dish', 'Chimney', 'Skylight', 'Flashing', 'Other'],
        'Hail documentation': ['Shingles', 'Roof covering', 'Ridge shingles / caps', 'Metal roof panel', 'Flashing', 'Vent', 'Other'],
        'Interview': ['General property', 'Roof', 'Exterior wall', 'Gutter', 'Downspout', 'Window', 'Door', 'Interior', 'Other']
    };
    const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
    const options = values => values.map(value => `<option>${escape(value)}</option>`).join('');
    const narrative = note => {
        const parts = [`${note.section} / ${note.elevationKey ? `${note.elevationKey} elevation · ` : ''}${note.location || 'Location unspecified'} — ${note.component || 'Component unspecified'}: ${note.condition || 'Observation unspecified'}.`];
        if (['Observed damage', 'Suspected damage'].includes(note.condition)) {
            if (note.damageTypes?.length) parts.push(`Damage type: ${note.damageTypes.join(', ')}.`);
            if (note.severity && note.severity !== 'Not assessed') parts.push(`Severity: ${note.severity.toLowerCase()}.`);
        }
        if (note.quantity && note.unit) parts.push(`Recorded measurement/count: ${note.quantity} ${note.unit}.`);
        if (note.details?.trim()) parts.push(note.details.trim());
        return parts.join(' ');
    };
    const currentSection = () => sections.find(section => location.pathname.endsWith(section[1]))?.[0] || 'Elevations';
    const sectionProgress = (record, section) => {
        const hasPhoto = Object.values(record.photos || {}).some(photo => photo.section === section && !['saving', 'failed'].includes(photo.storageStatus));
        const hasNote = Object.values(record.observations || {}).some(note => note.section === section);
        const hasAbsence = Object.values(record.absences || {}).some(item => item.section === section);
        const hasInterview = section === 'Interview' && !!record.notes?.insuredInterview;
        return hasPhoto || hasNote || hasAbsence || hasInterview ? 'In progress' : 'Not started';
    };
    window.InspectionField = { sections, escape, narrative, currentSection, sectionProgress };

    function formMarkup() {
        return `<form id="fieldNoteForm" class="field-form">
            <input type="hidden" name="id">
            <p id="fieldElevationContext" class="field-preview" hidden></p>
            <section class="field-dictation-first field-photo-first" aria-label="Observation photo">
                <span class="field-eyebrow">01 / CAPTURE THE DETAIL</span>
                <h3>Start with a photo.</h3>
                <p class="field-help">One detail, one story. Take a photo where you are, or choose one already saved.</p>
                <div class="field-actions"><button type="button" class="field-button field-primary" id="fieldCamera">Take a photo</button><button type="button" class="field-button" id="fieldUpload">Upload photo</button></div>
                <input type="file" id="fieldCameraInput" accept="image/*,.heic,.heif" capture="environment" hidden>
                <input type="file" id="fieldUploadInput" accept="image/*,.heic,.heif" hidden>
                <label>Photo for this observation<select name="photoId"><option value="">No photo — text-only note</option></select></label>
                <img id="fieldPhotoPreview" alt="Photo linked to this observation" hidden>
                <p id="fieldPhotoStatus" role="status" class="field-help"></p>
            </section>
            <section class="field-dictation-first" aria-label="Dictate your observation">
                <span class="field-eyebrow">02 / TELL THE STORY</span>
                <h3>Describe what you’re looking at.</h3>
                <p class="field-help">Speak naturally. Include the location, component, damage or lack of damage, and any measurement. Your words stay intact.</p>
                <div class="field-recall" aria-label="Things to cover"><span>Where is it?</span><span>Which component?</span><span>Damage or no damage?</span><span>How severe?</span><span>Size or count?</span></div>
                <p class="field-help">For example: “Front elevation, window screen. Moderate wear and deterioration. Two screens affected.”</p>
                <div class="field-voice"><button type="button" id="fieldDictate" class="field-button field-primary">Start dictation</button><span id="fieldVoiceStatus" role="status"></span></div>
                <label>Your observation<textarea name="details" rows="4" maxlength="12000" placeholder="Dictate or type what you see. Your original words stay here."></textarea></label>
                <div class="field-voice"><button type="button" id="fieldFill" class="field-button field-primary">Analyze photo &amp; note</button><span id="fieldFillStatus" role="status"></span></div>
                <p class="field-help" id="fieldVoiceHelp">Dictation uses your browser’s speech service. Analyze sends the selected photo and your note to your configured AI provider. Without a photo, only your words are organized. Review the result, then add it to your report.</p>
            </section>
            <div class="field-extraction-heading"><span class="field-eyebrow">03 / REVIEW &amp; ADD TO REPORT</span><p class="field-help">Your words become consistent fields. AI photo findings are kept separately so you can see what agrees and what needs attention.</p></div>
            <div id="fieldPhotoReview" class="field-preview" hidden role="status"></div>
            <div class="field-form-grid">
                <label>Section<select name="section">${options(sections.map(s => s[0]))}</select></label>
                <label>Location / slope<input name="location" maxlength="120" placeholder="e.g. Back slope, east corner" required></label>
                <label>Component<select name="component" required><option value="">Select a component…</option></select></label>
                <label>Observation<select name="condition" required><option value="">Select observation…</option>${options(['Not inspected', 'Observed damage', 'Suspected damage', 'No visible damage', 'Not present', 'Measurement recorded'])}</select></label>
            </div>
            <fieldset id="fieldDamageChoices"><legend>Damage selections</legend><div class="field-chips">${['Hail / impact', 'Wind / lifted shingle', 'Missing material', 'Cracking', 'Dent / deformation', 'Granule loss', 'Wear / deterioration', 'Leak / staining', 'Other'].map(type => `<label><input type="checkbox" name="damageType" value="${escape(type)}"><span>${escape(type)}</span></label>`).join('')}</div></fieldset>
            <div class="field-form-grid">
                <label>Severity<select name="severity">${options(['Not assessed', 'Minor', 'Moderate', 'Severe'])}</select></label>
                <label>Measurement or count<input name="quantity" type="number" min="0" step="any" placeholder="e.g. 6"></label>
                <label>Unit<select name="unit"><option value="">Not measured</option>${options(['inches', 'feet', 'square feet', 'marked hits', 'items', 'mm', 'cm'])}</select></label>
            </div>
            <div class="field-preview"><span class="field-eyebrow">CONSISTENT NOTE PREVIEW</span><p id="fieldNarrative"></p></div>
            <div class="field-actions"><button type="submit" class="field-button field-primary">Add to report</button><button type="button" id="fieldNewNote" class="field-button">New / clear draft</button><span id="fieldSaveStatus" role="status"></span></div>
            <div id="fieldElevationActions" class="field-actions" hidden><button type="button" id="fieldAnotherDetail" class="field-button">Add another detail photo</button><button type="button" id="fieldReturnElevation" class="field-button">Back to elevation</button></div>
        </form>`;
    }

    document.addEventListener('DOMContentLoaded', () => {
        const workspace = document.getElementById('fieldWorkspace');
        if (!workspace) {
            const tools = document.createElement('aside');
            tools.className = 'field-toolbar';
            tools.innerHTML = `<nav aria-label="Inspection workspace"><a href="inspection-workspace.html">← Inspection workspace</a><label>Jump to section<select id="fieldJump"><option value="">Choose section…</option>${sections.map(s => `<option value="${s[1]}">${escape(s[0])}</option>`).join('')}</select></label><a href="inspection-review.html">Review record</a></nav><details id="fieldNotebook"><summary>Field notebook · type or dictate an observation</summary><div id="fieldNoteMount"></div></details>`;
            document.body.prepend(tools);
            document.getElementById('fieldJump').addEventListener('change', async event => {
                if (!event.target.value) return;
                const results = await InspectionStore.flush();
                if (results.some(result => result === false)) return;
                location.href = event.target.value;
            });
        }
        const error = document.createElement('div');
        error.className = 'field-save-error'; error.hidden = true; error.setAttribute('role', 'alert');
        document.body.prepend(error);
        window.addEventListener('inspection-save-error', event => { error.textContent = event.detail; error.hidden = false; });
        document.getElementById('fieldNoteMount').innerHTML = formMarkup();
        const form = document.getElementById('fieldNoteForm');
        const field = name => form.elements.namedItem(name);
        function refreshComponents(selected = '', preserveSaved = false) {
            const choices = componentsBySection[field('section').value] || ['Other'];
            field('component').innerHTML = '<option value="">Select a component…</option>' + options(choices);
            // Keep historical observations intact, without offering roof items for new wall notes.
            if (selected && preserveSaved && !choices.includes(selected)) {
                field('component').add(new Option(`${selected} (previously saved)`, selected));
            }
            field('component').value = choices.includes(selected) || preserveSaved ? selected : '';
            field('location').placeholder = field('section').value === 'Elevations' ? 'e.g. Front wall, right of entry door' : 'e.g. Back slope, east corner';
        }
        let recognition, listening = false, dictated = false, voiceSession = 0;
        let fillGeneration = 0, filling = false, manualFields = false, aiReview = null, photoGeneration = 0, capturing = false, elevationKey = null;
        const elevationName = key => `${key.charAt(0).toUpperCase()}${key.slice(1)} Elevation`;
        const renderReview = () => {
            const panel = document.getElementById('fieldPhotoReview');
            panel.hidden = !aiReview;
            const labels = { supports_note: 'Photo supports your note', needs_detail: 'More detail would help', conflicts_with_note: 'Photo and note may disagree', unable_to_assess: 'Photo could not be assessed' };
            panel.innerHTML = aiReview ? `<strong>AI photo review · ${escape(labels[aiReview.status])}</strong><p>${escape(aiReview.summary)}</p><ul>${aiReview.checks.map(item => `<li>${escape(item)}</li>`).join('')}</ul>` : '';
        };
        async function previewPhoto() {
            const generation = ++photoGeneration;
            const id = field('photoId').value;
            const img = document.getElementById('fieldPhotoPreview');
            img.hidden = true;
            document.getElementById('fieldFill').textContent = elevationKey ? 'Analyze & save detail' : id ? 'Analyze photo & note' : 'Fill fields from note';
            const photo = id ? await InspectionStore.getPhoto(id).catch(() => null) : null;
            if (generation !== photoGeneration) return;
            if (photo) { img.src = photo; img.hidden = false; }
            document.getElementById('fieldPhotoStatus').textContent = id ? (photo ? 'Photo ready. Describe it below.' : 'Original photo unavailable. Upload it again to analyze.') : 'A photo is optional for text-only observations.';
        }
        const readForm = () => ({
            id: field('id').value || undefined, section: field('section').value,
            location: field('location').value.trim(), component: field('component').value,
            condition: field('condition').value, severity: field('severity').value,
            damageTypes: [...form.querySelectorAll('[name="damageType"]:checked')].map(input => input.value),
            quantity: field('quantity').value, unit: field('unit').value,
            details: field('details').value, photoId: field('photoId').value, dictated, aiReview, elevationKey,
            parentPhotoId: elevationKey ? `Elevations:${elevationName(elevationKey)}` : null
        });
        const refreshPhotos = () => {
            const selected = field('photoId').value;
            field('photoId').innerHTML = '<option value="">No photo — text-only note</option>' + Object.entries(InspectionStore.get().photos).filter(([,photo]) => !elevationKey || photo.elevationKey === elevationKey).map(([id, photo]) => `<option value="${escape(id)}">${escape(photo.section)} · ${escape(photo.label)}</option>`).join('');
            if ([...field('photoId').options].some(option => option.value === selected)) field('photoId').value = selected;
            else if (selected) {
                field('photoId').add(new Option('Previously linked photo — removed', selected));
                field('photoId').value = selected;
            }
        };
        const update = (save = true) => {
            const hasDamage = ['Observed damage', 'Suspected damage'].includes(field('condition').value);
            document.getElementById('fieldDamageChoices').disabled = !hasDamage;
            field('severity').disabled = !hasDamage;
            if (!hasDamage) {
                form.querySelectorAll('[name="damageType"]').forEach(input => { input.checked = false; });
                field('severity').value = 'Not assessed';
            }
            document.getElementById('fieldNarrative').textContent = narrative(readForm());
            if (save) {
                try { InspectionStore.note('fieldDraft', readForm()); document.getElementById('fieldSaveStatus').textContent = 'Draft saved on this device'; }
                catch { document.getElementById('fieldSaveStatus').textContent = 'Draft not saved'; }
            }
        };
        async function fillFromNote(automatic = false) {
            if (filling || listening || capturing) return;
            if (automatic && field('photoId').value) return;
            const status = document.getElementById('fieldFillStatus');
            const text = field('details').value.trim();
            if (!text) { status.textContent = 'Dictate or type an observation first.'; return; }
            if (elevationKey && !field('photoId').value) { status.textContent = 'Take or upload a close-up photo first.'; return; }
            if (manualFields) {
                if (automatic) { status.textContent = 'Your existing selections were kept. Click Fill fields from note to replace them with this dictation.'; return; }
                if (!confirm('Replace the current detail selections using this note? Your transcript and photo link will be kept.')) return;
            }
            const generation = ++fillGeneration;
            const snapshot = JSON.stringify(readForm());
            filling = true;
            document.getElementById('fieldFill').disabled = true;
            document.getElementById('fieldDictate').disabled = true;
            form.querySelector('[type="submit"]').disabled = true;
            status.textContent = field('photoId').value ? 'Reviewing the photo and organizing your note…' : 'Organizing your note…';
            let timeout;
            try {
                const photoId = field('photoId').value;
                const revision = InspectionStore.get().photos[photoId]?.revision;
                const photo = photoId ? await InspectionStore.getPhoto(photoId) : null;
                if (photoId && !photo) throw new Error('Original photo unavailable. Upload it again; your note is kept.');
                const result = await Promise.race([
                    ObservationExtraction.extract(text, componentsBySection, field('section').value, photo),
                    new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error('AI review timed out. Your photo and note are kept; retry.')), 60000); })
                ]);
                if (generation !== fillGeneration) return;
                if (photoId && InspectionStore.get().photos[photoId]?.revision !== revision) throw new Error('The photo changed during analysis. Analyze again.');
                if (JSON.stringify(readForm()) !== snapshot) { status.textContent = 'You changed this note while it was being organized. Your changes were kept; click Fill fields to try again.'; return; }
                const extracted = photo ? result.fields : result;
                if (elevationKey && extracted.location) {
                    const otherElevation = /\b(front|right|rear|back|left)\s+(?:elevation|wall)\b/i.exec(extracted.location)?.[1]?.toLowerCase();
                    if (otherElevation && (otherElevation === 'back' ? 'rear' : otherElevation) !== elevationKey) throw new Error('The location in your note is a different elevation. Check the note or open the correct elevation before saving.');
                }
                aiReview = photo ? { ...result.review, photoId, revision, transcript: field('details').value, reviewedAt: new Date().toISOString() } : null;
                renderReview();
                if (elevationKey && extracted.section && extracted.section !== 'Elevations') throw new Error('Your note describes a different inspection section. Check the note before saving this elevation detail.');
                field('section').value = elevationKey ? 'Elevations' : extracted.section || field('section').value;
                refreshComponents(extracted.component || '');
                for (const key of ['location', 'condition', 'severity', 'quantity', 'unit']) field(key).value = extracted[key] || (key === 'severity' ? 'Not assessed' : '');
                if (elevationKey && !field('location').value) field('location').value = elevationName(elevationKey);
                form.querySelectorAll('[name="damageType"]').forEach(input => { input.checked = (extracted.damageTypes || []).includes(input.value); });
                manualFields = false;
                update();
                const missing = ['location', 'component', 'condition'].filter(key => !field(key).value);
                status.textContent = `Details filled from your note. Review before saving.${missing.length ? ` Still needed: ${missing.join(', ')}.` : ''}`;
                if (elevationKey && !missing.length) {
                    const id = InspectionStore.saveObservation(readForm()); field('id').value = id;
                    status.textContent = `Saved to ${elevationName(elevationKey)}. Review the AI findings below; you can edit this note or add another detail photo.`;
                    document.getElementById('fieldSaveStatus').textContent = 'Photo, dictation and AI review added to the report.';
                }
            } catch (error) {
                if (generation === fillGeneration) status.textContent = error.message || 'Auto-fill unavailable. Your note is kept.';
            } finally {
                clearTimeout(timeout);
                if (generation === fillGeneration) {
                    filling = false;
                    document.getElementById('fieldFill').disabled = false;
                    document.getElementById('fieldDictate').disabled = !(window.SpeechRecognition || window.webkitSpeechRecognition);
                    form.querySelector('[type="submit"]').disabled = listening;
                }
            }
        }
        function loadNote(note = {}) {
            fillGeneration++; filling = false;
            manualFields = !!(note.id || note.location || note.component || note.condition || note.quantity);
            document.getElementById('fieldFill').disabled = false;
            document.getElementById('fieldFillStatus').textContent = '';
            document.getElementById('fieldDictate').disabled = !(window.SpeechRecognition || window.webkitSpeechRecognition);
            voiceSession++;
            recognition?.abort();
            listening = false;
            form.querySelector('[type="submit"]').disabled = false;
            document.getElementById('fieldDictate').textContent = 'Start dictation';
            form.reset(); dictated = !!note.dictated;
            // Hidden input values also change their reset default; clear explicitly.
            field('id').value = note.id || '';
            elevationKey = ['front', 'right', 'rear', 'left'].includes(note.elevationKey) ? note.elevationKey : null;
            field('section').disabled = !!elevationKey;
            document.getElementById('fieldElevationContext').hidden = !elevationKey;
            document.getElementById('fieldElevationContext').textContent = elevationKey ? `${elevationName(elevationKey)} · Detail photo. Analyze saves your photo, original note and separate AI findings together. Check any disagreements before relying on the result.` : '';
            document.getElementById('fieldElevationActions').hidden = !elevationKey;
            aiReview = note.aiReview || null; renderReview();
            refreshPhotos();
            field('section').value = elevationKey ? 'Elevations' : note.section || currentSection();
            refreshComponents(note.component || '', true);
            for (const key of ['id', 'location', 'component', 'condition', 'severity', 'quantity', 'unit', 'details', 'photoId']) {
                if (note[key] !== undefined) field(key).value = note[key];
            }
            form.querySelectorAll('[name="damageType"]').forEach(input => { input.checked = (note.damageTypes || []).includes(input.value); });
            update(false);
            previewPhoto();
        }
        window.InspectionField.editNote = note => {
            loadNote(note);
            const notebook = document.getElementById('fieldNotebook'); if (notebook) notebook.open = true;
            form.scrollIntoView({ behavior: 'smooth', block: 'start' }); field('details').focus({ preventScroll: true });
        };
        window.InspectionField.startElevationDetail = key => {
            if (!['front', 'right', 'rear', 'left'].includes(key) || capturing || filling || listening) return;
            if (!field('id').value && (field('details').value.trim() || field('photoId').value) && !confirm('Start a new detail? The current unfinished note will be replaced; uploaded photos stay in the record.')) return;
            loadNote({section:'Elevations', elevationKey:key}); update();
            const notebook = document.getElementById('fieldNotebook'); if (notebook) notebook.open = true;
            form.scrollIntoView({behavior:'smooth', block:'start'});
        };
        document.getElementById('fieldAnotherDetail').addEventListener('click', () => InspectionField.startElevationDetail(elevationKey));
        document.getElementById('fieldReturnElevation').addEventListener('click', () => {
            document.getElementById('elevationDetailPanel')?.scrollIntoView({behavior:'smooth', block:'start'});
        });
        refreshPhotos();
        loadNote(InspectionStore.get().notes.fieldDraft || {});
        import('./jev-assistant.js').then(({mountJevAssistant}) => mountJevAssistant(form, readForm)).catch(() => {
            // The optional integration must never block capture or note saving.
        });
        for (const kind of ['Camera', 'Upload']) {
            const input = document.getElementById(`field${kind}Input`);
            document.getElementById(`field${kind}`).addEventListener('click', () => input.click());
            input.addEventListener('change', async () => {
                const file = input.files[0];
                if (!file || capturing) return;
                const status = document.getElementById('fieldPhotoStatus');
                capturing = true;
                const generation = fillGeneration;
                status.textContent = 'Saving your photo…';
                form.querySelector('[type="submit"]').disabled = true;
                document.getElementById('fieldFill').disabled = true;
                for (const name of ['Camera', 'Upload']) document.getElementById(`field${name}`).disabled = true;
                try {
                    const { preparePhoto } = await import('./photo-import.js');
                    const prepared = await preparePhoto(file, message => { if (generation === fillGeneration) status.textContent = message; });
                    if (generation !== fillGeneration) return;
                    const id = `observation-photo:${Date.now()}:${Math.random().toString(36).slice(2)}`;
                    const label = elevationKey ? `${elevationName(elevationKey)} · Detail · ${file.name}` : `Field photo · ${file.name}`;
                    const ok = await InspectionStore.recordPhoto(field('section').value, label, prepared.dataUrl, { id, elevationKey, parentPhotoId: elevationKey ? `Elevations:${elevationName(elevationKey)}` : null, convertedFrom: prepared.convertedFrom, sourceName: prepared.sourceName });
                    if (!ok) throw new Error('Photo could not be saved. Please try again.');
                    if (generation !== fillGeneration) return;
                    refreshPhotos(); field('photoId').value = id; aiReview = null; renderReview(); update(); await previewPhoto();
                    field('details').focus({ preventScroll: true });
                } catch (error) { if (generation === fillGeneration) status.textContent = error.message || 'Photo could not be opened. Please try again.'; }
                finally {
                    capturing = false; input.value = ''; form.querySelector('[type="submit"]').disabled = filling || listening;
                    document.getElementById('fieldFill').disabled = filling;
                    for (const name of ['Camera', 'Upload']) document.getElementById(`field${name}`).disabled = false;
                }
            });
        }
        form.addEventListener('input', event => {
            if (!event.target.name) return;
            if (['details', 'photoId'].includes(event.target.name)) { aiReview = null; renderReview(); }
            if (event.target.name === 'photoId') previewPhoto();
            if (!['details', 'section', 'photoId'].includes(event.target.name)) manualFields = true;
            if (event.target === field('section')) refreshComponents(field('component').value);
            update();
        });
        document.getElementById('fieldFill').addEventListener('click', () => fillFromNote());
        form.addEventListener('submit', event => {
            event.preventDefault();
            if (filling || capturing || listening) return;
            const note = readForm();
            if (note.aiReview && (note.aiReview.transcript !== note.details || note.aiReview.revision !== InspectionStore.get().photos[note.photoId]?.revision)) { aiReview = null; renderReview(); note.aiReview = null; }
            if (!!note.quantity !== !!note.unit) {
                document.getElementById('fieldSaveStatus').textContent = 'Enter both a measurement/count and its unit, or leave both empty.'; return;
            }
            recognition?.stop();
            try {
                const id = InspectionStore.saveObservation(note); field('id').value = id;
                document.getElementById('fieldSaveStatus').textContent = 'Added to report. Your photo, note and any AI review are linked.';
            } catch { document.getElementById('fieldSaveStatus').textContent = 'Observation not saved'; }
        });
        document.getElementById('fieldNewNote').addEventListener('click', () => {
            if (!confirm('Clear this draft and start another note? Saved observations will stay in the record.')) return;
            loadNote(); update();
        });
        const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
        const dictate = document.getElementById('fieldDictate');
        const voice = document.getElementById('fieldVoiceStatus');
        if (!Speech) { dictate.disabled = true; voice.textContent = 'Browser dictation unavailable. Type or use your keyboard microphone.'; }
        dictate.addEventListener('click', () => {
            if (listening) { recognition.stop(); return; }
            const session = ++voiceSession;
            let receivedSpeech = false, speechFailed = false;
            recognition = new Speech(); recognition.lang = 'en-US'; recognition.continuous = true; recognition.interimResults = true;
            recognition.onstart = () => { listening = true; form.querySelector('[type="submit"]').disabled = true; dictate.textContent = 'Stop dictation'; voice.textContent = 'Listening… Stop dictation before saving.'; };
            recognition.onresult = event => {
                if (session !== voiceSession) return;
                let interim = '';
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const text = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        receivedSpeech = true;
                        field('details').value = `${field('details').value.trim()} ${text}`.trim(); dictated = true; aiReview = null; renderReview(); update();
                    } else interim += text;
                }
                voice.textContent = interim || 'Listening…';
            };
            recognition.onerror = event => {
                if (session !== voiceSession) return;
                speechFailed = true;
                listening = false; form.querySelector('[type="submit"]').disabled = false; dictate.textContent = 'Start dictation';
                voice.textContent = `Dictation stopped (${event.error}). Your typed notes are kept; try again or type.`;
            };
            recognition.onend = () => {
                if (session !== voiceSession) return;
                listening = false; form.querySelector('[type="submit"]').disabled = false; dictate.textContent = 'Start dictation';
                if (!voice.textContent.startsWith('Dictation stopped')) voice.textContent = 'Stopped. Review the text before saving.';
                const shouldFill = receivedSpeech && !speechFailed && !document.hidden;
                receivedSpeech = false;
                if (shouldFill) fillFromNote(true);
            };
            listening = true; dictate.textContent = 'Stop dictation'; form.querySelector('[type="submit"]').disabled = true;
            try { recognition.start(); } catch {
                listening = false; dictate.textContent = 'Start dictation'; form.querySelector('[type="submit"]').disabled = false;
                voice.textContent = 'Could not start the microphone. Type or try again.';
            }
        });
        document.addEventListener('visibilitychange', () => { if (document.hidden) recognition?.stop(); });
        window.addEventListener('pagehide', () => { voiceSession++; fillGeneration++; recognition?.abort(); });
        window.addEventListener('inspection-record-changed', refreshPhotos);
        window.addEventListener('storage', refreshPhotos);
        // Internal navigation waits for original-photo storage, not for an AI response.
        document.addEventListener('click', async event => {
            const link = event.target.closest('a[href]');
            if (!link || event.ctrlKey || event.metaKey || !InspectionStore.isSaving()) return;
            event.preventDefault();
            if ((await InspectionStore.flush()).every(Boolean)) location.href = link.href;
        });
        if (workspace) {
            const propertyForm = document.getElementById('fieldProperty');
            const record = InspectionStore.get();
            ['address', 'claim', 'inspector'].forEach(key => { propertyForm.elements[key].value = record.property?.[key] || ''; });
            propertyForm.addEventListener('input', () => {
                InspectionStore.property(Object.fromEntries(new FormData(propertyForm)));
            });
            const render = () => {
                const expanded = new Map([...document.querySelectorAll('[data-section-details]')].map(item => [item.dataset.sectionDetails, item.open]));
                const record = InspectionStore.get();
                const photos = Object.values(record.photos);
                document.getElementById('fieldRecordCount').textContent = `${photos.length} photos · ${Object.keys(record.observations).length} observations`;
                document.getElementById('fieldSections').innerHTML = sections.map(([name, url, items], i) => {
                    const count = photos.filter(photo => photo.section === name).length;
                    const notes = Object.values(record.observations).filter(note => note.section === name).length;
                    const status = sectionProgress(record, name);
                    const open = expanded.has(name) ? expanded.get(name) : !matchMedia('(max-width:580px)').matches;
                    return `<article class="field-section-card"><div class="field-card-top"><span class="field-number">${String(i + 1).padStart(2, '0')}</span><span class="field-status">${escape(status)}</span></div><h2><a href="${url}">${escape(name)} <span aria-hidden="true">↗</span></a></h2><p>${count} photos · ${notes} notes</p><details class="field-card-details" data-section-details="${escape(name)}" ${open ? 'open' : ''}><summary>Steps & observations<span aria-hidden="true">+</span></summary><div class="field-step-links">${items.map((label, index) => {
                        const present = record.photos[`${name}:${label}`];
                        const absent = record.absences[`${name}:${label}`] || record.absences[`${name}:${label.toLowerCase()}`];
                        return `<a href="${url}?item=${index}">${escape(label)}<span>${present?.storageStatus === 'failed' ? 'Save failed' : present ? 'Captured' : absent ? 'Not present' : 'No photo'}</span></a>`;
                    }).join('')}</div><button class="field-text-button" data-note-section="${escape(name)}">+ Add observation</button></details></article>`;
                }).join('');
                const notes = Object.values(record.observations).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
                document.getElementById('fieldSavedNotes').innerHTML = notes.length ? notes.map(note => `<article class="field-saved-note"><div><span class="field-eyebrow">${escape(note.section)} · INSPECTOR NOTE</span><p>${escape(narrative(note))}</p><small>${new Date(note.updatedAt).toLocaleString()}${note.dictated ? ' · Includes dictated text' : ''}</small></div><button class="field-button" data-edit-note="${escape(note.id)}">Edit</button></article>`).join('') : '<p class="field-help">No saved observations yet. Add a note as you inspect; you can return and edit it later.</p>';
            };
            render(); window.addEventListener('inspection-record-changed', render); window.addEventListener('storage', render);
            workspace.addEventListener('click', event => {
                const edit = event.target.closest('[data-edit-note]');
                if (edit) window.InspectionField.editNote(InspectionStore.get().observations[edit.dataset.editNote]);
                const add = event.target.closest('[data-note-section]');
                if (add) {
                    if (InspectionStore.get().notes.fieldDraft && !confirm('Start a new draft here? The existing draft will be replaced; saved observations are kept.')) return;
                    window.InspectionField.editNote({ section: add.dataset.noteSection }); update();
                }
            });
            document.getElementById('fieldExport').addEventListener('click', async () => {
                await InspectionStore.flush();
                const record = InspectionStore.get();
                const blob = new Blob([JSON.stringify({ ...record, exportNote: 'Metadata and inspector notes only. Original photos remain on this device.' }, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'apex-inspection-notes.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
            });
        }
    });
})();
