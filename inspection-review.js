function renderInspectionReview() {
    const record = InspectionStore.get();
    const { escape, narrative, sections } = InspectionField;
    const photos = Object.entries(record.photos || {});
    const notes = Object.values(record.observations || {});
    const absences = Object.values(record.absences || {});
    const deleteControl=(kind,id,label)=>`<button type="button" class="review-delete review-manage" data-delete-kind="${kind}" data-delete-id="${escape(id)}" aria-label="Delete ${kind==='photos'?'photo':'observation'}: ${escape(label)}">Delete ${kind==='photos'?'photo':'observation'}</button>`;
    document.getElementById('reviewDate').textContent = new Date(record.updatedAt || record.startedAt).toLocaleString();
    document.getElementById('reviewCount').textContent = `${photos.length} photos · ${notes.length} inspector observations`;
    document.getElementById('reviewProperty').textContent = [record.property?.address, record.property?.claim && `Reference: ${record.property.claim}`, record.property?.inspector && `Inspector: ${record.property.inspector}`].filter(Boolean).join(' · ');
    document.getElementById('reviewContent').innerHTML = sections.map(([section, url, expected]) => {
        const sectionPhotos = photos.filter(([, photo]) => photo.section === section);
        // Keep each elevation overview next to its associated close-ups in print/PDF.
        if (section === 'Elevations') {
            const keys = ['front', 'right', 'rear', 'left'];
            const group = photo => keys.indexOf(photo.elevationKey || photo.label.split(' ')[0].toLowerCase());
            sectionPhotos.sort((a, b) => (group(a[1]) < 0 ? 4 : group(a[1])) - (group(b[1]) < 0 ? 4 : group(b[1])) || Number(!!a[1].elevationKey) - Number(!!b[1].elevationKey));
        }
        const sectionNotes = notes.filter(note => note.section === section);
        const sectionAbsences = absences.filter(item => item.section === section);
        const missing = expected.filter(label => label !== 'Brittle test' && !sectionPhotos.some(([, p]) => p.label === label) && !sectionAbsences.some(a => a.label.toLowerCase() === label.toLowerCase()));
        return `<section class="review-section"><div class="review-heading"><h2>${escape(section)}</h2><a class="review-edit" href="${url}">Open section ↗</a></div><p class="muted">Documentation: ${escape(InspectionField.sectionProgress(record, section))}</p>
            ${missing.length ? `<p class="review-missing">No photo recorded: ${missing.map(escape).join(', ')}.</p>` : ''}
            <div class="review-grid">${sectionPhotos.map(([id, photo]) => `<article class="review-photo">${photo.thumbnail ? `<button type="button" class="review-image" data-open-photo="${escape(id)}"><img src="${escape(photo.thumbnail)}" data-photo="${escape(id)}" alt="${escape(photo.label)}"></button>` : '<p>Photo preview unavailable</p>'}<h3>${escape(photo.label)}</h3><p>Recorded ${new Date(photo.capturedAt).toLocaleString()}</p><p>${photo.storageStatus === 'failed' ? 'Original save failed' : photo.originalKey ? 'Original stored on this device' : 'Legacy thumbnail only'}</p>${deleteControl('photos',id,photo.label)}</article>`).join('')}${sectionAbsences.map(item => `<article class="review-absence"><h3>${escape(item.label)}</h3><p>${escape(item.note)}</p></article>`).join('')}</div>
            ${sectionNotes.map(note => `<article class="review-note"><span class="eyebrow">INSPECTOR OBSERVATION${note.dictated ? ' · DICTATED TEXT INCLUDED' : ''}</span><p>${escape(narrative(note))}</p>${note.photoId ? `<small>Linked photo: ${escape(record.photos[note.photoId]?.label || 'No longer in record')}</small>` : ''}<p class="muted">Updated ${new Date(note.updatedAt).toLocaleString()}</p>${deleteControl('observations',note.id,note.location || note.component || 'Inspection note')}</article>`).join('')}
            ${sectionNotes.filter(note => note.equipmentResearch).map(note => {
                const equipment=note.equipmentResearch;
                return `<article class="review-note"><span class="eyebrow">ACCEPTED EQUIPMENT RESEARCH · ${escape(note.location || '')}</span><p>Label identifiers checked by inspector: ${escape(equipment.manufacturer || 'Brand unspecified')} · Model ${escape(equipment.model)} · Serial ${escape(equipment.serial || 'not recorded')}</p>${equipment.findings.map(finding=>`<p>${escape(finding.text)}</p>${finding.sources.map(source=>{let safe=false;try{const u=new URL(source.url);safe=u.protocol==='https:'&&!u.username&&!u.password;}catch{}return safe?`<p>Source: <a href="${escape(source.url)}" target="_blank" rel="noopener noreferrer">${escape(source.title)}</a> · ${escape(source.url)}</p>`:'';}).join('')}`).join('')}<small>Researched ${escape(equipment.retrievedAt)} · Accepted ${escape(equipment.acceptedAt)}</small></article>`;
            }).join('')}
            ${sectionNotes.filter(note=>note.accessoryResearch).map(note=>{
                const r=note.accessoryResearch,labels={possible:'Possible match — not confirmed',confirmed:'Model confirmed by inspector',unidentified:'Unidentified — research inconclusive'};
                return `<article class="review-note"><span class="eyebrow">ROOF ACCESSORY RESEARCH</span><p>${escape(labels[r.matchStatus] || labels.unidentified)}${r.model?` · ${escape(r.model)}`:''}</p><p>${escape(r.evidence || 'No additional identification evidence recorded.')}</p><p>Identification does not establish replacement compatibility.</p>${r.findings.map(f=>`<p>${escape(f.text)}</p>${f.sources.map(s=>{let safe=false;try{const u=new URL(s.url);safe=u.protocol==='https:'&&!u.username&&!u.password;}catch{}return safe?`<p>Source: <a href="${escape(s.url)}" target="_blank" rel="noopener noreferrer">${escape(s.title)}</a></p>`:'';}).join('')}`).join('')}<small>Researched ${escape(r.retrievedAt)} · Accepted ${escape(r.acceptedAt)}</small></article>`;
            }).join('')}
            ${sectionNotes.filter(note => note.aiReview).map(note => `<article class="review-note"><span class="eyebrow">AI PHOTO REVIEW · ${escape(note.location || '')} · ${escape(note.component || '')}</span><p>${escape(note.aiReview.status.replaceAll('_', ' '))}: ${escape(note.aiReview.summary)}</p><ul>${note.aiReview.checks.map(item => `<li>${escape(item)}</li>`).join('')}</ul><small>Linked photo: ${escape(record.photos[note.photoId]?.label || 'No longer in record')}</small></article>`).join('')}
            ${section === 'Interview' && record.notes.insuredInterview?.damageNotes ? `<article class="review-note"><h3>Insured discussion</h3><p>${escape(record.notes.insuredInterview.damageNotes)}</p></article>` : ''}
            ${!sectionPhotos.length && !sectionNotes.length && !sectionAbsences.length ? '<p class="muted">Nothing recorded in this section yet.</p>' : ''}</section>`;
    }).join('');
    groupReviewCards(record);
    const deleted=Object.entries(record.deletedItems || {});
    if(deleted.length) document.getElementById('reviewContent').insertAdjacentHTML('beforeend',`<details class="review-trash review-manage"><summary>Deleted items (${deleted.length}) · Undo deletions</summary><p>Removed from this report. Originals are retained on this device so you can restore them.</p>${deleted.map(([token,entry])=>`<div><p>${escape(entry.kind==='photos'?entry.item.label:entry.item.details || entry.item.location || 'Observation')}</p><button type="button" class="review-delete" data-restore-item="${escape(token)}">Restore ${entry.kind==='photos'?'photo':'observation'}</button></div>`).join('')}</details>`);
}

