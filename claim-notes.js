/* A deterministic summary of saved evidence, not a new AI assessment. */
function buildClaimNotes(record, sections, narrative) {
    const photos = Object.values(record.photos || {});
    const notes = Object.values(record.observations || {});
    const absences = Object.values(record.absences || {});
    const lines = ['INSPECTION SUMMARY'];
    if (record.property?.address) lines.push(`Property: ${record.property.address}`);
    if (record.property?.claim) lines.push(`Claim/reference: ${record.property.claim}`);
    if (record.property?.inspector) lines.push(`Inspector: ${record.property.inspector}`);
    if (record.startedAt && !Number.isNaN(Date.parse(record.startedAt))) lines.push(`Record started: ${new Date(record.startedAt).toLocaleDateString('en-US')}`);
    lines.push(`Documentation: ${photos.length} photo records; ${notes.length} saved inspector observations.`);
    if (!notes.length) lines.push('No inspector findings have been saved. Photo documentation alone does not establish damage or absence of damage.');
    const names = [...new Set([...sections.map(s => s[0]), ...photos.map(p => p.section), ...notes.map(n => n.section), ...absences.map(a => a.section)])];
    for (const section of names) {
        const sectionPhotos = photos.filter(p => p.section === section);
        const sectionNotes = notes.filter(n => n.section === section);
        const sectionAbsences = absences.filter(a => a.section === section);
        const interview = section === 'Interview' ? record.notes?.insuredInterview?.damageNotes : '';
        lines.push('', `${section.toUpperCase()}`);
        lines.push(`${sectionPhotos.length} photo records.`);
        if (section === 'Elevations') for (const key of ['front', 'right', 'rear', 'left']) {
            const count = sectionPhotos.filter(photo => photo.elevationKey === key).length;
            if (count) lines.push(`${key.charAt(0).toUpperCase() + key.slice(1)} elevation: ${count} additional detail photo${count === 1 ? '' : 's'}.`);
        }
        sectionAbsences.forEach(item => lines.push(`${item.label}: ${item.note || 'Not present'}.`));
        sectionNotes.forEach(note => {
            lines.push(`Inspector observation: ${narrative(note)}`);
            if (note.equipmentResearch) {
                const equipment=note.equipmentResearch;
                lines.push(`Accepted equipment research: ${equipment.manufacturer || 'Brand unspecified'}; model ${equipment.model}; serial ${equipment.serial || 'not recorded'}.`, `Sources researched ${equipment.retrievedAt}; accepted ${equipment.acceptedAt}.`);
                equipment.findings.forEach(finding=>lines.push(finding.text,...finding.sources.map(source=>`Source: ${source.title} — ${source.url}`)));
            }
            if (note.aiReview) lines.push(`AI photo review (${note.aiReview.status.replaceAll('_', ' ')}): ${note.aiReview.summary}`, ...(note.aiReview.checks || []).map(item => `AI review detail: ${item}`));
        });
        if (interview) lines.push(`Insured discussion (reported): ${interview}`);
        if (!sectionNotes.length && !interview) lines.push('No findings recorded for this section.');
        const expected = sections.find(s => s[0] === section)?.[2] || [];
        const missing = expected.filter(label => !sectionPhotos.some(p => p.label === label) && !sectionAbsences.some(a => a.label.toLowerCase() === label.toLowerCase()));
        if (missing.length) lines.push(`Photos not recorded: ${missing.join(', ')}.`);
    }
    return lines.join('\n');
}

if (typeof module !== 'undefined') module.exports = buildClaimNotes;
if (typeof document !== 'undefined') document.addEventListener('DOMContentLoaded', () => {
    const actions = document.querySelector('.review-actions');
    const open = document.createElement('button'); open.id = 'claimNotesOpen'; open.type = 'button'; open.textContent = 'Text summary / claim notes'; actions.prepend(open);
    const panel = document.createElement('section'); panel.id = 'claimNotesPanel'; panel.className = 'claim-notes-panel'; panel.hidden = true;
    panel.innerHTML = `<h2>Claim notes · text summary</h2><p>Review and edit this text, then copy it into your claim notes or download it. Edits here affect this export only, not the inspection record.</p><p class="muted">Includes saved inspector observations, measurements, reported interview notes and documentation gaps. Unsaved drafts and on-screen AI analyses that were not saved are not included.</p><label for="claimNotesText">Summary text</label><textarea id="claimNotesText" rows="18" spellcheck="true"></textarea><div class="review-actions"><button type="button" id="claimNotesCopy">Copy text</button><button type="button" id="claimNotesDownload">Download .txt</button><button type="button" id="claimNotesRefresh">Refresh from record</button></div><p id="claimNotesStatus" role="status"></p>`;
    document.getElementById('reviewContent').before(panel);
    const text = document.getElementById('claimNotesText');
    const status = document.getElementById('claimNotesStatus');
    let generated = '', dirty = false;
    const refresh = () => {
        generated = buildClaimNotes(InspectionStore.get(), InspectionField.sections, InspectionField.narrative);
        text.value = generated; dirty = false;
        status.textContent = 'Generated from the current saved record. Review before copying.';
    };
    open.addEventListener('click', () => { if (panel.hidden) refresh(); panel.hidden = false; panel.scrollIntoView({behavior:'smooth',block:'start'}); });
    text.addEventListener('input', () => { dirty = text.value !== generated; status.textContent = 'Summary edited. Copy or download to keep these edits.'; });
    document.getElementById('claimNotesRefresh').addEventListener('click', () => {
        if (dirty && !confirm('Replace your summary edits with a fresh summary of the saved record?')) return;
        refresh();
    });
    document.getElementById('claimNotesCopy').addEventListener('click', async () => {
        const value = text.value;
        try { await navigator.clipboard.writeText(value); status.textContent = 'Copied. Ready to paste into your claim notes.'; }
        catch { text.focus(); text.select(); status.textContent = 'Clipboard access unavailable. The summary is selected—use Copy on your device, or download the text file.'; }
    });
    document.getElementById('claimNotesDownload').addEventListener('click', () => {
        const url = URL.createObjectURL(new Blob([text.value], {type:'text/plain;charset=utf-8'}));
        const link = document.createElement('a'); link.href = url; link.download = 'inspection-claim-notes.txt'; link.click(); setTimeout(() => URL.revokeObjectURL(url),1000);
        status.textContent = 'Text download requested.';
    });
    window.addEventListener('inspection-record-changed', () => { if (!panel.hidden) status.textContent = 'The inspection record changed. Refresh from record to include the latest saved information; your edits have been kept.'; });
});
