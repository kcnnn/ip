document.addEventListener('DOMContentLoaded', () => {
    const dialog = document.getElementById('workspaceChoice');
    document.querySelector('.home-primary').addEventListener('click', event => {
        if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        const record = InspectionStore.get();
        const count = Object.keys(record.photos || {}).length;
        const notes = Object.keys(record.observations || {}).length;
        document.getElementById('workspaceCurrent').textContent = `${record.property?.address || 'Current inspection'} · ${count} photos · ${notes} observations`;
        document.getElementById('workspaceError').textContent = '';
        dialog.showModal();
        document.getElementById('workspaceContinue').focus();
    });
    document.getElementById('workspaceCancel').addEventListener('click', () => dialog.close());
    document.getElementById('workspaceContinue').addEventListener('click', () => { location.href = 'inspection-workspace.html'; });
    document.getElementById('workspaceNew').addEventListener('click', () => {
        if (!confirm('Start a new workspace and replace the current inspection record on this browser? This clears its property details, photos and notes from the active record.')) return;
        try { InspectionStore.startNew(); location.href = 'inspection-workspace.html'; }
        catch { document.getElementById('workspaceError').textContent = 'Unable to start a new workspace. Your current page was kept open; check browser storage and try again.'; }
    });
});