function groupReviewCards(record) {
    const root=document.getElementById('reviewContent'), photoCards=new Map(), noteCards=new Map();
    root.querySelectorAll('[data-delete-kind="photos"]').forEach(button=>photoCards.set(button.dataset.deleteId,button.closest('.review-photo')));
    root.querySelectorAll('[data-delete-kind="observations"]').forEach(button=>noteCards.set(button.dataset.deleteId,button.closest('.review-note')));
    // Match the rendered section lists before moving them, so each separate
    // AI/research record stays attached to its own observation, not just a title.
    [...root.querySelectorAll('.review-section')].forEach((section,index)=>{
        const name=InspectionField.sections[index][0];
        const notes=Object.values(record.observations).filter(n=>n.section===name);
        const equipment=[...section.querySelectorAll('.review-note')].filter(el=>el.querySelector('.eyebrow')?.textContent.startsWith('ACCEPTED EQUIPMENT RESEARCH'));
        const reviews=[...section.querySelectorAll('.review-note')].filter(el=>el.querySelector('.eyebrow')?.textContent.startsWith('AI PHOTO REVIEW'));
        notes.filter(n=>n.equipmentResearch).forEach((note,i)=>{if(equipment[i])noteCards.get(note.id)?.append(equipment[i]);});
        const accessories=[...section.querySelectorAll('.review-note')].filter(el=>el.querySelector('.eyebrow')?.textContent==='ROOF ACCESSORY RESEARCH');
        notes.filter(n=>n.accessoryResearch).forEach((note,i)=>{if(accessories[i])noteCards.get(note.id)?.append(accessories[i]);});
        notes.filter(n=>n.aiReview).forEach((note,i)=>{if(reviews[i])noteCards.get(note.id)?.append(reviews[i]);});
    });
    for(const note of Object.values(record.observations)) {
        const card=noteCards.get(note.id);if(!card)continue;
        for(const phase of ['before','during','after']) {
            for(const id of note.brittleTest?.photos?.[phase] || []) {
                const line=document.createElement('p');
                const button=document.createElement('button');button.type='button';button.className='review-delete';
                button.textContent=`${phase==='before'?'Before':phase==='during'?'During':'After'} test photo${record.photos[id]?'':' — removed'}`;
                if(record.photos[id]) button.dataset.openPhoto=id;else button.disabled=true;
                line.append(button);card.append(line);
            }
        }
        const edit=document.createElement('button');edit.type='button';edit.className='review-delete review-manage';edit.dataset.editReviewNote=note.id;edit.textContent='Edit note';
        card.querySelector('[data-delete-kind="observations"]').before(edit);
        const photoCard=photoCards.get(note.photoId);
        if(photoCard){photoCard.append(card);photoCard.classList.add('review-unified');}
    }
    for(const [id,card] of photoCards) {
        if(!Object.values(record.observations).some(note=>note.photoId===id || Object.values(note.brittleTest?.photos || {}).flat().includes(id))) {
            const add=document.createElement('button');add.type='button';add.className='review-delete review-manage';add.dataset.addReviewPhotoNote=id;add.textContent='Add note';card.append(add);
        }
    }
    // Keep each chimney and its explicitly linked measurements together.
    for (const [id, photo] of Object.entries(record.photos)) {
        if (!photo.parentPhotoId || record.photos[photo.parentPhotoId]?.component !== 'Chimney') continue;
        const parent = photoCards.get(photo.parentPhotoId), child = photoCards.get(id);
        if (!parent || !child || parent === child) continue;
        let group = parent.closest('.review-chimney-group');
        if (!group) {
            group = document.createElement('article');group.className = 'review-chimney-group review-brittle-group';
            const heading = document.createElement('h3');heading.textContent = 'Chimney and measurements';
            const container = document.createElement('div');container.className = 'review-brittle-photos';
            parent.before(group);group.append(heading, container);container.append(parent);
        }
        group.querySelector('.review-brittle-photos').append(child);
    }
    // Group only explicitly linked test photos, never nearby timestamps or titles.
    for(const note of Object.values(record.observations)) {
        const ids=[...new Set(['before','during','after'].flatMap(phase=>note.brittleTest?.photos?.[phase] || []))];
        const cards=ids.map(id=>photoCards.get(id)).filter(Boolean);
        if(!cards.length)continue;
        let group=cards.map(card=>card.closest('.review-brittle-group')).find(Boolean);
        if(!group) {
            group=document.createElement('article');group.className='review-brittle-group';
            const heading=document.createElement('h3');heading.textContent=`Brittle test${note.location ? ' · '+note.location : ''}`;
            const photos=document.createElement('div');photos.className='review-brittle-photos';
            cards[0].before(group);group.append(heading,photos);
        }
        for(const card of cards) {
            const prior=card.closest('.review-brittle-group');
            if(prior && prior!==group) {
                [...prior.querySelector('.review-brittle-photos').children].forEach(child=>group.querySelector('.review-brittle-photos').append(child));
                [...prior.children].filter(child=>child.classList.contains('review-note')).forEach(child=>group.append(child));prior.remove();
            }
            [...card.children].filter(child=>child.classList.contains('review-note')).forEach(child=>group.append(child));
            const id=card.querySelector('[data-delete-kind="photos"]').dataset.deleteId;
            const phase=note.brittleTest.photos.before?.includes(id) ? 'Before test' : note.brittleTest.photos.during?.includes(id) ? 'During lift' : 'After test';
            card.querySelector('h3').textContent=phase;
            card.classList.remove('review-unified');
            group.querySelector('.review-brittle-photos').append(card);
        }
        const observation=noteCards.get(note.id);if(observation)group.append(observation);
        if(observation) {
            observation.querySelectorAll('button[data-open-photo]').forEach(button=>{if(record.photos[button.dataset.openPhoto])button.parentElement.remove();});
            observation.querySelectorAll('small').forEach(label=>{if(label.textContent.startsWith('Linked photo:'))label.textContent='Linked photos: test photos shown above.';});
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    renderInspectionReview();
    const status=document.createElement('p');status.id='reviewDeleteStatus';status.className='review-manage';status.setAttribute('role','status');status.tabIndex=-1;
    document.querySelector('.review-actions').after(status);
    window.addEventListener('inspection-record-changed', renderInspectionReview);
    const dialog = document.getElementById('reviewPhotoDialog');
    document.getElementById('reviewPhotoClose').onclick = () => dialog.close();
    document.getElementById('reviewContent').addEventListener('click', async event => {
        const edit=event.target.closest('[data-edit-review-note]'), add=event.target.closest('[data-add-review-photo-note]');
        if(edit || add) {
            const record=InspectionStore.get();
            if(edit) {const note=record.observations[edit.dataset.editReviewNote];if(note)InspectionField.editNote(note);}
            else {const id=add.dataset.addReviewPhotoNote,photo=record.photos[id];if(photo)InspectionField.editNote({section:photo.section,photoId:id,elevationKey:photo.elevationKey,location:photo.elevationKey?`${photo.elevationKey} elevation`:''});}
            return;
        }
        const remove=event.target.closest('[data-delete-id]'), restore=event.target.closest('[data-restore-item]');
        if(remove || restore) {
            try {
                if(restore) {InspectionStore.restoreReviewItem(restore.dataset.restoreItem);status.textContent='Restored to the report.';}
                else {
                    const kind=remove.dataset.deleteKind,id=remove.dataset.deleteId;
                    const item=InspectionStore.get()[kind]?.[id];if(!item) return;
                    const message=kind==='photos'?`Delete photo "${item.label}" from this report? Linked observations and their findings will remain. You can restore the photo under Deleted items.`:'Delete this observation and its attached AI findings/research from the report? Its photo will remain. You can restore the observation under Deleted items.';
                    if(!confirm(message)) return;
                    InspectionStore.deleteReviewItem(kind,id);
                    status.textContent=`${kind==='photos'?'Photo':'Observation'} deleted from the report. Restore it under “Deleted items” at the bottom of this page.`;
                }
            } catch(error) {status.textContent=error.message || 'The change could not be saved.';}
            status.focus();return;
        }
        const button = event.target.closest('[data-open-photo]'); if (!button) return;
        const id = button.dataset.openPhoto;
        const photo = InspectionStore.get().photos[id];
        if(!photo) return;
        let original; try { original = await InspectionStore.getPhoto(id); } catch { /* Show available thumbnail. */ }
        document.getElementById('reviewFullPhoto').src = original || photo.thumbnail;
        document.getElementById('reviewFullPhoto').alt = photo.label;
        document.getElementById('reviewPhotoCaption').textContent = `${photo.label}${original ? '' : ' — original unavailable; thumbnail only'}`;
        dialog.showModal();
    });
    document.getElementById('reviewPrint').addEventListener('click', async event => {
        const button = event.currentTarget; button.disabled = true; button.textContent = 'Preparing photos…';
        await InspectionStore.flush();
        await Promise.all([...document.querySelectorAll('[data-photo]')].map(async image => {
            try { const original = await InspectionStore.getPhoto(image.dataset.photo); if (original) { image.src = original; await image.decode(); } } catch { /* Keep thumbnail. */ }
        }));
        window.print(); button.disabled = false; button.textContent = 'Print / Save as PDF';
    });
});
