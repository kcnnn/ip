/* A deterministic summary of saved evidence, not a new AI assessment. */
function accessoryClaimLines(r) {
    const status={possible:'Possible match — not confirmed',confirmed:'Model confirmed by inspector',unidentified:'Unidentified — research inconclusive'}[r.matchStatus] || 'Unidentified';
    return [`Roof accessory research: ${status}${r.model?` · ${r.model}`:''}.`,r.evidence || 'No additional identification evidence recorded.','Identification does not establish replacement compatibility.',...r.findings.flatMap(f=>[f.text,...f.sources.map(s=>`Source: ${s.title} — ${s.url}`)])];
}
function buildDetailedClaimNotes(record, sections, narrative) {
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
            if(note.accessoryResearch)lines.push(...accessoryClaimLines(note.accessoryResearch));
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

function buildClaimNotes(record, sections, narrative, options = {}) {
    if(options.format !== 'concise') {
        const filtered={...record,observations:Object.fromEntries(Object.entries(record.observations || {}).map(([id,n])=>[id,{...n,aiReview:options.ai===false?null:n.aiReview,equipmentResearch:options.research===false?null:n.equipmentResearch,accessoryResearch:options.research===false?null:n.accessoryResearch}]))};
        return buildDetailedClaimNotes(filtered,options.gaps===false?sections.map(s=>[s[0],s[1],[]]):sections,narrative);
    }
    const photos=Object.values(record.photos || {}), notes=Object.values(record.observations || {}), absences=Object.values(record.absences || {});
    const lines=['INSPECTION SUMMARY'];
    if(record.property?.address) lines.push(`Property: ${record.property.address}`);
    if(record.property?.claim) lines.push(`Claim/reference: ${record.property.claim}`);
    if(record.property?.inspector) lines.push(`Inspector: ${record.property.inspector}`);
    const groups=new Map(), reported=[], limitations=[], research=[], ai=[];
    const area=note=>{
        const location=String(note.location || '').trim();
        if(note.section==='Elevations') {
            const direction=note.elevationKey || /^(front|right|rear|back|left)(?:\s+(?:elevation|wall)\b|$)/i.exec(location)?.[1]?.toLowerCase();
            if(direction) return `${direction==='back'?'Rear':direction[0].toUpperCase()+direction.slice(1)} elevation${location && !new RegExp(`^(?:${direction}|rear|back)(?: (?:elevation|wall))?$`,'i').test(location)?` · ${location}`:''}`;
        }
        return [note.section || 'Other area',location || 'Location not specified'].join(' · ');
    };
    const add=(heading,line)=>{if(!groups.has(heading))groups.set(heading,[]);groups.get(heading).push(line);};
    const sectionOrder=new Map(sections.map((s,i)=>[s[0],i]));
    const order={front:0,right:1,rear:2,back:2,left:3};
    const direction=note=>note.elevationKey || /\b(front|right|rear|back|left)\b/i.exec(note.location || '')?.[1]?.toLowerCase();
    notes.sort((a,b)=>(sectionOrder.get(a.section)??99)-(sectionOrder.get(b.section)??99)||(order[direction(a)]??9)-(order[direction(b)]??9));
    for(const note of notes) {
        const place=area(note), body=narrative({...note,section:'',location:'',elevationKey:null});
        if(note.condition==='Not inspected') limitations.push(`${place}: ${body}`);
        else if(note.section==='Interview') reported.push(`${place}: ${body}`);
        else {
            const tag=note.condition==='Observed damage'?'Observed finding':note.condition==='Suspected damage'?'Suspected — not confirmed':note.condition==='No visible damage'?'Inspector recorded no visible damage':note.condition==='Not present'?'Not present':note.condition==='Measurement recorded'?'Recorded measurement':'Documentation / inspector note';
            add(place,`${tag}: ${body}`);
        }
        if(options.research!==false && note.equipmentResearch) {
            const e=note.equipmentResearch;research.push(`${place}: ${e.manufacturer || 'Brand unspecified'}; model ${e.model}; serial ${e.serial || 'not recorded'}.`);
            for(const f of e.findings || []) research.push(f.text,...f.sources.map(s=>`Source: ${s.title} — ${s.url}`));
        }
        if(options.ai && note.aiReview) ai.push(`${place}: ${note.aiReview.status.replaceAll('_',' ')} — ${note.aiReview.summary}`,...(note.aiReview.checks || []).map(c=>`AI review detail: ${c}`));
        if(options.research!==false && note.accessoryResearch) research.push(place,...accessoryClaimLines(note.accessoryResearch));
    }
    for(const absent of absences) add(absent.section || 'Other area',`Not present: ${absent.label}${absent.note?` — ${absent.note}`:''}.`);
    if(!notes.length) lines.push('No inspector findings have been saved. Photos alone do not establish damage or absence of damage.');
    for(const [heading,body] of groups) lines.push('',heading.toUpperCase(),...body);
    const interview=record.notes?.insuredInterview?.damageNotes;if(interview)reported.push(`Insured discussion (reported): ${interview}`);
    if(reported.length)lines.push('','REPORTED INFORMATION — NOT INDEPENDENTLY VERIFIED',...reported);
    if(limitations.length)lines.push('','AREAS RECORDED AS NOT INSPECTED',...limitations);
    if(research.length)lines.push('','ACCEPTED RESEARCH — SOURCED REFERENCE INFORMATION',...research);
    if(ai.length)lines.push('','AI PHOTO REVIEW — SEPARATE FROM INSPECTOR FINDINGS',...ai);
    if(options.gaps!==false) {
        const missing=[];
        for(const [section,,expected] of sections) {
            const labels=expected.filter(label=>!photos.some(p=>p.section===section&&p.label===label)&&!absences.some(a=>a.section===section&&a.label.toLowerCase()===label.toLowerCase()));
            if(labels.length)missing.push(`${section}: ${labels.join(', ')}.`);
        }
        if(missing.length)lines.push('','DOCUMENTATION GAPS — NOT A STATEMENT THAT AREAS WERE UNINSPECTED',...missing);
    }
    return lines.join('\n');
}

if (typeof module !== 'undefined') module.exports = buildClaimNotes;
if (typeof document !== 'undefined') document.addEventListener('DOMContentLoaded', () => {
    const actions = document.querySelector('.review-actions');
    const open = document.createElement('button'); open.id = 'claimNotesOpen'; open.type = 'button'; open.textContent = 'Text summary / claim notes'; actions.prepend(open);
    const panel = document.createElement('section'); panel.id = 'claimNotesPanel'; panel.className = 'claim-notes-panel'; panel.hidden = true;
    panel.innerHTML = `<h2>Claim notes · ready to paste</h2><p>A concise summary by elevation and roof location. Reported information, uninspected areas and sourced research stay separate from inspector findings. Edit the wording without changing your original observations.</p><div class="claim-note-options"><label for="claimNotesFormat">Format<select id="claimNotesFormat"><option value="concise">Concise claim narrative</option><option value="detailed">Detailed inspection record</option></select></label><label><input type="checkbox" id="claimNotesResearch" checked> Include accepted equipment research and sources</label><label><input type="checkbox" id="claimNotesAI"> Include separate AI photo reviews</label><label><input type="checkbox" id="claimNotesGaps" checked> Include documentation gaps</label></div><p id="claimNotesStale" class="review-missing" hidden></p><label for="claimNotesText">Editable claim note</label><textarea id="claimNotesText" rows="18" spellcheck="true"></textarea><p id="claimNotesCount" class="muted"></p><div class="review-actions"><button type="button" id="claimNotesCopy">Copy text</button><button type="button" id="claimNotesDownload">Download .txt</button><button type="button" id="claimNotesSave">Save edited note</button><button type="button" id="claimNotesRefresh">Refresh from record</button></div><p id="claimNotesStatus" role="status"></p>`;
    document.getElementById('reviewContent').before(panel);
    const text = document.getElementById('claimNotesText');
    document.getElementById('claimNotesResearch').parentElement.lastChild.textContent=' Include accepted equipment / accessory research and sources';
    const status = document.getElementById('claimNotesStatus');
    let generated = '', dirty = false, openedId='', source='', previousOptions;
    const byId=id=>document.getElementById(id);
    const getOptions=()=>({format:byId('claimNotesFormat').value,research:byId('claimNotesResearch').checked,ai:byId('claimNotesAI').checked,gaps:byId('claimNotesGaps').checked});
    const setOptions=o=>{byId('claimNotesFormat').value=o.format || 'concise';byId('claimNotesResearch').checked=o.research!==false;byId('claimNotesAI').checked=!!o.ai;byId('claimNotesGaps').checked=o.gaps!==false;};
    // Compare relevant source fields, without duplicating photo binaries in editor storage.
    const fingerprint=record=>JSON.stringify([record.id,record.property,Object.entries(record.photos || {}).map(([id,p])=>[id,p.section,p.label,p.elevationKey,p.updatedAt,p.originalKey]),record.observations,record.absences,record.notes?.insuredInterview?.damageNotes,record.startedAt]);
    const count=()=>{byId('claimNotesCount').textContent=`${text.value.trim()?text.value.trim().split(/\s+/).length:0} words · ${text.value.length} characters`;};
    const checkStale=()=>{const changed=source!==fingerprint(InspectionStore.get());byId('claimNotesStale').hidden=!changed;byId('claimNotesStale').textContent=changed?'The inspection has changed since this note was prepared. Your edits are kept; refresh from the record to incorporate the changes.':'';return changed;};
    const refresh = () => {
        const record=InspectionStore.get();openedId=record.id;source=fingerprint(record);previousOptions=getOptions();
        generated = buildClaimNotes(record, InspectionField.sections, InspectionField.narrative,previousOptions);
        text.value = generated; dirty = false;
        count();checkStale();status.textContent = 'Prepared from the saved record. Review the wording before copying.';
    };
    open.addEventListener('click', () => { if (panel.hidden) {
        const record=InspectionStore.get(),saved=record.notes?.claimNoteEditor;
        if(saved?.version===1 && typeof saved.text==='string') {openedId=record.id;generated=saved.generated || '';source=saved.source;setOptions(saved.options || {});previousOptions=getOptions();text.value=saved.text;dirty=text.value!==generated;count();checkStale();status.textContent='Your saved claim-note edits have been restored.';} else refresh();
    } panel.hidden = false; panel.scrollIntoView({behavior:'smooth',block:'start'}); });
    text.addEventListener('input', () => { dirty = text.value !== generated; count();status.textContent = 'Summary edited. Save edited note to keep your wording on this device, or copy/download it.'; });
    byId('claimNotesSave').onclick=()=>{
        if(InspectionStore.get().id!==openedId){status.textContent='The active inspection changed. Reopen this page before saving.';return;}
        try{InspectionStore.note('claimNoteEditor',{version:1,text:text.value,generated,source,options:getOptions(),savedAt:new Date().toISOString()});status.textContent='Edited claim note saved on this device and included in full inspection backups.';}catch{status.textContent='Your edited note could not be saved. Copy or download it before leaving.';}
    };
    panel.querySelector('.claim-note-options').addEventListener('change',()=>{if(dirty && !confirm('Regenerate with these options? This replaces your current text edits.')){setOptions(previousOptions);return;}refresh();});
    document.getElementById('claimNotesRefresh').addEventListener('click', () => {
        if (dirty && !confirm('Replace your summary edits with a fresh summary of the saved record?')) return;
        refresh();
    });
    document.getElementById('claimNotesCopy').addEventListener('click', async () => {
        if(checkStale() && !confirm('The inspection has changed. Copy this existing claim-note text anyway?'))return;
        const value = text.value;
        try { await navigator.clipboard.writeText(value); status.textContent = 'Copied. Ready to paste into your claim notes.'; }
        catch { text.focus(); text.select(); status.textContent = 'Clipboard access unavailable. The summary is selected—use Copy on your device, or download the text file.'; }
    });
    document.getElementById('claimNotesDownload').addEventListener('click', () => {
        if(checkStale() && !confirm('The inspection has changed. Download this existing claim-note text anyway?'))return;
        const url = URL.createObjectURL(new Blob([text.value], {type:'text/plain;charset=utf-8'}));
        const link = document.createElement('a'); link.href = url; link.download = 'inspection-claim-notes.txt'; link.click(); setTimeout(() => URL.revokeObjectURL(url),1000);
        status.textContent = 'Text download requested.';
    });
    window.addEventListener('inspection-record-changed', () => { if (!panel.hidden) checkStale(); });
    window.addEventListener('storage', () => { if (!panel.hidden) checkStale(); });
});
