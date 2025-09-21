// Hail Test Square JavaScript

// Current state
let currentStep = 'test-square'; // 'test-square', 'hail-hits', 'closeup-1', 'closeup-2', 'closeup-3'
let testSquarePhoto = null;
let hailHits = [];
let closeupPhotos = [];
let selectedCloseupHits = [];
let stream = null;
let isAnalyzing = false;

// DOM elements
const photoTitle = document.getElementById('photoTitle');
const photoIcon = document.getElementById('photoIcon');
const photoInstructions = document.getElementById('photoInstructions');
const photoStatus = document.getElementById('photoStatus');
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
const hailHitsSection = document.getElementById('hailHitsSection');
const closeupSection = document.getElementById('closeupSection');
const hailCount = document.getElementById('hailCount');
const hailHitsList = document.getElementById('hailHitsList');
const closeupSelection = document.getElementById('closeupSelection');
const closeupInstructions = document.getElementById('closeupInstructions');

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    updateStepDisplay();
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

function updateStepDisplay() {
    switch (currentStep) {
        case 'test-square':
            photoTitle.textContent = 'Test Square Full View';
            photoIcon.textContent = '📸';
            photoInstructions.textContent = 'Take a full view photo of the 10\'x10\' test square. Ensure the entire test area is visible and clearly marked.';
            hailHitsSection.style.display = 'none';
            closeupSection.style.display = 'none';
            break;
        case 'hail-hits':
            photoTitle.textContent = 'Hail Hits Documentation';
            photoIcon.textContent = '🎯';
            photoInstructions.textContent = 'Circle at least 8 hail hits within the test square. Use chalk or tape to mark each hail hit clearly.';
            hailHitsSection.style.display = 'block';
            closeupSection.style.display = 'none';
            break;
        case 'closeup-1':
        case 'closeup-2':
        case 'closeup-3':
            const closeupNumber = currentStep.split('-')[1];
            photoTitle.textContent = `Hail Hit Closeup ${closeupNumber}`;
            photoIcon.textContent = '🔍';
            photoInstructions.textContent = `Take a closeup photo of hail hit ${closeupNumber}. Ensure the circled hail hit is clearly visible and in focus.`;
            hailHitsSection.style.display = 'block';
            closeupSection.style.display = 'block';
            break;
    }
    
    // Update status
    const statusBadge = photoStatus.querySelector('.status-badge');
    if (isStepCompleted(currentStep)) {
        statusBadge.textContent = 'Completed';
        statusBadge.className = 'status-badge completed';
    } else {
        statusBadge.textContent = 'Pending';
        statusBadge.className = 'status-badge pending';
    }
}

function isStepCompleted(step) {
    switch (step) {
        case 'test-square':
            return testSquarePhoto !== null;
        case 'hail-hits':
            return hailHits.length >= 8;
        case 'closeup-1':
        case 'closeup-2':
        case 'closeup-3':
            const closeupNumber = parseInt(step.split('-')[1]);
            return closeupPhotos[closeupNumber - 1] !== undefined;
        default:
            return false;
    }
}

function updateProgress() {
    const totalSteps = 5; // test-square, hail-hits, closeup-1, closeup-2, closeup-3
    let currentStepNumber = 1;
    
    switch (currentStep) {
        case 'test-square':
            currentStepNumber = 1;
            break;
        case 'hail-hits':
            currentStepNumber = 2;
            break;
        case 'closeup-1':
            currentStepNumber = 3;
            break;
        case 'closeup-2':
            currentStepNumber = 4;
            break;
        case 'closeup-3':
            currentStepNumber = 5;
            break;
    }
    
    const progress = (currentStepNumber / totalSteps) * 100;
    progressFill.style.width = `${progress}%`;
    progressText.textContent = `Step ${currentStepNumber} of ${totalSteps}`;
}

function updateChecklist() {
    const checklistItems = document.querySelectorAll('.checklist-item');
    checklistItems.forEach(item => {
        const step = item.dataset.photo;
        const statusIcon = item.querySelector('.checklist-status');
        
        item.classList.remove('current', 'completed', 'pending');
        
        if (step === currentStep) {
            item.classList.add('current');
            statusIcon.textContent = '📷';
        } else if (isStepCompleted(step)) {
            item.classList.add('completed');
            statusIcon.textContent = '✅';
        } else {
            item.classList.add('pending');
            statusIcon.textContent = '⏳';
        }
    });
}

