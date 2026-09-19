function renderInspectionReview() {
    const record = InspectionStore.get();
    const { escape, narrative, sections } = InspectionField;
    const photos = Object.entries(record.photos || {});
    const notes = Object.values(record.observations || {});
    const absences = Object.values(record.absences || {});
    document.getElementById('reviewDate').textContent = new Date(record.updatedAt || record.startedAt).toLocaleString();
    document.getElementById('reviewCount').textContent = `${photos.length} photos · ${notes.length} inspector observations`;
    document.getElementById('reviewProperty').textContent = [record.property?.address, record.property?.claim && `Reference: ${record.property.claim}`, record.property?.inspector && `Inspector: ${record.property.inspector}`].filter(Boolean).join(' · ');
    document.getElementById('reviewContent').innerHTML = sections.map(([section, url, expected]) => {
        const sectionPhotos = photos.filter(([, photo]) => photo.section === section);
        const sectionNotes = notes.filter(note => note.section === section);
        const sectionAbsences = absences.filter(item => item.section === section);
        const missing = expected.filter(label => !sectionPhotos.some(([, p]) => p.label === label) && !sectionAbsences.some(a => a.label.toLowerCase() === label.toLowerCase()));
        return `<section class="review-section"><div class="review-heading"><h2>${escape(section)}</h2><a class="review-edit" href="${url}">Open section ↗</a></div><p class="muted">Inspector review: ${escape(record.sectionStates[section]?.status || 'Not reviewed')}</p>
            ${missing.length ? `<p class="review-missing">No photo recorded: ${missing.map(escape).join(', ')}.</p>` : ''}
            <div class="review-grid">${sectionPhotos.map(([id, photo]) => `<article class="review-photo">${photo.thumbnail ? `<button type="button" class="review-image" data-open-photo="${escape(id)}"><img src="${escape(photo.thumbnail)}" data-photo="${escape(id)}" alt="${escape(photo.label)}"></button>` : '<p>Photo preview unavailable</p>'}<h3>${escape(photo.label)}</h3><p>Recorded ${new Date(photo.capturedAt).toLocaleString()}</p><p>${photo.storageStatus === 'failed' ? 'Original save failed' : photo.originalKey ? 'Original stored on this device' : 'Legacy thumbnail only'}</p></article>`).join('')}${sectionAbsences.map(item => `<article class="review-absence"><h3>${escape(item.label)}</h3><p>${escape(item.note)}</p></article>`).join('')}</div>
            ${sectionNotes.map(note => `<article class="review-note"><span class="eyebrow">INSPECTOR OBSERVATION${note.dictated ? ' · DICTATED TEXT INCLUDED' : ''}</span><p>${escape(narrative(note))}</p>${note.photoId ? `<small>Linked photo: ${escape(record.photos[note.photoId]?.label || 'No longer in record')}</small>` : ''}<p class="muted">Updated ${new Date(note.updatedAt).toLocaleString()}</p></article>`).join('')}
            ${sectionNotes.filter(note => note.aiReview).map(note => `<article class="review-note"><span class="eyebrow">AI PHOTO REVIEW · ${escape(note.location || '')} · ${escape(note.component || '')}</span><p>${escape(note.aiReview.status.replaceAll('_', ' '))}: ${escape(note.aiReview.summary)}</p><ul>${note.aiReview.checks.map(item => `<li>${escape(item)}</li>`).join('')}</ul><small>Linked photo: ${escape(record.photos[note.photoId]?.label || 'No longer in record')}</small></article>`).join('')}
            ${section === 'Interview' && record.notes.insuredInterview?.damageNotes ? `<article class="review-note"><h3>Insured discussion</h3><p>${escape(record.notes.insuredInterview.damageNotes)}</p></article>` : ''}
            ${!sectionPhotos.length && !sectionNotes.length && !sectionAbsences.length ? '<p class="muted">Nothing recorded in this section yet.</p>' : ''}</section>`;
    }).join('');
}

document.addEventListener('DOMContentLoaded', () => {
    renderInspectionReview();
    window.addEventListener('inspection-record-changed', renderInspectionReview);
    const dialog = document.getElementById('reviewPhotoDialog');
    document.getElementById('reviewPhotoClose').onclick = () => dialog.close();
    document.getElementById('reviewContent').addEventListener('click', async event => {
        const button = event.target.closest('[data-open-photo]'); if (!button) return;
        const id = button.dataset.openPhoto;
        const photo = InspectionStore.get().photos[id];
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
