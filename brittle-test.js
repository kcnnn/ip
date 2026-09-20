document.addEventListener('DOMContentLoaded', () => {
    // Move the live notebook, preserving its handlers and any unfinished draft.
    const form = document.getElementById('fieldNoteForm');
    document.getElementById('brittleCapture').append(form);
    document.getElementById('fieldNotebook')?.remove();
    const story = form.querySelector('[aria-label="Dictate your observation"]');
    story.querySelector('h3').textContent = 'Tell us about the test.';
    story.querySelector('.field-help').textContent = 'Speak naturally after your photo. Say where you tested, what you did, and what happened. If you did not test, explain why. Only mention temperatures you actually measured.';
    const prompts = story.querySelector('.field-recall');
    prompts.replaceChildren(...['Which slope?', 'Conditions / temperature?', 'What did you do?', 'What changed?', 'Stopped or restored?'].map(text => {const span=document.createElement('span');span.textContent=text;return span;}));
    prompts.nextElementSibling.textContent = 'For example: “Front slope near the eave. Brittle test not performed because the shingles were cold and stiff. No shingles disturbed.”';
    form.elements.details.placeholder = 'Describe your brittle test, or why it was not performed. Your original words stay here.';
    const existing = InspectionStore.get().notes.fieldDraft;
    if (existing && (existing.details || existing.photoId) && !existing.brittleTest) {
        const notice = document.createElement('p');notice.className='field-preview';
        notice.textContent='Your previous unfinished note is still here. Save it or use “New / clear draft” before starting the brittle test.';
        form.prepend(notice);
    }
});
