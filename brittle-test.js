document.addEventListener('DOMContentLoaded', () => {
    // Move the live notebook, preserving its handlers and any unfinished draft.
    const form = document.getElementById('fieldNoteForm');
    document.getElementById('brittleCapture').append(form);
    document.getElementById('fieldNotebook')?.remove();
    const capture = form.querySelector('[aria-label="Observation photo"]');
    capture.querySelector('h3').textContent = 'Before first. Then after.';
    capture.querySelector('.field-help').textContent = 'Photograph the untouched shingle first. After an authorized test, add the result photo. Both stay with this observation; you can add more than one of each.';
    const phases = document.createElement('div');phases.className='brittle-photo-pair';
    phases.innerHTML = ['before','after'].map(phase=>`<section class="brittle-photo-slot"><h4>${phase==='before'?'1 · Before test':'2 · After test'}</h4><p>${phase==='before'?'Untouched shingle and existing condition.':'Result after handling, or restoration.'}</p><button type="button" class="field-button field-primary" data-phase="${phase}" data-kind="Camera">Take ${phase} photo</button><button type="button" class="field-button" data-phase="${phase}" data-kind="Upload">Upload ${phase} photo</button><div data-phase-photos="${phase}" role="status"></div></section>`).join('');
    capture.querySelector('.field-actions').hidden=true;
    capture.querySelector('.field-actions').style.display='none';
    capture.querySelector('.field-actions').before(phases);
    phases.addEventListener('click', event=>{
        const unlink=event.target.closest('[data-unlink-test-photo]');
        if(unlink){form.dispatchEvent(new CustomEvent('brittle-photo-unlink',{detail:unlink.dataset.unlinkTestPhoto}));return;}
        const button=event.target.closest('[data-phase]');if(!button)return;
        if(document.getElementById('field'+button.dataset.kind).disabled)return;
        form.dispatchEvent(new CustomEvent('brittle-photo-phase',{detail:button.dataset.phase}));
        document.getElementById('field'+button.dataset.kind).click();
    });
    const renderPhotos = note=>{
        const record=InspectionStore.get();
        for(const phase of ['before','after']) {
            const ids=note?.brittleTest?.photos?.[phase] || [];
            const target=phases.querySelector(`[data-phase-photos="${phase}"]`);target.replaceChildren();
            for(const id of ids) {
                const photo=record.photos[id];const item=document.createElement('p');
                item.textContent=photo ? `${phase==='before'?'Before':'After'} photo saved` : 'Linked photo was removed';
                if(photo?.thumbnail){const img=document.createElement('img');img.src=photo.thumbnail;img.alt=`${phase} test photo`;img.style.width='100%';img.style.borderRadius='10px';item.append(img);}
                const unlink=document.createElement('button');unlink.type='button';unlink.className='field-button';unlink.dataset.unlinkTestPhoto=id;unlink.textContent='Unlink from this test';item.append(unlink);
                target.append(item);
            }
        }
    };
    form.addEventListener('inspection-form-updated',event=>renderPhotos(event.detail));
    renderPhotos(InspectionStore.get().notes.fieldDraft);
    const analysisNote=document.createElement('p');analysisNote.className='field-help';
    analysisNote.textContent='AI reviews the selected photo together with your linked before and after photos, separating existing conditions from visible changes. Your dictation records the test outcome. If no test was performed, explain why—an after photo is not required.';
    phases.after(analysisNote);
    const story = form.querySelector('[aria-label="Dictate your observation"]');
    story.querySelector('h3').textContent = 'Tell us about the test.';
    story.querySelector('.field-help').textContent = 'Speak naturally after your photo. Say where you tested, what you did, and what happened. If you did not test, explain why. Only mention temperatures you actually measured.';
    const prompts = story.querySelector('.field-recall');
    prompts.replaceChildren(...['Which slope?', 'Conditions / temperature?', 'What did you do?', 'What changed?', 'Stopped or restored?'].map(text => {const span=document.createElement('span');span.textContent=text;return span;}));
    prompts.nextElementSibling.textContent = 'For example: “Front slope near the eave. Brittle test not performed because the shingles were cold and stiff. No shingles disturbed.”';
    form.elements.details.placeholder = 'Describe your brittle test, or why it was not performed. Your original words stay here.';
    const existing = InspectionStore.get().notes.fieldDraft;
    if (existing && (existing.details || existing.photoId) && !existing.brittleTest) {
        const notice = document.createElement('p');notice.className='field-preview';
        notice.textContent='Your previous unfinished note is still here. Save it or use “New / clear draft” before starting the brittle test.';
        form.prepend(notice);
    }
});
