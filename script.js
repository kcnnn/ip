// Inspection Wizard JavaScript

// Function to start the inspection process
function startInspection() {
    // Add loading state to button
    const startButton = document.querySelector('.start-button');
    const originalText = startButton.innerHTML;
    
    startButton.innerHTML = `
        <span class="button-text">STARTING...</span>
        <span class="button-arrow">⏳</span>
    `;
    startButton.disabled = true;
    
    // Simulate loading and then navigate to elevation photos
    setTimeout(() => {
        // Check if API key is configured, if not, go to setup first
        if (typeof isAPIKeyConfigured === 'function' && !isAPIKeyConfigured()) {
            window.location.href = 'api-setup.html';
        } else {
            window.location.href = 'elevation-photos.html';
        }
    }, 1500);
}

// Add some interactive effects
document.addEventListener('DOMContentLoaded', function() {
    // Add fade-in animation to hero content
    const heroContent = document.querySelector('.hero-content');
    heroContent.style.opacity = '0';
    heroContent.style.transform = 'translateY(30px)';
    
    setTimeout(() => {
        heroContent.style.transition = 'all 0.8s ease';
        heroContent.style.opacity = '1';
        heroContent.style.transform = 'translateY(0)';
    }, 100);
    
    // Add hover effects to features
    const features = document.querySelectorAll('.feature');
    features.forEach(feature => {
        feature.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-8px) scale(1.02)';
        });
        
        feature.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });
});

// Utility function for future API calls
function makeAPICall(endpoint, data) {
    // This will be used for ChatGPT API integration
    return fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    });
}

// Function to save inspection data (for future use)
function saveInspectionData(data) {
    localStorage.setItem('inspectionData', JSON.stringify(data));
}

// Function to load inspection data (for future use)
function loadInspectionData() {
    const data = localStorage.getItem('inspectionData');
    return data ? JSON.parse(data) : null;
}
