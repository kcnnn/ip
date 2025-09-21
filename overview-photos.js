// Roof Overview Photos JavaScript

// Photo data - 8 photos starting from front, moving clockwise
const overviewPhotos = [
    {
        name: 'Front Overview',
        icon: '📸',
        instructions: 'Take an overview photo from the front of the roof. Position yourself at the front edge and capture a wide view of the roof surface.',
        key: 'front',
        direction: 'north',
        compassPosition: 'north'
    },
    {
        name: 'Northeast Overview',
        icon: '📸',
        instructions: 'Move to the northeast corner and take an overview photo. Capture the roof surface from this angle.',
        key: 'northeast',
        direction: 'northeast',
        compassPosition: 'northeast'
    },
    {
        name: 'East Overview',
        icon: '📸',
        instructions: 'Position yourself at the east side of the roof and take an overview photo. Ensure good coverage of the roof surface.',
        key: 'east',
        direction: 'east',
        compassPosition: 'east'
    },
    {
        name: 'Southeast Overview',
        icon: '📸',
        instructions: 'Move to the southeast corner and take an overview photo. Capture the roof surface from this perspective.',
        key: 'southeast',
        direction: 'southeast',
        compassPosition: 'southeast'
    },
    {
        name: 'South Overview',
        icon: '📸',
        instructions: 'Position yourself at the south side of the roof and take an overview photo. Ensure comprehensive coverage.',
        key: 'south',
        direction: 'south',
        compassPosition: 'south'
    },
    {
        name: 'Southwest Overview',
        icon: '📸',
        instructions: 'Move to the southwest corner and take an overview photo. Capture the roof surface from this angle.',
        key: 'southwest',
        direction: 'southwest',
        compassPosition: 'southwest'
    },
    {
        name: 'West Overview',
        icon: '📸',
        instructions: 'Position yourself at the west side of the roof and take an overview photo. Ensure good visibility of the roof surface.',
        key: 'west',
        direction: 'west',
        compassPosition: 'west'
    },
    {
        name: 'Northwest Overview',
        icon: '📸',
        instructions: 'Move to the northwest corner and take an overview photo. Complete the 360-degree coverage of the roof.',
        key: 'northwest',
        direction: 'northwest',
        compassPosition: 'northwest'
    }
];

// Current state
let currentPhotoIndex = 0;
let capturedPhotos = {};
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

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    updatePhotoDisplay();
    updateProgress();
    updateChecklist();
    updateCompass();
    setupEventListeners();
});

function setupEventListeners() {
    captureBtn.addEventListener('click', openCamera);
    switchCameraBtn.addEventListener('click', switchCamera);
    retakeBtn.addEventListener('click', retakePhoto);
    confirmBtn.addEventListener('click', confirmPhoto);
    fileInput.addEventListener('change', handleFileSelect);
    
    // Add click listeners to checklist items
    const checklistItems = document.querySelectorAll('.checklist-item');
    checklistItems.forEach((item, index) => {
        item.addEventListener('click', () => {
            if (index !== currentPhotoIndex) {
                currentPhotoIndex = index;
                updatePhotoDisplay();
                updateProgress();
                updateChecklist();
                updateCompass();
                
                // Reset photo capture UI
                photoActions.style.display = 'none';
                cameraPreview.style.display = 'block';
                aiAnalysis.style.display = 'none';
                fileInput.value = '';
            }
        });
    });
}

function updatePhotoDisplay() {
    const currentPhoto = overviewPhotos[currentPhotoIndex];
    photoTitle.textContent = currentPhoto.name;
    photoIcon.textContent = currentPhoto.icon;
    photoInstructions.textContent = currentPhoto.instructions;
    
    // Update status
    const statusBadge = photoStatus.querySelector('.status-badge');
    if (capturedPhotos[currentPhoto.key]) {
        statusBadge.textContent = 'Completed';
        statusBadge.className = 'status-badge completed';
    } else {
        statusBadge.textContent = 'Pending';
        statusBadge.className = 'status-badge pending';
    }
}

function updateProgress() {
    const progress = ((currentPhotoIndex + 1) / overviewPhotos.length) * 100;
    progressFill.style.width = `${progress}%`;
    progressText.textContent = `Step ${currentPhotoIndex + 1} of ${overviewPhotos.length}`;
}

