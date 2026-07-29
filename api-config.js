// API Configuration for Claude (Anthropic) Integration

// API Configuration
const API_CONFIG = {
    // API key will be set by user through the setup page
    API_KEY: '', // Will be populated from localStorage or user input
    BASE_URL: 'https://api.anthropic.com/v1/messages',
    MODEL: 'claude-sonnet-5', // Claude model with vision capabilities
    MAX_TOKENS: 1000,
    TEMPERATURE: 0.3,
    ANTHROPIC_VERSION: '2023-06-01'
};

// Function to set API key (called when user provides it)
function setAPIKey(apiKey) {
    API_CONFIG.API_KEY = apiKey;
    localStorage.setItem('claude_api_key', apiKey);
}

// Function to get API key from localStorage
function getAPIKey() {
    return localStorage.getItem('claude_api_key') || localStorage.getItem('chatgpt_api_key') || API_CONFIG.API_KEY;
}

// Initialize API key on load
document.addEventListener('DOMContentLoaded', function() {
    // Set the API key in localStorage if not already set
    if (!localStorage.getItem('claude_api_key')) {
        localStorage.setItem('claude_api_key', API_CONFIG.API_KEY);
    }
});

// Function to check if API key is configured
function isAPIKeyConfigured() {
    const key = getAPIKey();
    return key && key.length > 0;
}

// Helper to split a base64 data URL into media type + raw base64 data
function parseDataUrl(dataUrl) {
    const match = dataUrl.match(/^data:(image\/[a-zA-Z]+);base64,(.*)$/);
    if (!match) {
        throw new Error('Image data is not a valid base64 data URL');
    }
    return { mediaType: match[1], base64Data: match[2] };
}

// Function to make API call to Claude
async function analyzePhotoWithChatGPT(imageData, elevationType) {
    if (!isAPIKeyConfigured()) {
        throw new Error('API key not configured. Please provide your Claude API key.');
    }

    const apiKey = getAPIKey();
    const { mediaType, base64Data } = parseDataUrl(imageData);
    
    // Prepare the prompt for photo analysis
    const prompt = `Analyze this ${elevationType} elevation photo of a property for inspection purposes. Please evaluate:

1. Photo Quality:
   - Is the image clear and in focus?
   - Is the lighting adequate?
   - Is the photo taken from an appropriate distance?

2. Composition:
   - Does the photo capture the entire elevation?
   - Is the property centered and well-framed?
   - Are there any obstructions blocking the view?

3. Technical Issues:
   - Any blurriness or motion blur?
   - Overexposure or underexposure?
   - Poor angle or perspective?

4. Recommendations:
   - What improvements could be made?
   - Should the photo be retaken?

Please respond in JSON format with the following structure:
{
  "overallQuality": "good" | "needs_improvement" | "poor",
  "confidence": number (0-100),
  "issues": [
    {
      "type": "clarity" | "distance" | "lighting" | "composition" | "technical",
      "message": "Description of the issue",
      "severity": "low" | "medium" | "high"
    }
  ],
  "recommendations": [
    "Specific recommendation text"
  ],
  "shouldRetake": boolean
}

Respond with ONLY the raw JSON object above and nothing else - no explanation, no markdown code fences, no additional text before or after it.`;

    try {
        const response = await fetch(API_CONFIG.BASE_URL, {
            method: 'POST',
            headers: {
                'x-api-key': apiKey,
                'anthropic-version': API_CONFIG.ANTHROPIC_VERSION,
                'anthropic-dangerous-direct-browser-access': 'true',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: API_CONFIG.MODEL,
                max_tokens: API_CONFIG.MAX_TOKENS,
                temperature: API_CONFIG.TEMPERATURE,
                messages: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'image',
                                source: {
                                    type: 'base64',
                                    media_type: mediaType,
                                    data: base64Data
                                }
                            },
                            {
                                type: 'text',
                                text: prompt
                            }
                        ]
                    }
                ]
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`API Error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
        }

        const data = await response.json();
        const analysisText = data.content?.[0]?.text || '';

        // Parse the JSON response
        try {
            const analysis = JSON.parse(analysisText);
            return analysis;
        } catch (parseError) {
            // If JSON parsing fails, try to extract information from text
            return parseTextResponse(analysisText);
        }

    } catch (error) {
        console.error('Claude API Error:', error);
        throw error;
    }
}

// Fallback function to parse text response if JSON parsing fails
function parseTextResponse(text) {
    // This is a fallback for when the API doesn't return proper JSON
    const analysis = {
        overallQuality: 'needs_improvement',
        confidence: 70,
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

    if (lowerText.includes('blur') || lowerText.includes('unclear')) {
        analysis.issues.push({
            type: 'clarity',
            message: 'Photo appears blurry or unclear',
            severity: 'high'
        });
        analysis.shouldRetake = true;
    }

    if (lowerText.includes('too close') || lowerText.includes('distance')) {
        analysis.issues.push({
            type: 'distance',
            message: 'Photo may be taken from too close',
            severity: 'medium'
        });
    }

    if (lowerText.includes('lighting') || lowerText.includes('dark') || lowerText.includes('bright')) {
        analysis.issues.push({
            type: 'lighting',
            message: 'Lighting issues detected',
            severity: 'medium'
        });
    }

    if (lowerText.includes('retake') || lowerText.includes('take again')) {
        analysis.shouldRetake = true;
    }

    return analysis;
}

// Function to convert image file to base64
function convertImageToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
}

// Function to resize image for API (to reduce payload size)
function resizeImageForAPI(imageData, maxWidth = 1024, maxHeight = 1024) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Calculate new dimensions
            let { width, height } = img;
            if (width > height) {
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }
            } else {
                if (height > maxHeight) {
                    width = (width * maxHeight) / height;
                    height = maxHeight;
                }
            }
            
            canvas.width = width;
            canvas.height = height;
            
            // Draw and convert to base64
            ctx.drawImage(img, 0, 0, width, height);
            const resizedData = canvas.toDataURL('image/jpeg', 0.8);
            resolve(resizedData);
        };
        img.src = imageData;
    });
}

// Export functions for use in other files
window.API_CONFIG = API_CONFIG;
window.setAPIKey = setAPIKey;
window.getAPIKey = getAPIKey;
window.isAPIKeyConfigured = isAPIKeyConfigured;
window.analyzePhotoWithChatGPT = analyzePhotoWithChatGPT;
window.convertImageToBase64 = convertImageToBase64;
window.resizeImageForAPI = resizeImageForAPI;