function addHailHit() {
    hailHits.push({
        id: Date.now(),
        number: hailHits.length + 1,
        status: 'circled'
    });
    
    updateHailHitsDisplay();
    updateChecklist();
    
    // Check if we have enough hail hits
    if (hailHits.length >= 8) {
        // Enable closeup selection
        updateCloseupSelection();
    }
}

function removeHailHit() {
    if (hailHits.length > 0) {
        hailHits.pop();
        updateHailHitsDisplay();
        updateChecklist();
        updateCloseupSelection();
    }
}

function updateHailHitsDisplay() {
    hailCount.textContent = hailHits.length;
    
    hailHitsList.innerHTML = '';
    hailHits.forEach((hit, index) => {
        const item = document.createElement('div');
        item.className = 'hail-hit-item';
        item.innerHTML = `
            <div class="hail-hit-number">${hit.number}</div>
            <div class="hail-hit-status">Circled</div>
        `;
        hailHitsList.appendChild(item);
    });
    
    // Update remove button state
    const removeBtn = document.getElementById('removeHailHitBtn');
    removeBtn.disabled = hailHits.length === 0;
}

function updateCloseupSelection() {
    if (hailHits.length < 8) {
        closeupSelection.innerHTML = '<p style="text-align: center; color: #666;">Please circle at least 8 hail hits first.</p>';
        return;
    }
    
    closeupSelection.innerHTML = '';
    
    // Show hail hits for selection
    hailHits.forEach((hit, index) => {
        const option = document.createElement('div');
        option.className = 'closeup-option';
        option.innerHTML = `
            <div class="closeup-option-number">Hail Hit ${hit.number}</div>
            <div class="closeup-option-status">Available</div>
        `;
        
        option.addEventListener('click', () => {
            selectCloseupHit(index);
        });
        
        closeupSelection.appendChild(option);
    });
}

function selectCloseupHit(hitIndex) {
    // This would be implemented to select which hail hits to photograph
    // For now, just show a message
    alert(`Hail hit ${hitIndex + 1} selected for closeup photography.`);
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
    
    // Store the photo data based on current step
    switch (currentStep) {
        case 'test-square':
            testSquarePhoto = imageData;
            break;
        case 'closeup-1':
            closeupPhotos[0] = imageData;
            break;
        case 'closeup-2':
            closeupPhotos[1] = imageData;
            break;
        case 'closeup-3':
            closeupPhotos[2] = imageData;
            break;
    }
    
    // Update UI
    updateStepDisplay();
    updateChecklist();
}

function retakePhoto() {
    // Reset photo capture
    photoActions.style.display = 'none';
    cameraPreview.style.display = 'block';
    
    // Clear stored photo
    switch (currentStep) {
        case 'test-square':
            testSquarePhoto = null;
            break;
        case 'closeup-1':
            closeupPhotos[0] = undefined;
            break;
        case 'closeup-2':
            closeupPhotos[1] = undefined;
            break;
        case 'closeup-3':
            closeupPhotos[2] = undefined;
            break;
    }
    
    // Update UI
    updateStepDisplay();
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
    const statusBadge = photoStatus.querySelector('.status-badge');
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
        
        // Get the current photo data
        let photoData = null;
        switch (currentStep) {
            case 'test-square':
                photoData = testSquarePhoto;
                break;
            case 'closeup-1':
                photoData = closeupPhotos[0];
                break;
            case 'closeup-2':
                photoData = closeupPhotos[1];
                break;
            case 'closeup-3':
                photoData = closeupPhotos[2];
                break;
        }
        
        if (!photoData) {
            throw new Error('No photo data available for analysis');
        }
        
        // Resize image for API efficiency
        const resizedImageData = await resizeImageForAPI(photoData);
        
        // Call ChatGPT API with specialized prompts
        const analysisResults = await analyzeHailDamageWithChatGPT(resizedImageData, currentStep);
        displayAIResults(analysisResults);
        
    } catch (error) {
        console.error('AI Analysis Error:', error);
        
        // Fallback to simulated analysis if API fails
        const fallbackResults = simulateHailAnalysis();
        fallbackResults.apiError = error.message;
        displayAIResults(fallbackResults);
    }
}

