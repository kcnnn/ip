/* A recoverable review queue. Splitting never writes completed observations. */
export function mountMultiObservation(form, readForm, isBusy) {
    const api=window.InspectionField;
    const store=window.InspectionStore;
    const recordId=store.get().id;
    const status=document.getElementById('fieldFillStatus');
    const mode=document.getElementById('fieldMultiMode');
    const button=document.getElementById('fieldFill');
    const panel=document.createElement('section');
    panel.className='field-preview multi-observation-queue';panel.id='fieldMultiQueue';panel.hidden=true;
    document.querySelector('.field-extraction-heading').before(panel);
    let queue=store.get().notes.multiObservationDraft || null;
    let splitting=false;
    const persist=()=>{if(store.get().id!==recordId)throw new Error('The active inspection changed. Reload before continuing.');store.note('multiObservationDraft',queue);};
    const capture=()=>{
        if(!queue)return;
        const current=readForm(),item=queue.items.find(item=>item.id===current.id);
        if(item) Object.assign(item,current,{queueEdited:true});
    };
    function render() {
        panel.hidden=!queue;
        if(!queue)return;
        const saved=store.get().observations;
        panel.innerHTML=`<h3>Review your observations</h3><p>${queue.items.filter(n=>!!saved[n.id]).length} of ${queue.items.length} added to report. Open each note, check its details and photo, then use Add to report below. Nothing is saved as a finding until you do.</p><div class="field-actions">${queue.items.map((n,i)=>`<button type="button" class="field-button" data-multi-index="${i}" aria-current="${readForm().id===n.id?'step':'false'}">${i+1}. ${api.escape([n.location,n.component].filter(Boolean).join(' · ') || 'Documentation note')} ${saved[n.id]?'✓ Saved':''}</button>`).join('')}</div><details><summary>Original full dictation</summary><p style="white-space:pre-wrap">${api.escape(queue.transcript)}</p></details><button type="button" class="field-button" id="fieldMultiClear">Dismiss queue</button>`;
        panel.querySelectorAll('[data-multi-index]').forEach(b=>b.onclick=()=>{
            if(isBusy() || splitting)return;
            try {
                capture();persist();
                const item=queue.items[Number(b.dataset.multiIndex)];
                api.editNote(item.queueEdited?item:saved[item.id] || item);
                store.note('fieldDraft',readForm());
                render();status.textContent='Review this split note, choose a photo if needed, then Add to report. Analyze again only if you want a separate photo review.';
            } catch(error){status.textContent=error.message;}
        });
        panel.querySelector('#fieldMultiClear').onclick=()=>{
            if(isBusy() || splitting || !confirm('Dismiss this review queue and its original transcript? Saved observations and the current editor draft stay.'))return;
            try{queue=null;persist();render();}catch(error){status.textContent=error.message;}
        };
    }
    mode.addEventListener('change',()=>{button.textContent=mode.checked?'Organize multiple observations':'Analyze & prepare note';});
    api.splitDictation=async()=>{
        if(splitting || isBusy())return;
        const snapshot=readForm(),transcript=snapshot.details.trim();
        if(!transcript){status.textContent='Dictate or type the observations first.';return;}
        if(queue && !confirm('Replace the existing review queue? Saved observations remain.'))return;
        splitting=true;button.disabled=true;
        const submit=form.querySelector('[type="submit"]');submit.disabled=true;
        status.textContent='Separating your dictation into reviewable observations…';
        let timeout;
        try {
            const result=await Promise.race([
                ObservationExtraction.extract(transcript,api.componentsBySection,snapshot.section,null,true),
                new Promise((_,reject)=>{timeout=setTimeout(()=>reject(new Error('Organization timed out. Your full dictation is kept; retry.')),90000);})
            ]);
            if(store.get().id!==recordId || JSON.stringify(readForm())!==JSON.stringify(snapshot))throw new Error('The note or inspection changed during organization. Your changes were kept; try again.');
            const next={version:1,transcript,createdAt:new Date().toISOString(),items:result.observations.map(n=>{
                const {omittedFields,...fields}=n;
                return {...fields,id:`split:${crypto.randomUUID()}`,section:n.section || snapshot.section,photoId:'',dictated:snapshot.dictated,aiReview:null,elevationKey:null,parentPhotoId:null,photoTitle:null,equipmentResearch:null};
            })};
            // Persist before changing the editor, so reload recovers every prepared item.
            store.note('multiObservationDraft',next);queue=next;
            api.editNote(queue.items[0]);store.note('fieldDraft',readForm());render();
            status.textContent=`${queue.items.length} observations prepared, none added yet. Compare them with your original dictation and review each one. Unstated or unsupported fields stay blank.`;
            panel.scrollIntoView({behavior:'smooth',block:'start'});
        } catch(error){status.textContent=error.message || 'Could not split the dictation. Your note is kept.';}
        finally{clearTimeout(timeout);splitting=false;button.disabled=false;submit.disabled=isBusy();}
    };
    form.addEventListener('input',()=>{if(!queue || splitting)return;try{capture();persist();}catch(error){status.textContent='Split-note edits could not be saved. Keep this page open or copy your dictation.';}});
    form.addEventListener('inspection-observation-saved',event=>{
        const item=queue?.items.find(n=>n.id===event.detail.id);
        if(item) {Object.assign(item,event.detail,{queueEdited:false});try{persist();}catch{status.textContent='The observation was saved, but queue progress could not be updated.';}}
        render();
    });
    window.addEventListener('inspection-record-changed',()=>{if(queue)render();});
    render();
}
