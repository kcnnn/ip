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
    // Existing unassigned photos remain their own square; never guess their slope.
    if(!HailSlopes.list().length&&!HailSlopes.legacy())InspectionStore.note('hailSlopes',[{id:crypto.randomUUID(),name:'Slope 1'}]);
    const panel=document.createElement('div');panel.id='hailSlopePanel';panel.style.marginBottom='24px';
    document.querySelector('.main-content').prepend(panel);
    const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const render=()=>{
        const list=HailSlopes.list(),active=HailSlopes.active();
        const multiple=list.length+Number(HailSlopes.legacy())>1;
        panel.innerHTML=`<div class="field-actions"><button class="field-button" id="hailAddSlope">Add slope</button></div>${multiple?`<label>Current slope<select id="hailSlopeSelect">${list.map(s=>`<option value="${esc(s.id)}" ${s.id===active?.id?'selected':''}>${esc(s.name)}</option>`).join('')}${HailSlopes.legacy()?`<option value="legacy" ${active?.id==='legacy'?'selected':''}>Unassigned existing test square</option>`:''}</select></label>${active&&active.id!=='legacy'?'<button class="field-button" id="hailRenameSlope">Rename slope</button>':''}`:''}`;
        const select=panel.querySelector('#hailSlopeSelect');
        if(select)select.onchange=e=>{if(e.target.value)HailSlopes.go(e.target.value);};
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
        if(event.target.id==='hailAddSlope'){
            let number=HailSlopes.list().length+1;
            while(HailSlopes.list().some(s=>s.name.toLowerCase()===`slope ${number}`))number++;
            add([`Slope ${number}`]);return;
        }
        if(event.target.id==='hailAddSlope'||event.target.id==='hailRenameSlope'){
            const current=HailSlopes.active(),name=prompt('Name this roof slope (e.g. Front main roof, Rear addition):',event.target.id==='hailRenameSlope'?current.name:'');
            if(!name?.trim())return;const clean=name.trim().slice(0,100);
            if(HailSlopes.list().some(s=>s.name.toLowerCase()===clean.toLowerCase()&&s.id!==(event.target.id==='hailRenameSlope'?current.id:null))){alert('Use a unique slope name.');return;}
            if(event.target.id==='hailAddSlope')add([clean]);else{InspectionStore.note('hailSlopes',HailSlopes.list().map(s=>s.id===current.id?{...s,name:clean}:s));render();}
        }
    };
    render();window.addEventListener('inspection-record-changed',render);
});
