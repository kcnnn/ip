// User-controlled handoff to real image search. No automatic external upload.
export function mountVisualSearch(panel,readState) {
    const section=document.createElement('section');section.className='field-preview';section.id='accessoryVisualSearch';
    section.innerHTML=`<h3>Search the internet by photo</h3><p>Use Google Lens to find visually similar accessories. This is separate from the AI description search below. No Claude key is needed.</p><ol><li>Download the selected accessory photo, or use its original from your device.</li><li>Open Google, choose the camera / Lens icon, and upload that photo. On a phone, use Lens in the Google app if the browser does not offer upload.</li><li>Crop the search area around the accessory. Compare product images, then check the manufacturer’s dimensions and markings.</li></ol><div class="field-actions"><button type="button" class="field-button" id="accessoryVisualDownload">Download selected photo</button><a class="field-button field-primary" id="accessoryVisualGoogle" href="https://www.google.com/" target="_blank" rel="noopener noreferrer">Open Google · choose Lens</a></div><p class="field-help">You choose the photo upload on Google. Opening the link does not send your photo, notes, API key or claim details. Results stay on Google; APEX does not automatically import or verify them. A similar appearance is not proof of an exact model or compatible replacement.</p><p id="accessoryVisualStatus" role="status"></p>`;
    panel.querySelector('summary').after(section);
    const status=section.querySelector('#accessoryVisualStatus');
    section.querySelector('#accessoryVisualDownload').onclick=async()=>{
        const note=readState(),id=note.photoId,record=InspectionStore.get(),revision=record.photos[id]?.revision;
        if(!id){status.textContent='Take or select the accessory photo first.';return;}
        try {
            const photo=await InspectionStore.getPhoto(id);
            if(record.id!==InspectionStore.get().id||readState().photoId!==id||InspectionStore.get().photos[id]?.revision!==revision)throw new Error('The selected photo changed. Try again.');
            const mime=/^data:image\/(png|jpeg|webp);base64,/i.exec(photo || '');
            if(!mime)throw new Error('The saved photo is unavailable. Use the original from your device or upload it again.');
            const link=document.createElement('a');link.href=photo;link.download=`roof-accessory.${mime[1].toLowerCase()==='jpeg'?'jpg':mime[1].toLowerCase()}`;link.click();
            status.textContent='Photo download requested. Open Google and upload this file using the camera / Lens icon. Nothing has been sent to Google yet.';
        }catch(error){status.textContent=error.message;}
    };
    return ()=>{status.textContent='Select the camera / Lens icon on Google to search with your actual photo—not its description.';section.scrollIntoView({behavior:'smooth',block:'start'});};
}
