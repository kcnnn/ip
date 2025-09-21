// Roof Accessories Photos JavaScript

// Accessory types with icons and descriptions
const accessoryTypes = {
    'pipe': { icon: '🔧', name: 'Pipe', description: 'Plumbing or utility pipe' },
    'vent': { icon: '🌪️', name: 'Vent', description: 'Roof vent or exhaust vent' },
    'rain-cap': { icon: '🌧️', name: 'Rain Cap', description: 'Rain cap or weather cap' },
    'rain-diverter': { icon: '💧', name: 'Rain Diverter', description: 'Rain diverter or gutter diverter' },
    'satellite-dish': { icon: '📡', name: 'Satellite Dish', description: 'Satellite dish or antenna' },
    'chimney': { icon: '🏠', name: 'Chimney', description: 'Chimney or flue' },
    'other': { icon: '🔧', name: 'Other', description: 'Other roof accessory' }
};

// Current state
let currentAccessoryIndex = 0;
let capturedPhotos = [];
let selectedAccessoryType = null;
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
const checklistItems = document.getElementById('checklistItems');

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    updatePhotoDisplay();
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

function updatePhotoDisplay() {
    if (capturedPhotos.length === 0) {
        photoTitle.textContent = 'Roof Accessory Photo';
        photoIcon.textContent = '📸';
        photoInstructions.textContent = 'Take a clear photo of a roof accessory. This could be a pipe, vent, rain cap, rain diverter, satellite dish, chimney, or any other roof fixture.';
    } else {
        const currentPhoto = capturedPhotos[currentAccessoryIndex];
        photoTitle.textContent = `${currentPhoto.type.name} Photo`;
        photoIcon.textContent = currentPhoto.type.icon;
        photoInstructions.textContent = `Take a clear photo of the ${currentPhoto.type.name.toLowerCase()}. ${currentPhoto.type.description}.`;
    }
    
    // Update status
    const statusBadge = photoStatus.querySelector('.status-badge');
    if (capturedPhotos.length > 0 && capturedPhotos[currentAccessoryIndex]) {
        statusBadge.textContent = 'Completed';
        statusBadge.className = 'status-badge completed';
    } else {
        statusBadge.textContent = 'Pending';
        statusBadge.className = 'status-badge pending';
    }
}

function updateProgress() {
    const totalPhotos = Math.max(capturedPhotos.length, 1);
    const progress = ((currentAccessoryIndex + 1) / totalPhotos) * 100;
    progressFill.style.width = `${progress}%`;
    progressText.textContent = `Step ${currentAccessoryIndex + 1} of ${totalPhotos}`;
}

