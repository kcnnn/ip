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
    const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
    const options = values => values.map(value => `<option>${escape(value)}</option>`).join('');
    const narrative = note => {
        const parts = [`${note.section} / ${note.location || 'Location unspecified'} — ${note.component || 'Component unspecified'}: ${note.condition}.`];
        if (['Observed damage', 'Suspected damage'].includes(note.condition)) {
            if (note.damageTypes?.length) parts.push(`Damage type: ${note.damageTypes.join(', ')}.`);
            if (note.severity && note.severity !== 'Not assessed') parts.push(`Severity: ${note.severity.toLowerCase()}.`);
        }
        if (note.quantity && note.unit) parts.push(`Recorded measurement/count: ${note.quantity} ${note.unit}.`);
        if (note.details?.trim()) parts.push(note.details.trim());
        return parts.join(' ');
    };
    const currentSection = () => sections.find(section => location.pathname.endsWith(section[1]))?.[0] || 'Elevations';
    window.InspectionField = { sections, escape, narrative, currentSection };

    function formMarkup() {
        return `<form id="fieldNoteForm" class="field-form">
            <input type="hidden" name="id">
            <div class="field-form-grid">
                <label>Section<select name="section">${options(sections.map(s => s[0]))}</select></label>
                <label>Location / slope<input name="location" maxlength="120" placeholder="e.g. Back slope, east corner" required></label>
                <label>Component<select name="component">${options(['Shingles', 'Gutter', 'Downspout', 'Drip edge', 'Underlayment', 'Ridge', 'Vent', 'Flashing', 'Siding', 'Chimney', 'Other'])}</select></label>
                <label>Observation<select name="condition">${options(['Not inspected', 'Observed damage', 'Suspected damage', 'No visible damage', 'Not present'])}</select></label>
            </div>
            <fieldset id="fieldDamageChoices"><legend>Damage selections</legend><div class="field-chips">${['Hail / impact', 'Wind / lifted shingle', 'Missing material', 'Cracking', 'Dent / deformation', 'Granule loss', 'Wear / deterioration', 'Leak / staining', 'Other'].map(type => `<label><input type="checkbox" name="damageType" value="${escape(type)}"><span>${escape(type)}</span></label>`).join('')}</div></fieldset>
            <div class="field-form-grid">
                <label>Severity<select name="severity">${options(['Not assessed', 'Minor', 'Moderate', 'Severe'])}</select></label>
                <label>Link to a saved photo<select name="photoId"><option value="">No photo linked</option></select></label>
                <label>Measurement or count<input name="quantity" type="number" min="0" step="any" placeholder="e.g. 6"></label>
                <label>Unit<select name="unit"><option value="">Not measured</option>${options(['inches', 'feet', 'square feet', 'marked hits', 'items'])}</select></label>
            </div>
            <label>Field notes<textarea name="details" rows="4" maxlength="12000" placeholder="Describe what you observed. Type or dictate; review the wording before saving."></textarea></label>
            <div class="field-voice"><button type="button" id="fieldDictate" class="field-button">Start dictation</button><span id="fieldVoiceStatus" role="status"></span></div>
            <p class="field-help" id="fieldVoiceHelp">Dictation uses your browser’s speech service and may send audio to that provider. Starts only when you click; you can also type or use your device’s keyboard microphone.</p>
            <div class="field-preview"><span class="field-eyebrow">CONSISTENT NOTE PREVIEW</span><p id="fieldNarrative"></p></div>
            <div class="field-actions"><button type="submit" class="field-button field-primary">Save observation</button><button type="button" id="fieldNewNote" class="field-button">New / clear draft</button><span id="fieldSaveStatus" role="status"></span></div>
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
        let recognition, listening = false, dictated = false, voiceSession = 0;
        const readForm = () => ({
            id: field('id').value || undefined, section: field('section').value,
            location: field('location').value.trim(), component: field('component').value,
            condition: field('condition').value, severity: field('severity').value,
            damageTypes: [...form.querySelectorAll('[name="damageType"]:checked')].map(input => input.value),
            quantity: field('quantity').value, unit: field('unit').value,
            details: field('details').value, photoId: field('photoId').value, dictated
        });
        const refreshPhotos = () => {
            const selected = field('photoId').value;
            field('photoId').innerHTML = '<option value="">No photo linked</option>' + Object.entries(InspectionStore.get().photos).map(([id, photo]) => `<option value="${escape(id)}">${escape(photo.section)} · ${escape(photo.label)}</option>`).join('');
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
        function loadNote(note = {}) {
            voiceSession++;
            recognition?.abort();
            listening = false;
            form.querySelector('[type="submit"]').disabled = false;
            document.getElementById('fieldDictate').textContent = 'Start dictation';
            form.reset(); dictated = !!note.dictated;
            refreshPhotos();
            field('section').value = note.section || currentSection();
            for (const key of ['id', 'location', 'component', 'condition', 'severity', 'quantity', 'unit', 'details', 'photoId']) {
                if (note[key] !== undefined) field(key).value = note[key];
            }
            form.querySelectorAll('[name="damageType"]').forEach(input => { input.checked = (note.damageTypes || []).includes(input.value); });
            update(false);
        }
        window.InspectionField.editNote = note => {
            loadNote(note);
            const notebook = document.getElementById('fieldNotebook'); if (notebook) notebook.open = true;
            form.scrollIntoView({ behavior: 'smooth', block: 'start' }); field('location').focus();
        };
        refreshPhotos();
        loadNote(InspectionStore.get().notes.fieldDraft || {});
        form.addEventListener('input', () => update());
        form.addEventListener('submit', event => {
            event.preventDefault();
            const note = readForm();
            if (!!note.quantity !== !!note.unit) {
                document.getElementById('fieldSaveStatus').textContent = 'Enter both a measurement/count and its unit, or leave both empty.'; return;
            }
            recognition?.stop();
            try {
                const id = InspectionStore.saveObservation(note); field('id').value = id;
                document.getElementById('fieldSaveStatus').textContent = 'Observation saved on this device';
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
            recognition = new Speech(); recognition.lang = 'en-US'; recognition.continuous = true; recognition.interimResults = true;
            recognition.onstart = () => { listening = true; form.querySelector('[type="submit"]').disabled = true; dictate.textContent = 'Stop dictation'; voice.textContent = 'Listening… Stop dictation before saving.'; };
            recognition.onresult = event => {
                if (session !== voiceSession) return;
                let interim = '';
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const text = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        field('details').value = `${field('details').value.trim()} ${text}`.trim(); dictated = true; update();
                    } else interim += text;
                }
                voice.textContent = interim || 'Listening…';
            };
            recognition.onerror = event => {
                if (session !== voiceSession) return;
                listening = false; form.querySelector('[type="submit"]').disabled = false; dictate.textContent = 'Start dictation';
                voice.textContent = `Dictation stopped (${event.error}). Your typed notes are kept; try again or type.`;
            };
            recognition.onend = () => {
                if (session !== voiceSession) return;
                listening = false; form.querySelector('[type="submit"]').disabled = false; dictate.textContent = 'Start dictation';
                if (!voice.textContent.startsWith('Dictation stopped')) voice.textContent = 'Stopped. Review the text before saving.';
            };
            listening = true; dictate.textContent = 'Stop dictation'; form.querySelector('[type="submit"]').disabled = true;
            try { recognition.start(); } catch {
                listening = false; dictate.textContent = 'Start dictation'; form.querySelector('[type="submit"]').disabled = false;
                voice.textContent = 'Could not start the microphone. Type or try again.';
            }
        });
        document.addEventListener('visibilitychange', () => { if (document.hidden) recognition?.stop(); });
        window.addEventListener('pagehide', () => recognition?.abort());
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
                const record = InspectionStore.get();
                const photos = Object.values(record.photos);
                document.getElementById('fieldRecordCount').textContent = `${photos.length} photos · ${Object.keys(record.observations).length} observations`;
                document.getElementById('fieldSections').innerHTML = sections.map(([name, url, items], i) => {
                    const count = photos.filter(photo => photo.section === name).length;
                    const notes = Object.values(record.observations).filter(note => note.section === name).length;
                    const status = record.sectionStates[name]?.status || 'Not reviewed';
                    return `<article class="field-section-card"><div class="field-card-top"><span class="field-number">${String(i + 1).padStart(2, '0')}</span><span class="field-status">${escape(status)}</span></div><h2><a href="${url}">${escape(name)} <span aria-hidden="true">↗</span></a></h2><p>${count} photos · ${notes} notes</p><div class="field-step-links">${items.map((label, index) => {
                        const present = record.photos[`${name}:${label}`];
                        const absent = record.absences[`${name}:${label}`] || record.absences[`${name}:${label.toLowerCase()}`];
                        return `<a href="${url}?item=${index}">${escape(label)}<span>${present?.storageStatus === 'failed' ? 'Save failed' : present ? 'Captured' : absent ? 'Not present' : 'No photo'}</span></a>`;
                    }).join('')}</div><button class="field-text-button" data-note-section="${escape(name)}">+ Add observation</button><label class="field-review-label">Inspector review<select data-review-section="${escape(name)}">${['Not reviewed', 'In progress', 'Reviewed'].map(value => `<option ${status === value ? 'selected' : ''}>${value}</option>`).join('')}</select></label></article>`;
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
            document.getElementById('fieldSections').addEventListener('change', event => {
                if (event.target.dataset.reviewSection) InspectionStore.sectionState(event.target.dataset.reviewSection, event.target.value);
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
