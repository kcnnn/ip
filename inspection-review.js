function escapeReview(value) {
    return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderInspectionReview() {
    const record = InspectionStore.get();
    const photos = Object.values(record.photos || {});
    const absences = Object.values(record.absences || {});
    document.getElementById('reviewDate').textContent = new Date(record.updatedAt || record.startedAt).toLocaleString();
    document.getElementById('reviewCount').textContent = `${photos.length} photo${photos.length === 1 ? '' : 's'} recorded`;

    const sections = [...new Set([...photos.map(item => item.section), ...absences.map(item => item.section)])];
    document.getElementById('reviewContent').innerHTML = sections.length ? sections.map(section => {
        const sectionPhotos = photos.filter(item => item.section === section);
        const sectionAbsences = absences.filter(item => item.section === section);
        return `<section class="review-section"><h2>${escapeReview(section)}</h2><div class="review-grid">${sectionPhotos.map(photo =>
            `<article class="review-photo">${photo.thumbnail ? `<img src="${photo.thumbnail}" alt="${escapeReview(photo.label)}">` : ''}<h3>${escapeReview(photo.label)}</h3><p>Captured ${new Date(photo.capturedAt).toLocaleString()}</p></article>`).join('')}${sectionAbsences.map(item =>
            `<article class="review-absence"><h3>${escapeReview(item.label)}</h3><p>${escapeReview(item.note)}</p></article>`).join('')}</div></section>`;
    }).join('') : '<div class="review-empty">No inspection photos have been recorded yet.</div>';
}

document.addEventListener('DOMContentLoaded', renderInspectionReview);