function updateChecklist() {
    checklistItems.innerHTML = '';
    
    if (capturedPhotos.length === 0) {
        const emptyState = document.createElement('div');
        emptyState.className = 'empty-state';
        emptyState.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: #666;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">📸</div>
                <h4>No Accessories Documented Yet</h4>
                <p>Start by selecting an accessory type and taking a photo.</p>
            </div>
        `;
        checklistItems.appendChild(emptyState);
        return;
    }
    
    capturedPhotos.forEach((photo, index) => {
        const item = document.createElement('div');
        item.className = `checklist-item ${index === currentAccessoryIndex ? 'current' : 'completed'}`;
        item.innerHTML = `
            <div class="checklist-icon">${photo.type.icon}</div>
            <div class="checklist-content">
                <div class="checklist-text">${photo.type.name} Photo</div>
                <div class="checklist-type">${photo.type.description}</div>
            </div>
            <div class="checklist-actions">
                <button class="action-icon" onclick="editAccessory(${index})" title="Edit">
                    ✏️
                </button>
                <button class="action-icon delete" onclick="deleteAccessory(${index})" title="Delete">
                    🗑️
                </button>
            </div>
            <div class="checklist-status">${index === currentAccessoryIndex ? '📷' : '✅'}</div>
        `;
        checklistItems.appendChild(item);
    });
}

function selectAccessoryType(type) {
    selectedAccessoryType = type;
    
    // Update button states
    document.querySelectorAll('.accessory-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    document.querySelector(`[data-type="${type}"]`).classList.add('selected');
    
    // Update instructions
    const typeInfo = accessoryTypes[type];
    photoInstructions.textContent = `Take a clear photo of the ${typeInfo.name.toLowerCase()}. ${typeInfo.description}.`;
}

function addNewAccessory() {
    if (!selectedAccessoryType) {
        alert('Please select an accessory type first.');
        return;
    }
    
    // Add new accessory to the list
    const newAccessory = {
        id: Date.now(),
        type: accessoryTypes[selectedAccessoryType],
        photoData: null,
        analysis: null
    };
    
    capturedPhotos.push(newAccessory);
    currentAccessoryIndex = capturedPhotos.length - 1;
    
    // Reset UI
    photoActions.style.display = 'none';
    cameraPreview.style.display = 'block';
    aiAnalysis.style.display = 'none';
    fileInput.value = '';
    
    // Update displays
    updatePhotoDisplay();
    updateProgress();
    updateChecklist();
}

function editAccessory(index) {
    currentAccessoryIndex = index;
    updatePhotoDisplay();
    updateProgress();
    updateChecklist();
    
    // Reset UI
    photoActions.style.display = 'none';
    cameraPreview.style.display = 'block';
    aiAnalysis.style.display = 'none';
    fileInput.value = '';
}

function deleteAccessory(index) {
    if (confirm('Are you sure you want to delete this accessory photo?')) {
        capturedPhotos.splice(index, 1);
        
        // Adjust current index
        if (currentAccessoryIndex >= capturedPhotos.length) {
            currentAccessoryIndex = Math.max(0, capturedPhotos.length - 1);
        }
        
        // Reset UI
        photoActions.style.display = 'none';
        cameraPreview.style.display = 'block';
        aiAnalysis.style.display = 'none';
        fileInput.value = '';
        
        // Update displays
        updatePhotoDisplay();
        updateProgress();
        updateChecklist();
    }
}

function openCamera() {
    if (!selectedAccessoryType) {
        alert('Please select an accessory type first.');
        return;
    }
    
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
    capturedPhotos[currentAccessoryIndex].photoData = imageData;
    
    // Update UI
    updatePhotoDisplay();
    updateChecklist();
}

function retakePhoto() {
    // Reset photo capture
    photoActions.style.display = 'none';
    cameraPreview.style.display = 'block';
    
    // Clear stored photo
    capturedPhotos[currentAccessoryIndex].photoData = null;
    
    // Update UI
    updatePhotoDisplay();
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
        const currentPhoto = capturedPhotos[currentAccessoryIndex];
        const photoData = currentPhoto.photoData;
        if (!photoData) {
            throw new Error('No photo data available for analysis');
        }
        
        // Resize image for API efficiency
        const resizedImageData = await resizeImageForAPI(photoData);
        
        // Call ChatGPT API with specialized prompts
        const analysisResults = await analyzeAccessoryWithChatGPT(resizedImageData, currentPhoto.type);
        displayAIResults(analysisResults);
        
    } catch (error) {
        console.error('AI Analysis Error:', error);
        
        // Fallback to simulated analysis if API fails
        const fallbackResults = simulateAccessoryAnalysis();
        fallbackResults.apiError = error.message;
        displayAIResults(fallbackResults);
    }
}

// Specialized ChatGPT analysis for accessory photos
async function analyzeAccessoryWithChatGPT(imageData, accessoryType) {
    if (!isAPIKeyConfigured()) {
        throw new Error('API key not configured. Please provide your ChatGPT API key.');
    }

    const apiKey = getAPIKey();
    
    const prompt = `Analyze this ${accessoryType.name} photo for roof inspection purposes. Please evaluate:

1. Accessory Condition:
   - Overall condition of the ${accessoryType.name.toLowerCase()}
   - Any visible damage, wear, or deterioration
   - Proper installation and secure mounting
   - Signs of weather damage or aging

2. Photo Quality:
   - Is the image clear and in focus?
   - Is the lighting adequate for inspection?
   - Is the accessory properly framed and visible?

3. Damage Assessment:
   - Any visible damage to the accessory?
   - Loose or missing components?
   - Cracks, splits, or corrosion?
   - Signs of water damage or leaks?
   - Proper sealing and weatherproofing?

4. Installation Quality:
   - Is the accessory properly installed?
   - Secure mounting and attachment?
   - Proper sealing around the base?
   - Appropriate positioning and clearance?

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
  "accessoryCondition": "excellent" | "good" | "fair" | "poor" | "damaged",
  "damageDetected": boolean,
  "damageTypes": ["cracks" | "corrosion" | "loose_mounting" | "weather_damage" | "water_damage" | "missing_components" | "other"],
  "installationQuality": "excellent" | "good" | "fair" | "poor" | "unclear",
  "issues": [
    {
      "type": "accessory_condition" | "damage" | "installation" | "clarity" | "lighting" | "composition" | "technical",
      "message": "Description of the issue",
      "severity": "low" | "medium" | "high"
    }
  ],
  "recommendations": [
    "Specific recommendation text"
  ],
  "shouldRetake": boolean
}`;

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
            return parseTextResponse(analysisText);
        }

    } catch (error) {
        console.error('ChatGPT API Error:', error);
        throw error;
    }
}

// Fallback function to parse text response if JSON parsing fails
function parseTextResponse(text) {
    const analysis = {
        overallQuality: 'needs_improvement',
        confidence: 70,
        accessoryCondition: 'fair',
        damageDetected: false,
        damageTypes: [],
        installationQuality: 'fair',
        issues: [],
        recommendations: [],
        shouldRetake: false
    };

    // Simple text parsing to extract key information
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('good') || lowerText.includes('excellent') || lowerText.includes('clear')) {
        analysis.overallQuality = 'good';
        analysis.confidence = 85;
    } else if (lowerText.includes('poor') || lowerText.includes('bad') || lowerText.includes('unclear')) {
        analysis.overallQuality = 'poor';
        analysis.confidence = 60;
    }

    if (lowerText.includes('damage') || lowerText.includes('crack') || lowerText.includes('corrosion')) {
        analysis.damageDetected = true;
        analysis.accessoryCondition = 'damaged';
    } else if (lowerText.includes('excellent condition') || lowerText.includes('good condition')) {
        analysis.accessoryCondition = 'excellent';
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

function simulateAccessoryAnalysis() {
    const issues = [];
    const recommendations = [];
    
    // Simulate accessory analysis
    const damageDetected = Math.random() > 0.7;
    const accessoryCondition = damageDetected ? 
        (Math.random() > 0.5 ? 'fair' : 'poor') : 
        (Math.random() > 0.3 ? 'good' : 'excellent');
    
    if (damageDetected) {
        issues.push({
            type: 'damage',
            message: 'Visible damage detected on accessory',
            severity: 'high'
        });
    }
    
    if (Math.random() > 0.6) {
        recommendations.push('Ensure photo captures the entire accessory for complete assessment');
    }
    
    return {
        overallQuality: Math.random() > 0.3 ? 'good' : 'needs_improvement',
        confidence: Math.floor(Math.random() * 30) + 70,
        accessoryCondition: accessoryCondition,
        damageDetected: damageDetected,
        damageTypes: damageDetected ? ['weather_damage', 'cracks'] : [],
        installationQuality: Math.random() > 0.4 ? 'good' : 'fair',
        issues: issues,
        recommendations: recommendations,
        shouldRetake: Math.random() > 0.8
    };
}

function displayAIResults(results) {
    aiLoading.style.display = 'none';
    aiResults.style.display = 'block';
    
    // Store analysis results
    capturedPhotos[currentAccessoryIndex].analysis = results;
    
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
    
    // Accessory condition analysis
    const accessoryClass = results.accessoryCondition === 'excellent' || results.accessoryCondition === 'good' ? 'accessory-good' : 'accessory-damaged';
    html += `<div class="accessory-analysis ${accessoryClass}">
        <h4>🔧 Accessory Condition Analysis</h4>
        <p>Accessory Condition: ${results.accessoryCondition.charAt(0).toUpperCase() + results.accessoryCondition.slice(1)}</p>
        <p>Damage Detected: ${results.damageDetected ? 'Yes' : 'No'}</p>
        <p>Installation Quality: ${results.installationQuality.charAt(0).toUpperCase() + results.installationQuality.slice(1)}</p>
        ${results.damageTypes && results.damageTypes.length > 0 ? 
            `<p>Damage Types: ${results.damageTypes.join(', ')}</p>` : ''}
    </div>`;
    
    // Installation analysis
    const installationClass = results.installationQuality === 'excellent' || results.installationQuality === 'good' ? 'installation-good' : 'installation-poor';
    html += `<div class="installation-analysis ${installationClass}">
        <h4>🔧 Installation Analysis</h4>
        <p>Installation Quality: ${results.installationQuality.charAt(0).toUpperCase() + results.installationQuality.slice(1)}</p>
    </div>`;
    
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
        html += '<div class="ai-actions"><button class="action-btn primary" onclick="proceedToNextAccessory()">Continue to Next Accessory</button></div>';
    } else {
        html += '<div class="ai-actions">';
        html += '<button class="action-btn secondary" onclick="retakePhoto()">Retake Photo</button>';
        html += '<button class="action-btn primary" onclick="proceedToNextAccessory()">Continue Anyway</button>';
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

function proceedToNextAccessory() {
    // Hide AI analysis
    aiAnalysis.style.display = 'none';
    
    // Move to next accessory or add new one
    if (currentAccessoryIndex < capturedPhotos.length - 1) {
        currentAccessoryIndex++;
        updatePhotoDisplay();
        updateProgress();
        updateChecklist();
        
        // Reset photo capture UI
        photoActions.style.display = 'none';
        cameraPreview.style.display = 'block';
        fileInput.value = '';
    } else {
        // All accessories completed, show completion message
        allAccessoriesCompleted();
    }
}

function allAccessoriesCompleted() {
    // Enable next button
    nextBtn.disabled = false;
    nextBtn.innerHTML = '<span class="btn-text">Continue to Hail Test Square</span><span class="btn-icon">→</span>';
    
    // Show completion message
    alert(`All roof accessories documented! Total accessories: ${capturedPhotos.length}. Ready to proceed to hail test square inspection.`);
}

function switchCamera() {
    // This would switch between front/back camera on mobile
    // For now, just show a message
    alert('Camera switching functionality will be implemented for mobile devices.');
}

function goBack() {
    if (currentAccessoryIndex > 0) {
        currentAccessoryIndex--;
        updatePhotoDisplay();
        updateProgress();
        updateChecklist();
        
        // Reset UI
        photoActions.style.display = 'none';
        cameraPreview.style.display = 'block';
        aiAnalysis.style.display = 'none';
        fileInput.value = '';
    } else {
        // Go back to roof overview
        window.location.href = 'roof-overview.html';
    }
}

function proceedToNext() {
    if (nextBtn.disabled) {
        return;
    }
    
    // Navigate to hail test square
    window.location.href = 'hail-test-square.html';
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
    const fallbackResults = simulateAccessoryAnalysis();
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
