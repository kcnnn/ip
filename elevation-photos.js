// Elevation Photos JavaScript

// Elevation data
const elevations = [
    {
        name: 'Front Elevation',
        icon: '01',
        instructions: 'Position yourself at the front of the property. Take a clear photo showing the entire front elevation from a good distance.',
        key: 'front'
    },
    {
        name: 'Right Elevation', 
        icon: '02',
        instructions: 'Move to the right side of the property. Capture the entire right elevation with good lighting and clear visibility.',
        key: 'right'
    },
    {
        name: 'Rear Elevation',
        icon: '03',
        instructions: 'Go to the back of the property. Take a comprehensive photo of the rear elevation.',
        key: 'rear'
    },
    {
        name: 'Left Elevation',
        icon: '04',
        instructions: 'Position yourself at the left side of the property. Capture the complete left elevation.',
        key: 'left'
    }
];

// Current state
let currentElevationIndex = 0;
let capturedPhotos = {};
let stream = null;
let isAnalyzing = false;

// DOM elements
const elevationTitle = document.getElementById('elevationTitle');
const elevationIcon = document.getElementById('elevationIcon');
const elevationInstructions = document.getElementById('elevationInstructions');
const elevationStatus = document.getElementById('elevationStatus');
const cameraPreview = document.getElementById('cameraPreview');
const photoActions = document.getElementById('photoActions');
const photoPreview = document.getElementById('photoPreview');
const captureBtn = document.getElementById('captureBtn');
const switchCameraBtn = document.getElementById('switchCameraBtn');
const retakeBtn = document.getElementById('retakeBtn');
const confirmBtn = document.getElementById('confirmBtn');
const fileInput = document.getElementById('fileInput');
const aiAnalysis = document.getElementById('aiAnalysis');
const aiLoading = document.getElementById('aiLoading');
const aiResults = document.getElementById('aiResults');
const nextBtn = document.getElementById('nextBtn');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const captureReadyTitle = document.getElementById('captureReadyTitle');

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    updateElevationDisplay();
    updateProgress();
    updateChecklist();
    setupEventListeners();
    renderElevationDetails();
    window.addEventListener('inspection-record-changed', renderElevationDetails);
});

function setupEventListeners() {
    captureBtn.addEventListener('click', openCamera);
    switchCameraBtn.addEventListener('click', switchCamera);
    retakeBtn.addEventListener('click', retakePhoto);
    confirmBtn.addEventListener('click', confirmPhoto);
    fileInput.addEventListener('change', handleFileSelect);
}

function updateElevationDisplay() {
    const currentElevation = elevations[currentElevationIndex];
    elevationTitle.textContent = currentElevation.name;
    elevationIcon.textContent = currentElevation.icon;
    elevationInstructions.textContent = currentElevation.instructions;
    captureReadyTitle.textContent = `Ready for the ${currentElevation.key}`;
    renderElevationDetails();
    
    // Update status
    const statusBadge = elevationStatus.querySelector('.status-badge');
    if (capturedPhotos[currentElevation.key]) {
        statusBadge.textContent = 'Completed';
        statusBadge.className = 'status-badge completed';
    } else {
        statusBadge.textContent = 'Pending';
        statusBadge.className = 'status-badge pending';
    }
}

function updateProgress() {
    const progress = ((currentElevationIndex + 1) / elevations.length) * 100;
    progressFill.style.width = `${progress}%`;
    progressText.textContent = `Step ${currentElevationIndex + 1} of ${elevations.length}`;
}

function updateChecklist() {
    const checklistItems = document.querySelectorAll('.checklist-item');
    checklistItems.forEach((item, index) => {
        const elevationKey = elevations[index].key;
        const statusIcon = item.querySelector('.checklist-status');
        
        item.classList.remove('current', 'completed', 'pending');
        
        if (index === currentElevationIndex) {
            item.classList.add('current');
            statusIcon.textContent = 'Current';
        } else if (capturedPhotos[elevationKey]) {
            item.classList.add('completed');
            statusIcon.textContent = 'Captured';
        } else {
            item.classList.add('pending');
            statusIcon.textContent = 'Next';
        }
    });

    const completedCount = Object.keys(capturedPhotos).length;
    const checklistCount = document.querySelector('.checklist-count');
    if (checklistCount) {
        checklistCount.textContent = `${completedCount} / ${elevations.length}`;
    }
}