function updateChecklist() {
    const checklistItems = document.querySelectorAll('.checklist-item');
    checklistItems.forEach((item, index) => {
        const photoKey = overviewPhotos[index].key;
        const statusIcon = item.querySelector('.checklist-status');
        
        item.classList.remove('current', 'completed', 'pending');
        
        if (index === currentPhotoIndex) {
            item.classList.add('current');
            statusIcon.textContent = '📷';
        } else if (capturedPhotos[photoKey]) {
            item.classList.add('completed');
            statusIcon.textContent = '✅';
        } else {
            item.classList.add('pending');
            statusIcon.textContent = '⏳';
        }
    });
}

function updateCompass() {
    const compassPoints = document.querySelectorAll('.compass-point');
    compassPoints.forEach(point => {
        point.classList.remove('current', 'completed');
        
        const direction = point.dataset.direction;
        const currentPhoto = overviewPhotos[currentPhotoIndex];
        
        if (direction === currentPhoto.compassPosition) {
            point.classList.add('current');
        } else if (capturedPhotos[currentPhoto.key]) {
            point.classList.add('completed');
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
    capturedPhotos[overviewPhotos[currentPhotoIndex].key] = imageData;
    
    // Update UI
    updatePhotoDisplay();
    updateChecklist();
    updateCompass();
}

function retakePhoto() {
    // Reset photo capture
    photoActions.style.display = 'none';
    cameraPreview.style.display = 'block';
    
    // Clear stored photo
    delete capturedPhotos[overviewPhotos[currentPhotoIndex].key];
    
    // Update UI
    updatePhotoDisplay();
    updateChecklist();
    updateCompass();
    
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
        const currentPhoto = overviewPhotos[currentPhotoIndex];
        const photoData = capturedPhotos[currentPhoto.key];
        if (!photoData) {
            throw new Error('No photo data available for analysis');
        }
        
        // Resize image for API efficiency
        const resizedImageData = await resizeImageForAPI(photoData);
        
        // Call ChatGPT API with specialized prompts
        const analysisResults = await analyzeOverviewWithChatGPT(resizedImageData, currentPhoto);
        displayAIResults(analysisResults);
        
    } catch (error) {
        console.error('AI Analysis Error:', error);
        
        // Fallback to simulated analysis if API fails
        const fallbackResults = simulateOverviewAnalysis();
        fallbackResults.apiError = error.message;
        displayAIResults(fallbackResults);
    }
}

// Specialized ChatGPT analysis for overview photos
async function analyzeOverviewWithChatGPT(imageData, photoInfo) {
    if (!isAPIKeyConfigured()) {
        throw new Error('API key not configured. Please provide your ChatGPT API key.');
    }

    const apiKey = getAPIKey();
    
    const prompt = `Analyze this ${photoInfo.name} photo for roof inspection purposes. Please evaluate:

1. Roof Surface Condition:
   - Overall condition of the roof surface
   - Any visible damage, wear, or deterioration
   - Shingle condition and alignment
   - Signs of weather damage or aging

2. Photo Quality:
   - Is the image clear and in focus?
   - Is the lighting adequate for inspection?
   - Is the roof surface properly framed and visible?

3. Damage Assessment:
   - Any visible damage to shingles?
   - Missing or loose shingles?
   - Cracks, splits, or lifting?
   - Signs of water damage or leaks?
   - Debris or blockages?

4. Coverage Assessment:
   - Does the photo provide good coverage of the roof area?
   - Are there any obstructions blocking the view?
   - Is the perspective appropriate for inspection?

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
  "roofCondition": "excellent" | "good" | "fair" | "poor" | "damaged",
  "damageDetected": boolean,
  "damageTypes": ["missing_shingles" | "cracks" | "lifting" | "weather_damage" | "water_damage" | "debris" | "other"],
  "coverageQuality": "excellent" | "good" | "fair" | "poor",
  "issues": [
    {
      "type": "roof_condition" | "damage" | "coverage" | "clarity" | "lighting" | "composition" | "technical",
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
        roofCondition: 'fair',
        damageDetected: false,
        damageTypes: [],
        coverageQuality: 'fair',
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

    if (lowerText.includes('damage') || lowerText.includes('crack') || lowerText.includes('missing')) {
        analysis.damageDetected = true;
        analysis.roofCondition = 'damaged';
    } else if (lowerText.includes('excellent condition') || lowerText.includes('good condition')) {
        analysis.roofCondition = 'excellent';
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

function simulateOverviewAnalysis() {
    const issues = [];
    const recommendations = [];
    
    // Simulate overview analysis
    const damageDetected = Math.random() > 0.7;
    const roofCondition = damageDetected ? 
        (Math.random() > 0.5 ? 'fair' : 'poor') : 
        (Math.random() > 0.3 ? 'good' : 'excellent');
    
    if (damageDetected) {
        issues.push({
            type: 'damage',
            message: 'Visible damage detected on roof surface',
            severity: 'high'
        });
    }
    
    if (Math.random() > 0.6) {
        recommendations.push('Ensure photo captures maximum roof surface area');
    }
    
    return {
        overallQuality: Math.random() > 0.3 ? 'good' : 'needs_improvement',
        confidence: Math.floor(Math.random() * 30) + 70,
        roofCondition: roofCondition,
        damageDetected: damageDetected,
        damageTypes: damageDetected ? ['weather_damage', 'cracks'] : [],
        coverageQuality: Math.random() > 0.4 ? 'good' : 'fair',
        issues: issues,
        recommendations: recommendations,
        shouldRetake: Math.random() > 0.8
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
    
    // Roof condition analysis
    const roofClass = results.roofCondition === 'excellent' || results.roofCondition === 'good' ? 'overview-good' : 'overview-damaged';
    html += `<div class="overview-analysis ${roofClass}">
        <h4>🏠 Roof Condition Analysis</h4>
        <p>Roof Condition: ${results.roofCondition.charAt(0).toUpperCase() + results.roofCondition.slice(1)}</p>
        <p>Damage Detected: ${results.damageDetected ? 'Yes' : 'No'}</p>
        <p>Coverage Quality: ${results.coverageQuality.charAt(0).toUpperCase() + results.coverageQuality.slice(1)}</p>
        ${results.damageTypes && results.damageTypes.length > 0 ? 
            `<p>Damage Types: ${results.damageTypes.join(', ')}</p>` : ''}
    </div>`;
    
    // Damage summary
    if (results.damageDetected) {
        const damageClass = results.damageDetected ? 'damage-found' : 'no-damage';
        html += `<div class="damage-summary ${damageClass}">
            <h4>⚠️ Damage Summary</h4>
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
        html += '<div class="ai-actions"><button class="action-btn primary" onclick="proceedToNextPhoto()">Continue to Next Photo</button></div>';
    } else {
        html += '<div class="ai-actions">';
        html += '<button class="action-btn secondary" onclick="retakePhoto()">Retake Photo</button>';
        html += '<button class="action-btn primary" onclick="proceedToNextPhoto()">Continue Anyway</button>';
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

function proceedToNextPhoto() {
    // Hide AI analysis
    aiAnalysis.style.display = 'none';
    
    // Move to next photo
    if (currentPhotoIndex < overviewPhotos.length - 1) {
        currentPhotoIndex++;
        updatePhotoDisplay();
        updateProgress();
        updateChecklist();
        updateCompass();
        
        // Reset photo capture UI
        photoActions.style.display = 'none';
        cameraPreview.style.display = 'block';
        fileInput.value = '';
    } else {
        // All photos completed
        allPhotosCompleted();
    }
}

function allPhotosCompleted() {
    // Enable next button
    nextBtn.disabled = false;
    nextBtn.innerHTML = '<span class="btn-text">Continue to Roof Accessories</span><span class="btn-icon">→</span>';
    
    // Show completion message
    alert('All roof overview photos completed! Ready to proceed to roof accessories documentation.');
}

function switchCamera() {
    // This would switch between front/back camera on mobile
    // For now, just show a message
    alert('Camera switching functionality will be implemented for mobile devices.');
}

function goBack() {
    if (currentPhotoIndex > 0) {
        currentPhotoIndex--;
        updatePhotoDisplay();
        updateProgress();
        updateChecklist();
        updateCompass();
        
        // Reset UI
        photoActions.style.display = 'none';
        cameraPreview.style.display = 'block';
        aiAnalysis.style.display = 'none';
        fileInput.value = '';
    } else {
        // Go back to ridge inspection
        window.location.href = 'ridge-inspection.html';
    }
}

function proceedToNext() {
    if (nextBtn.disabled) {
        return;
    }
    
    // Navigate to roof accessories
    window.location.href = 'roof-accessories.html';
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
    const fallbackResults = simulateOverviewAnalysis();
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
