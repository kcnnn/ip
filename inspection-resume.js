/* Restore each existing capture page without re-saving or re-analyzing its photos. */
document.addEventListener('DOMContentLoaded', async () => {
    const section = InspectionField.currentSection();
    const definition = InspectionField.sections.find(item => item[0] === section);
    if (section === 'Interview') return;
    if (section === 'Shingles' && new URLSearchParams(location.search).get('item') === '2') { location.replace('brittle-test.html'); return; }
    const record = InspectionStore.get();
    const toolbar = document.querySelector('.field-toolbar nav');
    const status = document.createElement('span'); status.className = 'field-help'; status.setAttribute('role', 'status');
    status.textContent = 'Restoring saved photos…'; toolbar.append(status);
    const controls = [...document.querySelectorAll('#captureBtn,#confirmBtn,#retakeBtn,#fileInput')];
    controls.forEach(control => { control.disabled = true; });
    const values = await Promise.all(Object.entries(record.photos).filter(([, photo]) => photo.section === section).map(async ([id, photo]) => {
        try { return { id, photo, data: await InspectionStore.getPhoto(id) }; }
        catch { return { id, photo, data: null }; }
    }));
    let items = definition[2];
    let selected = Number(new URLSearchParams(location.search).get('item') || 0);
    if (!Number.isInteger(selected) || selected < 0 || selected >= items.length) selected = 0;
    let activeData = null;
    const restoreMap = (list, setter, refresh) => {
        values.forEach(({ photo, data }) => {
            const item = list.find(item => item.name === photo.label);
            if (item && data) capturedPhotos[item.key] = data;
        });
        setter(selected); refresh();
        activeData = capturedPhotos[list[selected].key];
    };
    switch (section) {
        case 'Elevations': restoreMap(elevations, value => { currentElevationIndex = value; }, updateElevationDisplay); break;
        case 'Roof edge':
            if (record.absences['Roof edge:Gutter Measurement'] || record.absences['Roof edge:Gutter measurement']) skippedInspections.gutter = true;
            restoreMap(inspections, value => { currentInspectionIndex = value; }, updateInspectionDisplay); break;
        case 'Shingles': restoreMap(inspections, value => { currentInspectionIndex = value; }, updateInspectionDisplay); break;
        case 'Roof overview': restoreMap(overviewPhotos, value => { currentPhotoIndex = value; }, updatePhotoDisplay); updateCompass(); break;
        case 'Hail documentation':
            values.forEach(({ photo, data }) => {
                if (!data) return;
                if (photo.label === items[0]) testSquarePhoto = data;
                else { const index = items.indexOf(photo.label) - 1; if (index >= 0) closeupPhotos[index] = data; }
            });
            currentStep = selected ? `closeup-${selected}` : 'test-square';
            activeData = selected ? closeupPhotos[selected - 1] : testSquarePhoto;
            updateStepDisplay(); break;
        case 'Accessories':
            values.filter(value => value.data).forEach(({ id, photo, data }) => {
                const type = photo.accessoryType || Object.values(accessoryTypes).find(type => type.name === photo.label) || accessoryTypes.other;
                capturedPhotos.push({ id: photo.accessoryId || id, recordId: id, type, photoData: data, analysis: null });
            });
            selected = Number(new URLSearchParams(location.search).get('item') || 0);
            if (!Number.isInteger(selected) || selected < 0 || selected >= capturedPhotos.length) selected = 0;
            currentAccessoryIndex = selected;
            items = capturedPhotos.map((photo, index) => `${photo.type.name} ${index + 1}`);
            activeData = capturedPhotos[selected]?.photoData;
            if (capturedPhotos[selected]) selectedAccessoryType = Object.keys(accessoryTypes).find(key => accessoryTypes[key].name === capturedPhotos[selected].type.name) || 'other';
            updatePhotoDisplay(); break;
    }
    updateProgress(); updateChecklist();
    if (activeData) {
        cameraPreview.style.display = 'none'; photoActions.style.display = 'block';
        const image = document.createElement('img'); image.src = activeData; image.alt = 'Saved inspection photo';
        photoPreview.replaceChildren(image);
    }
    controls.forEach(control => { control.disabled = false; });
    status.textContent = values.some(value => !value.data) ? 'Some older photos only have thumbnails. View them in Review; upload originals to re-analyze.' : 'Saved photos restored';
    if (!items.length) return;
    const label = document.createElement('label'); label.textContent = 'Photo step';
    const select = document.createElement('select'); select.id = 'fieldPhotoJump';
    items.forEach((name, index) => select.add(new Option(name, index)));
    select.value = selected; label.append(select); toolbar.append(label);
    select.addEventListener('change', async () => {
        const saves = await InspectionStore.flush();
        if (saves.some(value => value === false)) return;
        location.href = section === 'Shingles' && select.value === '2' ? 'brittle-test.html' : `${definition[1]}?item=${select.value}`;
    });
    // Existing next/back controls still work; keep the new jump selector in sync.
    const title = document.querySelector('#elevationTitle,#inspectionTitle,#photoTitle');
    if (title) new MutationObserver(() => {
        const index = section === 'Elevations' ? currentElevationIndex : ['Roof edge', 'Shingles'].includes(section) ? currentInspectionIndex : section === 'Roof overview' ? currentPhotoIndex : section === 'Accessories' ? currentAccessoryIndex : currentStep === 'test-square' ? 0 : Number(currentStep.split('-')[1]);
        select.value = index;
    }).observe(title, { childList: true });
});