function openCamera() {
    // For mobile devices, use file input with camera capture
    if (isMobile()) {
        fileInput.click();
    } else {
        // For desktop, show file picker
        fileInput.click();
    }
}

function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

async function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        const index = currentElevationIndex;
        try {
            const { preparePhoto } = await import('./photo-import.js');
            const prepared = await preparePhoto(file);
            if (index === currentElevationIndex) displayPhotoPreview(prepared.dataUrl);
        } catch (error) { alert(error.message || 'Photo could not be opened.'); }
        finally { event.target.value = ''; }
    }
}

function displayPhotoPreview(imageData) {
    // Hide camera preview, show photo preview
    cameraPreview.style.display = 'none';
    photoActions.style.display = 'block';
    
    // Display the captured photo
    photoPreview.innerHTML = `<img src="${imageData}" alt="Captured photo">`;
    
    // Store the photo data
    capturedPhotos[elevations[currentElevationIndex].key] = imageData;
    window.InspectionStore?.recordPhoto('Elevations', elevations[currentElevationIndex].name, imageData);
    
    // Update UI
    updateElevationDisplay();
    updateChecklist();
}

function retakePhoto() {
    // Reset photo capture
    photoActions.style.display = 'none';
    cameraPreview.style.display = 'block';
    
    // Clear stored photo
    delete capturedPhotos[elevations[currentElevationIndex].key];
    window.InspectionStore?.removePhoto('Elevations', elevations[currentElevationIndex].name);
    
    // Update UI
    updateElevationDisplay();
    updateChecklist();
    
    // Reset file input
    fileInput.value = '';
}

function confirmPhoto() {
    // Show AI analysis
    showAIAnalysis();
}

function showAIAnalysis() {
    aiAnalysis.style.display = 'block';
    aiLoading.style.display = 'block';
    aiResults.style.display = 'none';
    
    // Update status to analyzing
    const statusBadge = elevationStatus.querySelector('.status-badge');
    statusBadge.textContent = 'Analyzing';
    statusBadge.className = 'status-badge analyzing';
    
    // Simulate AI analysis
    setTimeout(() => {
        analyzePhotoWithAI();
    }, 2000);
}

async function analyzePhotoWithAI() {
    try {
        // Check if API key is configured
        if (!isAPIKeyConfigured()) {
            // Show API setup prompt
            showAPISetupPrompt();
            return;
        }
        
        // Get the current elevation type
        const currentElevation = elevations[currentElevationIndex];
        const elevationType = currentElevation.name.toLowerCase();
        
        // Get the captured photo data
        const photoData = capturedPhotos[currentElevation.key];
        if (!photoData) {
            throw new Error('No photo data available for analysis');
        }
        
        // Resize image for API efficiency
        const resizedImageData = await resizeImageForAPI(photoData);
        
        // Call ChatGPT API
        const analysisResults = await analyzePhotoWithChatGPT(resizedImageData, elevationType);
        displayAIResults(analysisResults);
        
    } catch (error) {
        console.error('AI Analysis Error:', error);
        
        // Fallback to simulated analysis if API fails
        const fallbackResults = simulateAIAnalysis();
        fallbackResults.apiError = error.message;
        displayAIResults(fallbackResults);
    }
}

function simulateAIAnalysis() {
    // Simulate AI analysis results
    const issues = [];
    const recommendations = [];
    
    // Randomly generate some issues for demonstration
    if (Math.random() > 0.7) {
        issues.push({
            type: 'clarity',
            message: 'Photo appears slightly blurry',
            severity: 'warning'
        });
    }
    
    if (Math.random() > 0.8) {
        issues.push({
            type: 'distance',
            message: 'Photo may be too close to capture full elevation',
            severity: 'error'
        });
    }
    
    if (Math.random() > 0.6) {
        recommendations.push('Consider taking photo from a greater distance');
    }
    
    if (Math.random() > 0.5) {
        recommendations.push('Ensure good lighting for better clarity');
    }
    
    return {
        overallQuality: issues.length === 0 ? 'good' : 'needs_improvement',
        issues: issues,
        recommendations: recommendations,
        confidence: Math.floor(Math.random() * 30) + 70 // 70-100%
    };
}

