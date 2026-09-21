/* Stable slope IDs keep each test square separate, even after renaming. */
window.HailSlopes={
    list(){return InspectionStore.get().notes.hailSlopes || [];},
    legacy(){return Object.values(InspectionStore.get().photos).some(p=>p.section==='Hail documentation'&&!p.hailSlopeId);},
    active(){const id=new URLSearchParams(location.search).get('slope');return this.list().find(s=>s.id===id) || (id==='legacy' || (!this.list().length&&this.legacy())?{id:'legacy',name:'Unassigned existing test square'}:id?null:this.list()[0]);},
    photoId(step){const s=this.active();return Object.entries(InspectionStore.get().photos).find(([,p])=>p.hailSlopeId===s?.id&&p.hailStep===step)?.[0] || (s?.id==='legacy'?`Hail documentation:${step}`:`hail:${s?.id}:${step}`);},
    async go(id){const saves=await InspectionStore.flush();if(saves.some(s=>s===false))return;location.href=`hail-test-square.html?slope=${encodeURIComponent(id)}`;},
    next(){const list=this.list(),index=list.findIndex(s=>s.id===this.active()?.id);if(index>=0&&index<list.length-1)this.go(list[index+1].id);else location.href='inspection-review.html';}
};
document.addEventListener('DOMContentLoaded',()=>{
    const panel=document.createElement('section');panel.className='field-section-card';panel.id='hailSlopePanel';panel.style.marginBottom='24px';
    document.querySelector('.main-content').prepend(panel);
    const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const render=()=>{
        const list=HailSlopes.list(),active=HailSlopes.active(),record=InspectionStore.get();
        panel.innerHTML=`<h2>One test square per roof slope</h2><p>Start with 2 slopes for a simple gable or 4 for a simple hip. Rename each to its actual location; add slopes for dormers, additions or complex roofs.</p>${!list.length?'<div class="field-actions"><button class="field-button" data-layout="2">Gable · 2 slopes</button><button class="field-button" data-layout="4">Hip · 4 slopes</button></div>':''}<label>Current roof slope<select id="hailSlopeSelect"><option value="">Choose slope…</option>${list.map(s=>`<option value="${esc(s.id)}" ${s.id===active?.id?'selected':''}>${esc(s.name)}</option>`).join('')}${HailSlopes.legacy()?`<option value="legacy" ${active?.id==='legacy'?'selected':''}>Unassigned existing test square</option>`:''}</select></label><div class="field-actions"><button class="field-button" id="hailAddSlope">Add slope</button>${active&&active.id!=='legacy'?'<button class="field-button" id="hailRenameSlope">Rename slope</button>':''}</div><p>${active?'Current: '+esc(active.name):'Choose a roof layout or add a slope to begin.'}</p><ul>${list.map(s=>{const photos=Object.values(record.photos).filter(p=>p.hailSlopeId===s.id&&p.storageStatus!=='failed');return `<li>${esc(s.name)} — ${photos.some(p=>p.hailStep==='Test Square Full View')?'Full view captured':'Full view needed'} · ${photos.length} photos</li>`;}).join('')}</ul>${HailSlopes.legacy()?'<p>Older photos remain in the unassigned group; they have not been guessed onto a slope.</p>':''}`;
        panel.querySelector('#hailSlopeSelect').onchange=e=>{if(e.target.value)HailSlopes.go(e.target.value);};
        if(active?.id==='legacy'&&list.length){const button=document.createElement('button');button.className='field-button';button.id='hailAssignLegacy';button.textContent='Assign existing photos to a slope';panel.append(button);}
    };
    const add=(names)=>{const list=HailSlopes.list(),added=names.map(name=>({id:crypto.randomUUID(),name}));InspectionStore.note('hailSlopes',[...list,...added]);HailSlopes.go(added[0].id);};
    panel.onclick=event=>{
        if(event.target.id==='hailAssignLegacy'){
            const name=prompt('Enter the slope name for these existing photos. Available: '+HailSlopes.list().map(s=>s.name).join(', '));
            if(!name)return;const slope=HailSlopes.list().find(s=>s.name.toLowerCase()===name.trim().toLowerCase());
            if(!slope){alert('No matching slope. Add or rename a slope first.');return;}
            try{InspectionStore.assignLegacyHailSlope(slope.id);HailSlopes.go(slope.id);}catch(error){alert(error.message);}return;
        }
        const layout=event.target.closest('[data-layout]');if(layout){add(Array.from({length:Number(layout.dataset.layout)},(_,i)=>`Slope ${i+1}`));return;}
        if(event.target.id==='hailAddSlope'||event.target.id==='hailRenameSlope'){
            const current=HailSlopes.active(),name=prompt('Name this roof slope (e.g. Front main roof, Rear addition):',event.target.id==='hailRenameSlope'?current.name:'');
            if(!name?.trim())return;const clean=name.trim().slice(0,100);
            if(HailSlopes.list().some(s=>s.name.toLowerCase()===clean.toLowerCase()&&s.id!==(event.target.id==='hailRenameSlope'?current.id:null))){alert('Use a unique slope name.');return;}
            if(event.target.id==='hailAddSlope')add([clean]);else{InspectionStore.note('hailSlopes',HailSlopes.list().map(s=>s.id===current.id?{...s,name:clean}:s));render();}
        }
    };
    render();window.addEventListener('inspection-record-changed',render);
});
