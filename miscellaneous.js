document.addEventListener('DOMContentLoaded',()=>{
    const {escape,narrative}=InspectionField;
    document.getElementById('miscAdd').onclick=()=>{
        const draft=InspectionStore.get().notes.fieldDraft;
        if(draft && !draft.id && (draft.details || draft.photoId) && !confirm('Start a new miscellaneous note? Your unfinished editor draft will be replaced; saved photos and notes remain.'))return;
        InspectionField.editNote({section:'Miscellaneous'});
        document.getElementById('fieldCamera').focus();
    };
    const render=()=>{
        const record=InspectionStore.get(),photos=Object.entries(record.photos).filter(([,p])=>p.section==='Miscellaneous'),notes=Object.values(record.observations).filter(n=>n.section==='Miscellaneous');
        document.getElementById('miscItems').innerHTML=photos.map(([id,p])=>`<article class="field-section-card">${p.thumbnail?`<img src="${escape(p.thumbnail)}" alt="${escape(p.label)}" style="width:100%;height:180px;object-fit:contain">`:''}<h3>${escape(p.label)}</h3><button type="button" class="field-button" data-misc-photo="${escape(id)}">Add note to photo</button><a href="inspection-review.html">Review / delete</a></article>`).join('')+notes.map(n=>`<article class="field-section-card"><p>${escape(narrative(n))}</p><button type="button" class="field-button" data-misc-note="${escape(n.id)}">Edit note</button><a href="inspection-review.html">Review / delete</a></article>`).join('')+(!photos.length&&!notes.length?'<p>No miscellaneous photos or notes yet. Add as many as you need.</p>':'');
    };
    document.getElementById('miscItems').onclick=event=>{
        const photo=event.target.closest('[data-misc-photo]'),note=event.target.closest('[data-misc-note]');
        if(!photo&&!note)return;
        const draft=InspectionStore.get().notes.fieldDraft;
        if(draft&&!draft.id&&(draft.details||draft.photoId)&&!confirm('Replace the unfinished editor draft? Saved photos and observations remain.'))return;
        InspectionField.editNote(note?InspectionStore.get().observations[note.dataset.miscNote]:{section:'Miscellaneous',photoId:photo.dataset.miscPhoto});
    };
    window.addEventListener('inspection-record-changed',render);render();
});