function displayAIResults(results) {
    aiLoading.style.display = 'none';
    aiResults.style.display = 'block';
    
    let html = '<div class="ai-analysis-content">';
    
    // Show API error if present
    if (results.apiError) {
        html += `<div class="api-error">
            <h4>⚠️ API Error</h4>
            <p>${results.apiError}</p>
            <p><small>Using fallback analysis instead.</small></p>
        </div>`;
    }
    
    // Overall quality
    const qualityClass = results.overallQuality === 'good' ? 'quality-good' : 'quality-warning';
    const qualityText = results.overallQuality === 'good' ? 'Good' : 
                       results.overallQuality === 'poor' ? 'Poor' : 'Needs Improvement';
    
    html += `<div class="quality-indicator ${qualityClass}">
        <h4>Photo Quality: ${qualityText}</h4>
        <p>Confidence: ${results.confidence}%</p>
    </div>`;

    const downspoutVisible = results.downspoutVisible === true ||
        (typeof results.downspoutVisible === 'string' && /^(true|yes)$/i.test(results.downspoutVisible.trim()));
    if (elevations[currentElevationIndex]?.key === 'front' && downspoutVisible) {
        html += `<div class="downspout-handoff">
            <strong>Downspout visible</strong>
            <span>Document the gutter size in the upcoming roof-edge photo step.</span>
        </div>`;
    }
    
    // Issues
    if (results.issues && results.issues.length > 0) {
        html += '<div class="issues-section"><h4>Issues Found:</h4><ul>';
        results.issues.forEach(issue => {
            const severityClass = issue.severity === 'high' ? 'issue-error' : 
                                 issue.severity === 'medium' ? 'issue-warning' : 'issue-info';
            html += `<li class="${severityClass}">
                <strong>${issue.type.charAt(0).toUpperCase() + issue.type.slice(1)}:</strong> ${issue.message}
            </li>`;
        });
        html += '</ul></div>';
    }
    
    // Recommendations
    if (results.recommendations && results.recommendations.length > 0) {
        html += '<div class="recommendations-section"><h4>Recommendations:</h4><ul>';
        results.recommendations.forEach(rec => {
            html += `<li>${rec}</li>`;
        });
        html += '</ul></div>';
    }
    
    // Action buttons based on analysis
    const shouldRetake = results.shouldRetake || results.overallQuality === 'poor';
    
    if (results.overallQuality === 'good' && !shouldRetake) {
        html += '<div class="ai-actions"><button class="action-btn primary" onclick="proceedToNextElevation()">Continue to Next Photo</button></div>';
    } else {
        html += '<div class="ai-actions">';
        html += '<button class="action-btn secondary" onclick="retakePhoto()">Retake Photo</button>';
        html += '<button class="action-btn primary" onclick="proceedToNextElevation()">Continue</button>';
        html += '</div>';
    }
    
    html += '</div>';
    
    aiResults.innerHTML = html;
    const detailButton = document.createElement('button');
    detailButton.type = 'button'; detailButton.className = 'action-btn secondary';
    detailButton.textContent = `Add detail photos · ${elevations[currentElevationIndex].name}`;
    detailButton.addEventListener('click', () => InspectionField.startElevationDetail(elevations[currentElevationIndex].key));
    aiResults.querySelector('.ai-actions').prepend(detailButton);
    renderElevationDetails();
    
    // Update status
    const statusBadge = elevationStatus.querySelector('.status-badge');
    if (results.overallQuality === 'good' && !shouldRetake) {
        statusBadge.textContent = 'Completed';
        statusBadge.className = 'status-badge completed';
    } else {
        statusBadge.textContent = 'Issues Found';
        statusBadge.className = 'status-badge analyzing';
    }
}