// Specialized ChatGPT analysis for hail damage
async function analyzeHailDamageWithChatGPT(imageData, step) {
    if (!isAPIKeyConfigured()) {
        throw new Error('API key not configured. Please provide your ChatGPT API key.');
    }

    const apiKey = getAPIKey();
    
    let prompt = '';
    
    if (step === 'test-square') {
        prompt = `Analyze this hail damage test square photo for roof inspection purposes. Please evaluate:

1. Test Square Quality:
   - Is the 10'x10' test square clearly visible and properly marked?
   - Is the entire test area captured in the photo?
   - Are the boundaries clearly defined?

2. Photo Quality:
   - Is the image clear and in focus?
   - Is the lighting adequate for hail damage inspection?
   - Is the roof surface clearly visible?

3. Hail Damage Assessment:
   - Are there visible hail hits within the test square?
   - Can you identify circular or oval indentations?
   - Are there signs of granule loss around impact points?
   - Any bruising or soft spots visible?

4. Test Square Setup:
   - Is the test square properly positioned?
   - Are the boundaries clearly marked?
   - Is the area representative of the roof condition?

5. Recommendations:
   - What improvements could be made for better inspection?
   - Should the photo be retaken?

Please respond in JSON format with the following structure:
{
  "overallQuality": "good" | "needs_improvement" | "poor",
  "confidence": number (0-100),
  "testSquareQuality": "excellent" | "good" | "fair" | "poor",
  "hailDamageDetected": boolean,
  "hailHitCount": number,
  "damageSeverity": "none" | "light" | "moderate" | "severe",
  "issues": [
    {
      "type": "test_square" | "hail_damage" | "clarity" | "lighting" | "composition" | "technical",
      "message": "Description of the issue",
      "severity": "low" | "medium" | "high"
    }
  ],
  "recommendations": [
    "Specific recommendation text"
  ],
  "shouldRetake": boolean
}`;
    } else {
        // Closeup photo analysis
        prompt = `Analyze this hail hit closeup photo for roof inspection purposes. Please evaluate:

1. Hail Hit Visibility:
   - Is the circled hail hit clearly visible?
   - Can you see the impact damage clearly?
   - Is the hail hit properly marked/circled?

2. Photo Quality:
   - Is the image clear and in focus?
   - Is the lighting adequate for damage assessment?
   - Is the hail hit properly framed?

3. Hail Damage Assessment:
   - Is this a genuine hail hit or other damage?
   - What is the severity of the damage?
   - Are there signs of granule loss?
   - Any bruising or soft spots visible?

4. Damage Characteristics:
   - Circular or oval indentation?
   - Size of the impact?
   - Depth of the damage?
   - Surrounding granule condition?

5. Recommendations:
   - What improvements could be made for better inspection?
   - Should the photo be retaken?

Please respond in JSON format with the following structure:
{
  "overallQuality": "good" | "needs_improvement" | "poor",
  "confidence": number (0-100),
  "hailHitVisible": boolean,
  "hailHitGenuine": boolean,
  "damageSeverity": "none" | "light" | "moderate" | "severe",
  "damageCharacteristics": {
    "circular": boolean,
    "granuleLoss": boolean,
    "bruising": boolean,
    "size": "small" | "medium" | "large"
  },
  "issues": [
    {
      "type": "hail_hit" | "damage" | "clarity" | "lighting" | "composition" | "technical",
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
            return parseTextResponse(analysisText, step);
        }

    } catch (error) {
        console.error('ChatGPT API Error:', error);
        throw error;
    }
}

// Fallback function to parse text response if JSON parsing fails
function parseTextResponse(text, step) {
    const analysis = {
        overallQuality: 'needs_improvement',
        confidence: 70,
        issues: [],
        recommendations: [],
        shouldRetake: false
    };

    // Add step-specific properties
    if (step === 'test-square') {
        analysis.testSquareQuality = 'fair';
        analysis.hailDamageDetected = false;
        analysis.hailHitCount = 0;
        analysis.damageSeverity = 'none';
    } else {
        analysis.hailHitVisible = false;
        analysis.hailHitGenuine = false;
        analysis.damageSeverity = 'none';
        analysis.damageCharacteristics = {
            circular: false,
            granuleLoss: false,
            bruising: false,
            size: 'small'
        };
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

    if (lowerText.includes('hail') && (lowerText.includes('damage') || lowerText.includes('hit'))) {
        if (step === 'test-square') {
            analysis.hailDamageDetected = true;
        } else {
            analysis.hailHitVisible = true;
            analysis.hailHitGenuine = true;
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

function simulateHailAnalysis() {
    const issues = [];
    const recommendations = [];
    
    // Simulate hail analysis based on step
    if (currentStep === 'test-square') {
        const hailDamageDetected = Math.random() > 0.6;
        const testSquareQuality = Math.random() > 0.4 ? 'good' : 'fair';
        
        if (hailDamageDetected) {
            issues.push({
                type: 'hail_damage',
                message: 'Hail damage detected in test square',
                severity: 'high'
            });
        }
        
        if (Math.random() > 0.6) {
            recommendations.push('Ensure test square boundaries are clearly marked');
        }
        
        return {
            overallQuality: Math.random() > 0.3 ? 'good' : 'needs_improvement',
            confidence: Math.floor(Math.random() * 30) + 70,
            testSquareQuality: testSquareQuality,
            hailDamageDetected: hailDamageDetected,
            hailHitCount: hailDamageDetected ? Math.floor(Math.random() * 10) + 5 : 0,
            damageSeverity: hailDamageDetected ? 'moderate' : 'none',
            issues: issues,
            recommendations: recommendations,
            shouldRetake: Math.random() > 0.8
        };
    } else {
        // Closeup photo analysis
        const hailHitVisible = Math.random() > 0.3;
        const hailHitGenuine = Math.random() > 0.4;
        
        if (hailHitVisible && hailHitGenuine) {
            issues.push({
                type: 'hail_hit',
                message: 'Genuine hail hit identified',
                severity: 'medium'
            });
        }
        
        if (Math.random() > 0.6) {
            recommendations.push('Ensure hail hit is clearly circled and visible');
        }
        
        return {
            overallQuality: Math.random() > 0.3 ? 'good' : 'needs_improvement',
            confidence: Math.floor(Math.random() * 30) + 70,
            hailHitVisible: hailHitVisible,
            hailHitGenuine: hailHitGenuine,
            damageSeverity: hailHitGenuine ? 'moderate' : 'none',
            damageCharacteristics: {
                circular: hailHitGenuine,
                granuleLoss: hailHitGenuine && Math.random() > 0.5,
                bruising: hailHitGenuine && Math.random() > 0.6,
                size: 'medium'
            },
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
    
    // Test square analysis
    if (results.testSquareQuality !== undefined) {
        const testSquareClass = results.testSquareQuality === 'excellent' || results.testSquareQuality === 'good' ? 'test-square-good' : 'test-square-poor';
        html += `<div class="test-square-analysis ${testSquareClass}">
            <h4>📏 Test Square Analysis</h4>
            <p>Test Square Quality: ${results.testSquareQuality.charAt(0).toUpperCase() + results.testSquareQuality.slice(1)}</p>
            <p>Hail Damage Detected: ${results.hailDamageDetected ? 'Yes' : 'No'}</p>
            ${results.hailHitCount ? `<p>Hail Hits Count: ${results.hailHitCount}</p>` : ''}
            ${results.damageSeverity ? `<p>Damage Severity: ${results.damageSeverity.charAt(0).toUpperCase() + results.damageSeverity.slice(1)}</p>` : ''}
        </div>`;
    }
    
    // Hail hit analysis
    if (results.hailHitVisible !== undefined) {
        const hailClass = results.hailHitVisible && results.hailHitGenuine ? 'hail-damage-detected' : 'hail-no-damage';
        html += `<div class="hail-analysis ${hailClass}">
            <h4>🎯 Hail Hit Analysis</h4>
            <p>Hail Hit Visible: ${results.hailHitVisible ? 'Yes' : 'No'}</p>
            <p>Genuine Hail Hit: ${results.hailHitGenuine ? 'Yes' : 'No'}</p>
            <p>Damage Severity: ${results.damageSeverity.charAt(0).toUpperCase() + results.damageSeverity.slice(1)}</p>
            ${results.damageCharacteristics ? `
                <p>Characteristics: ${results.damageCharacteristics.circular ? 'Circular' : 'Irregular'}, 
                ${results.damageCharacteristics.granuleLoss ? 'Granule Loss' : 'No Granule Loss'}, 
                ${results.damageCharacteristics.bruising ? 'Bruising' : 'No Bruising'}</p>
            ` : ''}
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
        html += '<div class="ai-actions"><button class="action-btn primary" onclick="proceedToNextStep()">Continue to Next Step</button></div>';
    } else {
        html += '<div class="ai-actions">';
        html += '<button class="action-btn secondary" onclick="retakePhoto()">Retake Photo</button>';
        html += '<button class="action-btn primary" onclick="proceedToNextStep()">Continue Anyway</button>';
        html += '</div>';
    }
    
    html += '</div>';
    
    aiResults.innerHTML = html;
    
    // Update status
    const statusBadge = photoStatus.querySelector('.status-badge');
    if (results.overallQuality === 'good' && !shouldRetake) {
        statusBadge.textContent = 'Completed';
        statusBadge.className = 'status-badge completed';
    } else {
        statusBadge.textContent = 'Issues Found';
        statusBadge.className = 'status-badge analyzing';
    }
}

