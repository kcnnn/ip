// Optional decision support. Never changes or saves inspection findings.
export function mountJevAssistant(form, readState) {
    const panel=document.createElement('details');
    panel.className='field-dictation-first';
    panel.innerHTML=`<summary>Suggested next step · TypeSafe Jev</summary><p class="field-help">Optional: send this note, component and existing AI photo-review text to TypeSafe through APEX. Photos and property-record fields are not sent by this step. Jev suggests evidence to collect; it does not verify damage or search the web.</p><label>APEX Jev access code<input type="password" id="jevAccess" autocomplete="off" placeholder="Access code from your administrator"></label><p class="field-help">Not your TypeSafe API key. The code stays only in this open page.</p><button type="button" class="field-button" id="jevAsk">Suggest next step</button><p id="jevStatus" role="status"></p><p class="field-help">Suggestions are not automatically added to the report. Equipment identification and sourced web research are not connected in this first version.</p>`;
    form.querySelector('.field-extraction-heading').before(panel);
    const button=panel.querySelector('#jevAsk'), status=panel.querySelector('#jevStatus');
    let busy=false;
    const snapshot=()=>{
        const note=readState();
        return JSON.stringify({section:note.section,component:note.component,note:note.details,photoReview:note.aiReview ? `${note.aiReview.summary}\n${note.aiReview.checks.join('\n')}` : ''});
    };
    button.onclick=async()=>{
        if (busy) return;
        const code=panel.querySelector('#jevAccess').value;
        if (!code) {status.textContent='Enter your APEX Jev access code first.';return;}
        const state=snapshot();
        if (!JSON.parse(state).note.trim() && !JSON.parse(state).photoReview) {status.textContent='Add a note or analyze a photo first.';return;}
        busy=true;button.disabled=true;status.textContent='Asking Jev…';
        const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),20000);
        try {
            const response=await fetch('/api/jev-next-step',{method:'POST',signal:controller.signal,headers:{'Content-Type':'application/json','x-apex-jev-access':code},body:state});
            if (!(response.headers.get('content-type') || '').includes('application/json')) throw new Error('Jev requires the deployed Vercel site (or vercel dev). The static local preview cannot run its server function.');
            const result=await response.json();
            if (!response.ok) throw new Error(result.error || 'Jev is unavailable.');
            if (snapshot()!==state) {status.textContent='The observation changed. Ask Jev again for the current note.';return;}
            if (typeof result.message!=='string') throw new Error('Jev returned an incomplete response.');
            status.textContent=`Jev suggestion: ${result.message}`;
        } catch(error) {status.textContent=error.name==='AbortError'?'Jev timed out. Your note is unchanged.':error.message;}
        finally {clearTimeout(timer);busy=false;button.disabled=false;}
    };
    form.addEventListener('input',event=>{if (!panel.contains(event.target)) status.textContent='';});
    form.addEventListener('reset',()=>{status.textContent='';panel.querySelector('#jevAccess').value='';});
}
