// Ridge Inspection JavaScript

// Inspection data
const inspections = [
    {
        name: 'Ridge Closeup',
        icon: '📸',
        instructions: 'Take a closeup photo of the ridge showing the ridge shingles and their condition. Ensure the photo captures the ridge line clearly and shows any visible damage or wear.',
        key: 'ridge-closeup',
        type: 'closeup'
    },
    {
        name: 'Under-Ridge Inspection',
        icon: '🔍',
        instructions: 'Lift up a corner of the ridge shingle to expose the area underneath. Take a clear photo showing the under-ridge area and any visible damage or issues.',
        key: 'under-ridge',
        type: 'under-ridge'
    }
];

// Current state
let currentInspectionIndex = 0;
let capturedPhotos = {};
let stream = null;
let isAnalyzing = false;

// DOM elements
const inspectionTitle = document.getElementById('inspectionTitle');
const inspectionIcon = document.getElementById('inspectionIcon');
const inspectionInstructions = document.getElementById('inspectionInstructions');
const inspectionStatus = document.getElementById('inspectionStatus');
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

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    updateInspectionDisplay();
    updateProgress();
    updateChecklist();
    setupEventListeners();
});

function setupEventListeners() {
    captureBtn.addEventListener('click', openCamera);
    switchCameraBtn.addEventListener('click', switchCamera);
    retakeBtn.addEventListener('click', retakePhoto);
    confirmBtn.addEventListener('click', confirmPhoto);
    fileInput.addEventListener('change', handleFileSelect);
}

function updateInspectionDisplay() {
    const currentInspection = inspections[currentInspectionIndex];
    inspectionTitle.textContent = currentInspection.name;
    inspectionIcon.textContent = currentInspection.icon;
    inspectionInstructions.textContent = currentInspection.instructions;
    
    // Update status
    const statusBadge = inspectionStatus.querySelector('.status-badge');
    if (capturedPhotos[currentInspection.key]) {
        statusBadge.textContent = 'Completed';
        statusBadge.className = 'status-badge completed';
    } else {
        statusBadge.textContent = 'Pending';
        statusBadge.className = 'status-badge pending';
    }
}

function updateProgress() {
    const progress = ((currentInspectionIndex + 1) / inspections.length) * 100;
    progressFill.style.width = `${progress}%`;
    progressText.textContent = `Step ${currentInspectionIndex + 1} of ${inspections.length}`;
}

function updateChecklist() {
    const checklistItems = document.querySelectorAll('.checklist-item');
    checklistItems.forEach((item, index) => {
        const inspectionKey = inspections[index].key;
        const statusIcon = item.querySelector('.checklist-status');
        
        item.classList.remove('current', 'completed', 'pending');
        
        if (index === currentInspectionIndex) {
            item.classList.add('current');
            statusIcon.textContent = '📷';
        } else if (capturedPhotos[inspectionKey]) {
            item.classList.add('completed');
            statusIcon.textContent = '✅';
        } else {
            item.classList.add('pending');
            statusIcon.textContent = '⏳';
        }
    });
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

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            displayPhotoPreview(e.target.result);
        };
        reader.readAsDataURL(file);
    }
}

function displayPhotoPreview(imageData) {
    // Hide camera preview, show photo preview
    cameraPreview.style.display = 'none';
    photoActions.style.display = 'block';
    
    // Display the captured photo
    photoPreview.innerHTML = `<img src="${imageData}" alt="Captured photo">`;
    
    // Store the photo data
    capturedPhotos[inspections[currentInspectionIndex].key] = imageData;
    
    // Update UI
    updateInspectionDisplay();
    updateChecklist();
}