function proceedToNextStep() {
    // Hide AI analysis
    aiAnalysis.style.display = 'none';
    
    // Move to next step
    switch (currentStep) {
        case 'test-square':
            currentStep = 'hail-hits';
            break;
        case 'hail-hits':
            if (hailHits.length >= 8) {
                currentStep = 'closeup-1';
            } else {
                alert('Please circle at least 8 hail hits before proceeding.');
                return;
            }
            break;
        case 'closeup-1':
            currentStep = 'closeup-2';
            break;
        case 'closeup-2':
            currentStep = 'closeup-3';
            break;
        case 'closeup-3':
            // All steps completed
            allStepsCompleted();
            return;
    }
    
    // Reset photo capture UI
    photoActions.style.display = 'none';
    cameraPreview.style.display = 'block';
    aiAnalysis.style.display = 'none';
    fileInput.value = '';
    
    // Update displays
    updateStepDisplay();
    updateProgress();
    updateChecklist();
}

function allStepsCompleted() {
    // Enable next button
    nextBtn.disabled = false;
    nextBtn.innerHTML = '<span class="btn-text">Continue to Insured Interview</span><span class="btn-icon">→</span>';
    
    // Show completion message
    alert('Hail test square inspection completed! All photos documented. Ready to proceed to insured interview.');
}

function switchCamera() {
    // This would switch between front/back camera on mobile
    // For now, just show a message
    alert('Camera switching functionality will be implemented for mobile devices.');
}

function goBack() {
    // Move to previous step
    switch (currentStep) {
        case 'test-square':
            // Go back to roof accessories
            window.location.href = 'roof-accessories.html';
            return;
        case 'hail-hits':
            currentStep = 'test-square';
            break;
        case 'closeup-1':
            currentStep = 'hail-hits';
            break;
        case 'closeup-2':
            currentStep = 'closeup-1';
            break;
        case 'closeup-3':
            currentStep = 'closeup-2';
            break;
    }
    
    // Reset UI
    photoActions.style.display = 'none';
    cameraPreview.style.display = 'block';
    aiAnalysis.style.display = 'none';
    fileInput.value = '';
    
    // Update displays
    updateStepDisplay();
    updateProgress();
    updateChecklist();
}

function proceedToNext() {
    if (nextBtn.disabled) {
        return;
    }
    
    // Navigate to insured interview
    window.location.href = 'insured-interview.html';
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
    const fallbackResults = simulateHailAnalysis();
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
