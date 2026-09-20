// Optional decision support. Never changes or saves inspection findings.
export function mountJevAssistant(form, readState) {
    const panel=document.createElement('details');
    panel.className='field-dictation-first';
    panel.innerHTML=`<summary>Suggested next step · TypeSafe Jev</summary><p class="field-help">Read the selected photo with your configured photo AI, then send its written findings and your note to TypeSafe for a suggested next step. Label readings can include manufacturer, model and serial number. Jev receives text, not the photo; it does not verify damage or search the web.</p><label>APEX Jev access code<input type="password" id="jevAccess" autocomplete="off" placeholder="Access code from your administrator"></label><p class="field-help">Not your TypeSafe API key. The code stays only in this open page.</p><button type="button" class="field-button" id="jevAsk">Suggest next step</button><p id="jevPhotoReading" style="white-space:pre-wrap"></p><p id="jevStatus" role="status"></p><p class="field-help">Check label readings against your photo. Suggestions are not automatically added to the report. Automated manufacturer-document research is not connected.</p>`;
    form.querySelector('.field-extraction-heading').before(panel);
    const button=panel.querySelector('#jevAsk'), status=panel.querySelector('#jevStatus');
    let busy=false;
    const snapshot=()=>{
        const note=readState();
        return JSON.stringify({section:note.section,component:note.component,note:note.details,photoReview:note.aiReview ? `${note.aiReview.summary}\n${note.aiReview.checks.join('\n')}` : ''});
    };
    const identity=()=>JSON.stringify({state:snapshot(),photoId:readState().photoId,record:InspectionStore.get().id,revision:InspectionStore.get().photos[readState().photoId]?.revision});
    button.onclick=async()=>{
        if (busy) return;
        const code=panel.querySelector('#jevAccess').value;
        if (!code) {status.textContent='Enter your APEX Jev access code first.';return;}
        const state=snapshot();
        const initial=identity(), photoId=readState().photoId;
        if (!JSON.parse(state).note.trim() && !JSON.parse(state).photoReview && !photoId) {status.textContent='Add a note or select a photo first.';return;}
        busy=true;button.disabled=true;status.textContent='Asking Jev…';
        panel.querySelector('#jevPhotoReading').textContent='';
        const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),60000);
        try {
            const payload=JSON.parse(state);
            if (photoId) {
                status.textContent='Reading the selected photo before asking Jev…';
                const photo=await InspectionStore.getPhoto(photoId);
                if (!photo) throw new Error('The selected photo is unavailable. Select or upload it again.');
                const {readJevPhoto}=await import('./jev-photo-context.js');
                payload.photoReview=await Promise.race([readJevPhoto(photo,controller.signal),new Promise((_,reject)=>controller.signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')),{once:true}))]);
                if (identity()!==initial) {status.textContent='The observation changed. Ask Jev again for the current photo and note.';return;}
                panel.querySelector('#jevPhotoReading').textContent=payload.photoReview;
                status.textContent='Asking Jev with the photo reading…';
            }
            const response=await fetch('/api/jev-next-step',{method:'POST',signal:controller.signal,headers:{'Content-Type':'application/json','x-apex-jev-access':code},body:JSON.stringify(payload)});
            if (!(response.headers.get('content-type') || '').includes('application/json')) throw new Error('Jev requires the deployed Vercel site (or vercel dev). The static local preview cannot run its server function.');
            const result=await response.json();
            if (!response.ok) throw new Error(result.error || 'Jev is unavailable.');
            if (identity()!==initial) {status.textContent='The observation changed. Ask Jev again for the current note.';return;}
            if (typeof result.message!=='string') throw new Error('Jev returned an incomplete response.');
            status.textContent=`Jev suggestion: ${result.message}`;
        } catch(error) {status.textContent=error.name==='AbortError'?'Jev timed out. Your note is unchanged.':error.message;}
        finally {clearTimeout(timer);busy=false;button.disabled=false;}
    };
    form.addEventListener('input',event=>{if (!panel.contains(event.target)) {status.textContent='';panel.querySelector('#jevPhotoReading').textContent='';}});
    form.addEventListener('reset',()=>{status.textContent='';panel.querySelector('#jevPhotoReading').textContent='';panel.querySelector('#jevAccess').value='';});
}