// Additional photos never replace an elevation overview or another close-up.
function renderElevationDetails() {
    if (!window.InspectionStore || !window.InspectionField) return;
    let panel = document.getElementById('elevationDetailPanel');
    if (!panel) {
        panel = document.createElement('section'); panel.id = 'elevationDetailPanel'; panel.className = 'field-note-panel';
        aiAnalysis.after(panel);
    }
    const elevation = elevations[currentElevationIndex];
    const record = InspectionStore.get();
    const escape = InspectionField.escape;
    const photos = Object.entries(record.photos).filter(([,photo]) => photo.section === 'Elevations' && photo.elevationKey === elevation.key);
    panel.innerHTML = `<h3>${escape(elevation.name)} · Detail photos</h3><p>Windows, screens, downspouts, doors, garage doors, trim and siding. Capture one detail, describe it, then analyze and save.</p><button type="button" class="field-button field-primary" id="addElevationDetail">Add detail photos</button><p>${photos.length} close-up photo${photos.length === 1 ? '' : 's'} saved for this elevation.</p><div class="elevation-detail-grid">${photos.map(([id,photo]) => {
        const note = Object.values(record.observations).find(item => item.photoId === id);
        return `<article>${photo.thumbnail ? `<img src="${escape(photo.thumbnail)}" alt="${escape(photo.label)}">` : ''}<strong>${escape(note?.component || 'Detail photo')}</strong><p>${escape(note?.details || 'Photo saved · note not yet added to report')}</p>${note?.aiReview ? `<p>AI review: ${escape(note.aiReview.status.replaceAll('_', ' '))}</p>` : ''}<button type="button" class="field-button" data-detail-photo="${escape(id)}">${note ? 'Review / edit' : 'Describe & analyze'}</button></article>`;
    }).join('')}</div>`;
    panel.querySelector('#addElevationDetail').onclick = () => InspectionField.startElevationDetail(elevation.key);
    panel.querySelectorAll('[data-detail-photo]').forEach(button => { button.onclick = () => {
        const note = Object.values(InspectionStore.get().observations).find(item => item.photoId === button.dataset.detailPhoto);
        if (!confirm('Open this detail? Any unfinished changes in the field notebook will be replaced.')) return;
        InspectionField.editNote(note || {section:'Elevations', elevationKey:elevation.key, photoId:button.dataset.detailPhoto});
    }; });
}

function proceedToNextElevation() {
    // Hide AI analysis
    aiAnalysis.style.display = 'none';
    
    // Move to next elevation
    if (currentElevationIndex < elevations.length - 1) {
        currentElevationIndex++;
        updateElevationDisplay();
        updateProgress();
        updateChecklist();
        
        // Reset photo capture UI
        photoActions.style.display = 'none';
        cameraPreview.style.display = 'block';
        fileInput.value = '';
    } else {
        // All elevations completed
        allElevationsCompleted();
    }
}

function allElevationsCompleted() {
    // Enable next button
    nextBtn.disabled = false;
    nextBtn.innerHTML = '<span class="btn-text">Continue to Roof Edge</span><span class="btn-icon">→</span>';
    
    // Show completion message
    alert('All elevation photos completed! Ready to proceed to roof edge inspection.');
}

function switchCamera() {
    // This would switch between front/back camera on mobile
    // For now, just show a message
    alert('Camera switching functionality will be implemented for mobile devices.');
}

function goBack() {
    if (currentElevationIndex > 0) {
        currentElevationIndex--;
        updateElevationDisplay();
        updateProgress();
        updateChecklist();
        
        // Reset UI
        photoActions.style.display = 'none';
        cameraPreview.style.display = 'block';
        aiAnalysis.style.display = 'none';
        fileInput.value = '';
    } else {
        // Go back to home page
        window.location.href = 'index.html';
    }
}

function proceedToNext() {
    if (nextBtn.disabled) {
        return;
    }
    
    // Navigate to roof edge inspection
    window.location.href = 'roof-edge.html';
}

