document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('brittleForm');
    let savedId;
    form.addEventListener('submit', event => {
        event.preventDefault();
        if (!form.reportValidity()) return;
        const values = Object.fromEntries(new FormData(form));
        try {
            savedId = InspectionStore.saveObservation({id: savedId, section: 'Shingles', location: values.location.trim(), component: 'Shingles', details: `Brittle test — ${values.result}. ${values.details.trim()}`, brittleTest: {result: values.result}, damageTypes: []}, {clearDraft: false});
            document.getElementById('brittleStatus').textContent = 'Saved to the report. Edit or delete this observation in the workspace.';
        } catch { document.getElementById('brittleStatus').textContent = 'Could not save. Keep this page open and retry.'; }
    });
    document.getElementById('brittlePhoto').onclick = () => {
        const draft = InspectionStore.get().notes.fieldDraft;
        if (draft && (draft.details || draft.photoId) && !confirm('Open a new test-photo note? Your unfinished editor draft will be replaced; saved photos and observations remain.')) return;
        InspectionField.editNote({section:'Shingles',location:form.elements.location.value,component:'Shingles'});
        document.getElementById('fieldCamera').focus();
    };
});
