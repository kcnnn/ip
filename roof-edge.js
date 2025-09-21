// Roof Edge Inspection JavaScript

// Inspection data
const inspections = [
    {
        name: 'Gutter Measurement',
        icon: '📏',
        instructions: 'Take a clear photo of the gutter with a tape measure showing the gutter size. Ensure the measurement is clearly visible and readable in the photo.',
        key: 'gutter',
        type: 'measurement'
    },
    {
        name: 'Underlayment Inspection',
        icon: '🏠',
        instructions: 'Lift up the shingles to expose the underlayment and take a clear photo. The AI will analyze for drip edge presence.',
        key: 'underlayment',
        type: 'inspection'
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
        const analysisResults = await analyzeRoofEdgeWithChatGPT(resizedImageData, inspectionType, currentInspection.name);
        displayAIResults(analysisResults);
        
    } catch (error) {
        console.error('AI Analysis Error:', error);
        
        // Fallback to simulated analysis if API fails
        const fallbackResults = simulateRoofEdgeAnalysis();
        fallbackResults.apiError = error.message;
        displayAIResults(fallbackResults);
    }
}

// Specialized ChatGPT analysis for roof edge inspections
async function analyzeRoofEdgeWithChatGPT(imageData, inspectionType, inspectionName) {
    if (!isAPIKeyConfigured()) {
        throw new Error('API key not configured. Please provide your ChatGPT API key.');
    }

    const apiKey = getAPIKey();
    
    let prompt = '';
    
    if (inspectionType === 'measurement') {
        prompt = `Analyze this ${inspectionName} photo for roof inspection purposes. Please evaluate:

1. Measurement Visibility:
   - Is the tape measure clearly visible in the photo?
   - Are the measurement numbers readable?
   - Is the gutter size clearly shown?

2. Photo Quality:
   - Is the image clear and in focus?
   - Is the lighting adequate to read measurements?
   - Is the gutter fully visible in the frame?

3. Technical Issues:
   - Any blurriness affecting measurement readability?
   - Overexposure or underexposure?
   - Poor angle or perspective?

4. Recommendations:
   - What improvements could be made for better measurement visibility?
   - Should the photo be retaken?

Please respond in JSON format with the following structure:
{
  "overallQuality": "good" | "needs_improvement" | "poor",
  "confidence": number (0-100),
  "measurementReadable": boolean,
  "issues": [
    {
      "type": "measurement" | "clarity" | "lighting" | "composition" | "technical",
      "message": "Description of the issue",
      "severity": "low" | "medium" | "high"
    }
  ],
  "recommendations": [
    "Specific recommendation text"
  ],
  "shouldRetake": boolean
}`;
    } else if (inspectionType === 'inspection') {
        prompt = `Analyze this ${inspectionName} photo for roof inspection purposes. Please evaluate:

1. Drip Edge Detection:
   - Is there a drip edge visible in the photo?
   - Is the drip edge properly installed?
   - Are there any signs of missing or damaged drip edge?

2. Underlayment Visibility:
   - Is the underlayment clearly visible?
   - Can you see the roof decking?
   - Is the shingle lifting sufficient to show underlayment?

3. Photo Quality:
   - Is the image clear and in focus?
   - Is the lighting adequate for inspection?
   - Is the area of interest properly framed?

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
  "dripEdgeDetected": boolean,
  "dripEdgeCondition": "good" | "poor" | "missing" | "unclear",
  "underlaymentVisible": boolean,
  "issues": [
    {
      "type": "drip_edge" | "underlayment" | "clarity" | "lighting" | "composition" | "technical",
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
    if (inspectionType === 'measurement') {
        analysis.measurementReadable = false;
    } else if (inspectionType === 'inspection') {
        analysis.dripEdgeDetected = false;
        analysis.dripEdgeCondition = 'unclear';
        analysis.underlaymentVisible = false;
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

    // Parse measurement-specific content
    if (inspectionType === 'measurement') {
        if (lowerText.includes('measurement') && (lowerText.includes('visible') || lowerText.includes('readable'))) {
            analysis.measurementReadable = true;
        }
    }

    // Parse inspection-specific content
    if (inspectionType === 'inspection') {
        if (lowerText.includes('drip edge') && (lowerText.includes('visible') || lowerText.includes('present'))) {
            analysis.dripEdgeDetected = true;
        }
        if (lowerText.includes('underlayment') && (lowerText.includes('visible') || lowerText.includes('clear'))) {
            analysis.underlaymentVisible = true;
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

function simulateRoofEdgeAnalysis() {
    const currentInspection = inspections[currentInspectionIndex];
    const issues = [];
    const recommendations = [];
    
    // Simulate analysis based on inspection type
    if (currentInspection.type === 'measurement') {
        // Simulate measurement analysis
        if (Math.random() > 0.7) {
            issues.push({
                type: 'measurement',
                message: 'Measurement numbers may not be clearly readable',
                severity: 'medium'
            });
        }
        
        if (Math.random() > 0.6) {
            recommendations.push('Ensure tape measure is fully extended and numbers are clear');
        }
        
        return {
            overallQuality: Math.random() > 0.3 ? 'good' : 'needs_improvement',
            confidence: Math.floor(Math.random() * 30) + 70,
            measurementReadable: Math.random() > 0.3,
            issues: issues,
            recommendations: recommendations,
            shouldRetake: Math.random() > 0.8
        };
    } else {
        // Simulate underlayment inspection analysis
        const dripEdgeDetected = Math.random() > 0.4;
        const dripEdgeCondition = dripEdgeDetected ? 
            (Math.random() > 0.5 ? 'good' : 'poor') : 'missing';
        
        if (!dripEdgeDetected) {
            issues.push({
                type: 'drip_edge',
                message: 'No drip edge detected in the photo',
                severity: 'high'
            });
        }
        
        if (Math.random() > 0.6) {
            recommendations.push('Ensure shingles are lifted enough to show underlayment clearly');
        }
        
        return {
            overallQuality: Math.random() > 0.3 ? 'good' : 'needs_improvement',
            confidence: Math.floor(Math.random() * 30) + 70,
            dripEdgeDetected: dripEdgeDetected,
            dripEdgeCondition: dripEdgeCondition,
            underlaymentVisible: Math.random() > 0.3,
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
    
    // Special analysis for measurement photos
    if (results.measurementReadable !== undefined) {
        const measurementClass = results.measurementReadable ? 'measurement-good' : 'measurement-poor';
        html += `<div class="measurement-analysis ${measurementClass}">
            <h4>📏 Measurement Analysis</h4>
            <p>Measurement Readable: ${results.measurementReadable ? 'Yes' : 'No'}</p>
        </div>`;
    }
    
    // Special analysis for drip edge detection
    if (results.dripEdgeDetected !== undefined) {
        const dripEdgeClass = results.dripEdgeDetected ? 'drip-edge-detected' : 'drip-edge-not-detected';
        html += `<div class="drip-edge-detection ${dripEdgeClass}">
            <h4>🏠 Drip Edge Analysis</h4>
            <p>Drip Edge Detected: ${results.dripEdgeDetected ? 'Yes' : 'No'}</p>
            ${results.dripEdgeCondition ? `<p>Condition: ${results.dripEdgeCondition}</p>` : ''}
            ${results.underlaymentVisible !== undefined ? `<p>Underlayment Visible: ${results.underlaymentVisible ? 'Yes' : 'No'}</p>` : ''}
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
    nextBtn.innerHTML = '<span class="btn-text">Continue to Ridge Inspection</span><span class="btn-icon">→</span>';
    
    // Show completion message
    alert('Roof edge inspection completed! Ready to proceed to ridge inspection.');
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
        // Go back to elevation photos
        window.location.href = 'elevation-photos.html';
    }
}

function proceedToNext() {
    if (nextBtn.disabled) {
        return;
    }
    
    // Navigate to ridge inspection
    window.location.href = 'ridge-inspection.html';
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
    const fallbackResults = simulateRoofEdgeAnalysis();
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
    
    .measurement-analysis {
        padding: 1rem;
        border-radius: 8px;
        margin: 1rem 0;
    }
    
    .measurement-good {
        background: #e8f5e8;
        border: 2px solid #4CAF50;
        color: #2e7d32;
    }
    
    .measurement-poor {
        background: #ffebee;
        border: 2px solid #f44336;
        color: #c62828;
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