function showAPISetupPrompt() {
    const setupPrompt = document.createElement('div');
    setupPrompt.className = 'api-setup-prompt';
    setupPrompt.innerHTML = `
        <div class="prompt-content">
            <h3>🔑 API Key Required</h3>
            <p>To enable AI photo analysis, you need to configure your ChatGPT API key.</p>
            <div class="prompt-actions">
                <button class="action-btn secondary" onclick="proceedWithoutAPI()">Continue Without AI</button>
                <button class="action-btn primary" onclick="goToAPISetup()">Setup API Key</button>
            </div>
        </div>
    `;
    
    // Add to page
    document.body.appendChild(setupPrompt);
    
    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        .api-setup-prompt {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        }
        
        .prompt-content {
            background: white;
            padding: 2rem;
            border-radius: 15px;
            text-align: center;
            max-width: 400px;
            margin: 1rem;
        }
        
        .prompt-content h3 {
            margin: 0 0 1rem 0;
            color: #2c3e50;
        }
        
        .prompt-content p {
            margin: 0 0 1.5rem 0;
            color: #666;
        }
        
        .prompt-actions {
            display: flex;
            gap: 1rem;
            justify-content: center;
        }
        
        @media (max-width: 480px) {
            .prompt-actions {
                flex-direction: column;
            }
            
            .action-btn {
                width: 100%;
            }
        }
    `;
    document.head.appendChild(style);
}

function goToAPISetup() {
    window.location.href = 'api-setup.html';
}

function proceedWithoutAPI() {
    // Remove the prompt
    const prompt = document.querySelector('.api-setup-prompt');
    if (prompt) {
        prompt.remove();
    }
    
    // Continue with fallback analysis
    const fallbackResults = simulateAIAnalysis();
    displayAIResults(fallbackResults);
}

// Add CSS for AI analysis results
const style = document.createElement('style');
style.textContent = `
    .ai-analysis-content {
        padding: 1rem 0;
    }
    
    .quality-indicator {
        padding: 1rem;
        border-radius: 8px;
        margin-bottom: 1rem;
        text-align: center;
    }
    
    .quality-good {
        background: #e8f5e8;
        border: 2px solid #4CAF50;
        color: #2e7d32;
    }
    
    .quality-warning {
        background: #fff3e0;
        border: 2px solid #ff9800;
        color: #e65100;
    }

    .downspout-handoff {
        display: grid;
        gap: 0.25rem;
        margin-bottom: 1rem;
        padding: 1rem 1.1rem;
        background: #f4f8fc;
        border-left: 4px solid #e01719;
        color: #272a2d;
    }
    
    .issues-section, .recommendations-section {
        margin-bottom: 1rem;
    }
    
    .issues-section h4, .recommendations-section h4 {
        margin: 0 0 0.5rem 0;
        color: #2c3e50;
    }
    
    .issues-section ul, .recommendations-section ul {
        margin: 0;
        padding-left: 1.5rem;
    }
    
    .issues-section li {
        margin-bottom: 0.5rem;
        padding: 0.5rem;
        border-radius: 4px;
    }
    
    .issue-error {
        background: #ffebee;
        color: #c62828;
        border-left: 4px solid #f44336;
    }
    
    .issue-warning {
        background: #fff8e1;
        color: #f57c00;
        border-left: 4px solid #ff9800;
    }
    
    .recommendations-section li {
        background: #f0f8ff;
        color: #1565c0;
        border-left: 4px solid #2f6b4f;
        padding: 0.5rem;
        border-radius: 4px;
        margin-bottom: 0.5rem;
    }
    
    .ai-actions {
        display: flex;
        gap: 1rem;
        justify-content: center;
        margin-top: 1.5rem;
    }
    
    @media (max-width: 480px) {
        .ai-actions {
            flex-direction: column;
        }
        
    .ai-actions .action-btn {
        width: 100%;
    }
}

.api-error {
    background: #ffebee;
    border: 2px solid #f44336;
    border-radius: 8px;
    padding: 1rem;
    margin-bottom: 1rem;
    color: #c62828;
}

.api-error h4 {
    margin: 0 0 0.5rem 0;
    color: #d32f2f;
}

.api-error p {
    margin: 0.5rem 0;
}

.issue-info {
    background: #edf5ee;
    color: #1565c0;
    border-left: 4px solid #2f6b4f;
}
`;
document.head.appendChild(style);