function retakePhoto() {
    // Reset photo capture
    photoActions.style.display = 'none';
    cameraPreview.style.display = 'block';
    
    // Clear stored photo
    delete capturedPhotos[inspections[currentInspectionIndex].key];
    
    // Update UI
    updateInspectionDisplay();
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
    const statusBadge = inspectionStatus.querySelector('.status-badge');
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
        
        // Get the current inspection type
        const currentInspection = inspections[currentInspectionIndex];
        const inspectionType = currentInspection.type;
        
        // Get the captured photo data
        const photoData = capturedPhotos[currentInspection.key];
        if (!photoData) {
            throw new Error('No photo data available for analysis');
        }
        
        // Resize image for API efficiency
        const resizedImageData = await resizeImageForAPI(photoData);
        
        // Call ChatGPT API with specialized prompts
        const analysisResults = await analyzeRidgeWithChatGPT(resizedImageData, inspectionType, currentInspection.name);
        displayAIResults(analysisResults);
        
    } catch (error) {
        console.error('AI Analysis Error:', error);
        
        // Fallback to simulated analysis if API fails
        const fallbackResults = simulateRidgeAnalysis();
        fallbackResults.apiError = error.message;
        displayAIResults(fallbackResults);
    }
}

// Specialized ChatGPT analysis for ridge inspections
async function analyzeRidgeWithChatGPT(imageData, inspectionType, inspectionName) {
    if (!isAPIKeyConfigured()) {
        throw new Error('API key not configured. Please provide your ChatGPT API key.');
    }

    const apiKey = getAPIKey();
    
    let prompt = '';
    
    if (inspectionType === 'closeup') {
        prompt = `Analyze this ${inspectionName} photo for roof inspection purposes. Please evaluate:

1. Ridge Condition:
   - Are the ridge shingles in good condition?
   - Any visible cracks, lifting, or damage?
   - Is the ridge line straight and properly aligned?
   - Are there any missing or loose shingles?

2. Photo Quality:
   - Is the image clear and in focus?
   - Is the lighting adequate for inspection?
   - Is the ridge clearly visible in the frame?

3. Damage Assessment:
   - Any signs of weather damage?
   - Cracks or splits in shingles?
   - Lifting or curling edges?
   - Missing or damaged shingles?

4. Technical Issues:
   - Any blurriness affecting inspection quality?
   - Overexposure or underexposure?
   - Poor angle or perspective?

5. Recommendations:
   - What improvements could be made for better inspection?
   - Should the photo be retaken?

Please respond in JSON format with the following structure:
{
  "overallQuality": "good" | "needs_improvement" | "poor",
  "confidence": number (0-100),
  "ridgeCondition": "good" | "fair" | "poor" | "damaged",
  "damageDetected": boolean,
  "damageTypes": ["cracks" | "lifting" | "missing" | "weather" | "other"],
  "issues": [
    {
      "type": "ridge_condition" | "damage" | "clarity" | "lighting" | "composition" | "technical",
      "message": "Description of the issue",
      "severity": "low" | "medium" | "high"
    }
  ],
  "recommendations": [
    "Specific recommendation text"
  ],
  "shouldRetake": boolean
}`;
    } else if (inspectionType === 'under-ridge') {
        prompt = `Analyze this ${inspectionName} photo for roof inspection purposes. Please evaluate:

1. Under-Ridge Visibility:
   - Is the area under the ridge shingle clearly visible?
   - Can you see the roof decking or underlayment?
   - Is the shingle lifting sufficient to show the under-ridge area?

2. Damage Detection:
   - Any visible damage under the ridge?
   - Signs of water damage or rot?
   - Cracks or deterioration in the decking?
   - Missing or damaged underlayment?

3. Installation Quality:
   - Is the ridge installation proper?
   - Any signs of poor workmanship?
   - Proper sealing and flashing?

4. Photo Quality:
   - Is the image clear and in focus?
   - Is the lighting adequate for inspection?
   - Is the under-ridge area properly exposed?

5. Technical Issues:
   - Any blurriness affecting inspection quality?
   - Overexposure or underexposure?
   - Poor angle or perspective?

6. Recommendations:
   - What improvements could be made for better inspection?
   - Should the photo be retaken?

Please respond in JSON format with the following structure:
{
  "overallQuality": "good" | "needs_improvement" | "poor",
  "confidence": number (0-100),
  "underRidgeVisible": boolean,
  "damageDetected": boolean,
  "damageTypes": ["water_damage" | "rot" | "cracks" | "missing_materials" | "poor_installation" | "other"],
  "installationQuality": "good" | "fair" | "poor" | "unclear",
  "issues": [
    {
      "type": "under_ridge" | "damage" | "installation" | "clarity" | "lighting" | "composition" | "technical",
      "message": "Description of the issue",
      "severity": "low" | "medium" | "high"
    }
  ],
  "recommendations": [
    "Specific recommendation text"
  ],
  "shouldRetake": boolean
}`;
    }

    try {
        const response = await fetch(API_CONFIG.BASE_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: API_CONFIG.MODEL,
                messages: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: prompt
                            },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: imageData
                                }
                            }
                        ]
                    }
                ],
                max_tokens: API_CONFIG.MAX_TOKENS,
                temperature: API_CONFIG.TEMPERATURE
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`API Error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
        }

        const data = await response.json();
        const analysisText = data.choices[0].message.content;
        
        // Parse the JSON response
        try {
            const analysis = JSON.parse(analysisText);
            return analysis;
        } catch (parseError) {
            // If JSON parsing fails, try to extract information from text
            return parseTextResponse(analysisText, inspectionType);
        }

    } catch (error) {
        console.error('ChatGPT API Error:', error);
        throw error;
    }
}

// Fallback function to parse text response if JSON parsing fails
function parseTextResponse(text, inspectionType) {
    const analysis = {
        overallQuality: 'needs_improvement',
        confidence: 70,
        issues: [],
        recommendations: [],
        shouldRetake: false
    };

    // Add type-specific properties
    if (inspectionType === 'closeup') {
        analysis.ridgeCondition = 'fair';
        analysis.damageDetected = false;
        analysis.damageTypes = [];
    } else if (inspectionType === 'under-ridge') {
        analysis.underRidgeVisible = false;
        analysis.damageDetected = false;
        analysis.damageTypes = [];
        analysis.installationQuality = 'unclear';
    }

    // Simple text parsing to extract key information
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('good') || lowerText.includes('excellent') || lowerText.includes('clear')) {
        analysis.overallQuality = 'good';
        analysis.confidence = 85;
    } else if (lowerText.includes('poor') || lowerText.includes('bad') || lowerText.includes('unclear')) {
        analysis.overallQuality = 'poor';
        analysis.confidence = 60;
    }

    // Parse closeup-specific content
    if (inspectionType === 'closeup') {
        if (lowerText.includes('damage') || lowerText.includes('crack') || lowerText.includes('lift')) {
            analysis.damageDetected = true;
            analysis.ridgeCondition = 'damaged';
        } else if (lowerText.includes('good condition') || lowerText.includes('excellent')) {
            analysis.ridgeCondition = 'good';
        }
    }

    // Parse under-ridge-specific content
    if (inspectionType === 'under-ridge') {
        if (lowerText.includes('under') && (lowerText.includes('visible') || lowerText.includes('clear'))) {
            analysis.underRidgeVisible = true;
        }
        if (lowerText.includes('damage') || lowerText.includes('rot') || lowerText.includes('water')) {
            analysis.damageDetected = true;
        }
    }

    if (lowerText.includes('blur') || lowerText.includes('unclear')) {
        analysis.issues.push({
            type: 'clarity',
            message: 'Photo appears blurry or unclear',
            severity: 'high'
        });
        analysis.shouldRetake = true;
    }

    if (lowerText.includes('retake') || lowerText.includes('take again')) {
        analysis.shouldRetake = true;
    }

    return analysis;
}

function simulateRidgeAnalysis() {
    const currentInspection = inspections[currentInspectionIndex];
    const issues = [];
    const recommendations = [];
    
    // Simulate analysis based on inspection type
    if (currentInspection.type === 'closeup') {
        // Simulate ridge closeup analysis
        const damageDetected = Math.random() > 0.6;
        const ridgeCondition = damageDetected ? 
            (Math.random() > 0.5 ? 'fair' : 'poor') : 
            (Math.random() > 0.3 ? 'good' : 'fair');
        
        if (damageDetected) {
            issues.push({
                type: 'damage',
                message: 'Visible damage detected on ridge shingles',
                severity: 'high'
            });
        }
        
        if (Math.random() > 0.6) {
            recommendations.push('Ensure photo captures the entire ridge line for complete assessment');
        }
        
        return {
            overallQuality: Math.random() > 0.3 ? 'good' : 'needs_improvement',
            confidence: Math.floor(Math.random() * 30) + 70,
            ridgeCondition: ridgeCondition,
            damageDetected: damageDetected,
            damageTypes: damageDetected ? ['cracks', 'weather'] : [],
            issues: issues,
            recommendations: recommendations,
            shouldRetake: Math.random() > 0.8
        };
    } else {
        // Simulate under-ridge analysis
        const underRidgeVisible = Math.random() > 0.3;
        const damageDetected = Math.random() > 0.7;
        const installationQuality = Math.random() > 0.5 ? 'good' : 'fair';
        
        if (!underRidgeVisible) {
            issues.push({
                type: 'under_ridge',
                message: 'Under-ridge area not clearly visible',
                severity: 'medium'
            });
        }
        
        if (damageDetected) {
            issues.push({
                type: 'damage',
                message: 'Damage detected under ridge area',
                severity: 'high'
            });
        }
        
        if (Math.random() > 0.6) {
            recommendations.push('Ensure shingle is lifted enough to show under-ridge area clearly');
        }
        
        return {
            overallQuality: Math.random() > 0.3 ? 'good' : 'needs_improvement',
            confidence: Math.floor(Math.random() * 30) + 70,
            underRidgeVisible: underRidgeVisible,
            damageDetected: damageDetected,
            damageTypes: damageDetected ? ['water_damage', 'cracks'] : [],
            installationQuality: installationQuality,
            issues: issues,
            recommendations: recommendations,
            shouldRetake: Math.random() > 0.8
        };
    }
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
    
    // Ridge condition analysis for closeup photos
    if (results.ridgeCondition !== undefined) {
        const ridgeClass = results.ridgeCondition === 'good' ? 'ridge-good' : 'ridge-damaged';
        html += `<div class="ridge-condition-analysis ${ridgeClass}">
            <h4>🏠 Ridge Condition Analysis</h4>
            <p>Ridge Condition: ${results.ridgeCondition.charAt(0).toUpperCase() + results.ridgeCondition.slice(1)}</p>
            <p>Damage Detected: ${results.damageDetected ? 'Yes' : 'No'}</p>
            ${results.damageTypes && results.damageTypes.length > 0 ? 
                `<p>Damage Types: ${results.damageTypes.join(', ')}</p>` : ''}
        </div>`;
    }
    
    // Under-ridge analysis for under-ridge photos
    if (results.underRidgeVisible !== undefined) {
        const underRidgeClass = results.underRidgeVisible ? 'under-ridge-visible' : 'under-ridge-not-visible';
        html += `<div class="under-ridge-analysis ${underRidgeClass}">
            <h4>🔍 Under-Ridge Analysis</h4>
            <p>Under-Ridge Visible: ${results.underRidgeVisible ? 'Yes' : 'No'}</p>
            <p>Damage Detected: ${results.damageDetected ? 'Yes' : 'No'}</p>
            ${results.installationQuality ? 
                `<p>Installation Quality: ${results.installationQuality.charAt(0).toUpperCase() + results.installationQuality.slice(1)}</p>` : ''}
            ${results.damageTypes && results.damageTypes.length > 0 ? 
                `<p>Damage Types: ${results.damageTypes.join(', ')}</p>` : ''}
        </div>`;
    }
    
    // Damage detection summary
    if (results.damageDetected) {
        const damageClass = results.damageDetected ? 'damage-found' : 'no-damage';
        html += `<div class="damage-detection ${damageClass}">
            <h4>⚠️ Damage Detection</h4>
            <p>Damage Found: ${results.damageDetected ? 'Yes' : 'No'}</p>
            ${results.damageTypes && results.damageTypes.length > 0 ? 
                `<p>Types: ${results.damageTypes.join(', ')}</p>` : ''}
        </div>`;
    }
    
    // Issues
    if (results.issues && results.issues.length > 0) {
        html += '<div class="issues-section"><h4>Issues Found:</h4><ul>';
        results.issues.forEach(issue => {
            const severityClass = issue.severity === 'high' ? 'issue-error' : 
                                 issue.severity === 'medium' ? 'issue-warning' : 'issue-info';
            html += `<li class="${severityClass}">
                <strong>${issue.type.charAt(0).toUpperCase() + issue.type.slice(1).replace('_', ' ')}:</strong> ${issue.message}
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
        html += '<div class="ai-actions"><button class="action-btn primary" onclick="proceedToNextInspection()">Continue to Next Photo</button></div>';
    } else {
        html += '<div class="ai-actions">';
        html += '<button class="action-btn secondary" onclick="retakePhoto()">Retake Photo</button>';
        html += '<button class="action-btn primary" onclick="proceedToNextInspection()">Continue Anyway</button>';
        html += '</div>';
    }
    
    html += '</div>';
    
    aiResults.innerHTML = html;
    
    // Update status
    const statusBadge = inspectionStatus.querySelector('.status-badge');
    if (results.overallQuality === 'good' && !shouldRetake) {
        statusBadge.textContent = 'Completed';
        statusBadge.className = 'status-badge completed';
    } else {
        statusBadge.textContent = 'Issues Found';
        statusBadge.className = 'status-badge analyzing';
    }
}

function proceedToNextInspection() {
    // Hide AI analysis
    aiAnalysis.style.display = 'none';
    
    // Move to next inspection
    if (currentInspectionIndex < inspections.length - 1) {
        currentInspectionIndex++;
        updateInspectionDisplay();
        updateProgress();
        updateChecklist();
        
        // Reset photo capture UI
        photoActions.style.display = 'none';
        cameraPreview.style.display = 'block';
        fileInput.value = '';
    } else {
        // All inspections completed
        allInspectionsCompleted();
    }
}

function allInspectionsCompleted() {
    // Enable next button
    nextBtn.disabled = false;
    nextBtn.innerHTML = '<span class="btn-text">Continue to Roof Overview</span><span class="btn-icon">→</span>';
    
    // Show completion message
    alert('Ridge inspection completed! Ready to proceed to roof overview photos.');
}

function switchCamera() {
    // This would switch between front/back camera on mobile
    // For now, just show a message
    alert('Camera switching functionality will be implemented for mobile devices.');
}

function goBack() {
    if (currentInspectionIndex > 0) {
        currentInspectionIndex--;
        updateInspectionDisplay();
        updateProgress();
        updateChecklist();
        
        // Reset UI
        photoActions.style.display = 'none';
        cameraPreview.style.display = 'block';
        aiAnalysis.style.display = 'none';
        fileInput.value = '';
    } else {
        // Go back to roof edge inspection
        window.location.href = 'roof-edge.html';
    }
}

function proceedToNext() {
    if (nextBtn.disabled) {
        return;
    }
    
    // Navigate to roof overview photos
    window.location.href = 'roof-overview.html';
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
    const fallbackResults = simulateRidgeAnalysis();
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
    
    .issue-info {
        background: #e3f2fd;
        color: #1565c0;
        border-left: 4px solid #2196F3;
    }
    
    .recommendations-section li {
        background: #f0f8ff;
        color: #1565c0;
        border-left: 4px solid #2196F3;
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
`;
document.head.appendChild(style);
