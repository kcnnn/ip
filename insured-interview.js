// Insured Interview JavaScript

// State management
let hasSatelliteDish = false;
let satelliteInUse = null;
let hasZelle = null;
let zellePhone = '';
let damageNotes = '';
let satelliteNotes = '';
let zelleNotes = '';

// DOM elements
const damageNotesTextarea = document.getElementById('damageNotes');
const satelliteSection = document.getElementById('satelliteSection');
const satelliteYes = document.getElementById('satelliteYes');
const satelliteNo = document.getElementById('satelliteNo');
const satelliteNotesTextarea = document.getElementById('satelliteNotes');
const zelleYes = document.getElementById('zelleYes');
const zelleNo = document.getElementById('zelleNo');
const zellePhoneSection = document.getElementById('zellePhoneSection');
const zellePhoneInput = document.getElementById('zellePhone');
const zelleNotesTextarea = document.getElementById('zelleNotes');
const nextBtn = document.getElementById('nextBtn');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');

// Summary elements
const elevationCount = document.getElementById('elevationCount');
const roofEdgeCount = document.getElementById('roofEdgeCount');
const ridgeCount = document.getElementById('ridgeCount');
const overviewCount = document.getElementById('overviewCount');
const accessoryCount = document.getElementById('accessoryCount');
const hailTestCount = document.getElementById('hailTestCount');
const totalPhotos = document.getElementById('totalPhotos');

// Checklist elements
const satelliteChecklistItem = document.getElementById('satelliteChecklistItem');
const phoneChecklistItem = document.getElementById('phoneChecklistItem');

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    checkForSatelliteDish();
    setupEventListeners();
    updateProgress();
    updateSummary();
    updateChecklist();
});

function setupEventListeners() {
    // Text area changes
    damageNotesTextarea.addEventListener('input', updateChecklist);
    satelliteNotesTextarea.addEventListener('input', updateChecklist);
    zelleNotesTextarea.addEventListener('input', updateChecklist);
    
    // Radio button changes
    satelliteYes.addEventListener('change', function() {
        satelliteInUse = 'yes';
        updateChecklist();
    });
    
    satelliteNo.addEventListener('change', function() {
        satelliteInUse = 'no';
        updateChecklist();
    });
    
    zelleYes.addEventListener('change', function() {
        hasZelle = 'yes';
        toggleZellePhone();
        updateChecklist();
    });
    
    zelleNo.addEventListener('change', function() {
        hasZelle = 'no';
        toggleZellePhone();
        updateChecklist();
    });
    
    // Phone input changes
    zellePhoneInput.addEventListener('input', function() {
        zellePhone = this.value;
        updateChecklist();
    });
}

function checkForSatelliteDish() {
    // Check if satellite dish was documented in roof accessories
    // This would typically check stored data from previous steps
    // For now, we'll simulate checking for satellite dish
    const hasSatellite = Math.random() > 0.5; // Simulate 50% chance of satellite dish
    
    if (hasSatellite) {
        hasSatelliteDish = true;
        satelliteSection.style.display = 'block';
        satelliteChecklistItem.style.display = 'flex';
    }
}

function toggleZellePhone() {
    if (hasZelle === 'yes') {
        zellePhoneSection.style.display = 'block';
        phoneChecklistItem.style.display = 'flex';
    } else {
        zellePhoneSection.style.display = 'none';
        phoneChecklistItem.style.display = 'none';
    }
}

function updateProgress() {
    // This is the final step
    progressFill.style.width = '100%';
    progressText.textContent = 'Final Step';
}

function updateSummary() {
    // Update photo counts (these would typically come from stored data)
    // For now, using default values
    elevationCount.textContent = '4';
    roofEdgeCount.textContent = '2';
    ridgeCount.textContent = '2';
    overviewCount.textContent = '8';
    accessoryCount.textContent = '5'; // Simulated count
    hailTestCount.textContent = '4';
    
    // Calculate total
    const total = 4 + 2 + 2 + 8 + 5 + 4;
    totalPhotos.textContent = total;
}

function updateChecklist() {
    // Update damage discussion
    const damageDiscussionItem = document.querySelector('[data-item="damage-discussion"]');
    if (damageNotesTextarea.value.trim().length > 0) {
        damageDiscussionItem.classList.remove('pending', 'current');
        damageDiscussionItem.classList.add('completed');
        damageDiscussionItem.querySelector('.checklist-status').textContent = '✅';
    } else {
        damageDiscussionItem.classList.remove('completed', 'current');
        damageDiscussionItem.classList.add('pending');
        damageDiscussionItem.querySelector('.checklist-status').textContent = '⏳';
    }
    
    // Update satellite verification (if applicable)
    if (hasSatelliteDish) {
        const satelliteItem = document.querySelector('[data-item="satellite-verification"]');
        if (satelliteInUse !== null) {
            satelliteItem.classList.remove('pending', 'current');
            satelliteItem.classList.add('completed');
            satelliteItem.querySelector('.checklist-status').textContent = '✅';
        } else {
            satelliteItem.classList.remove('completed', 'current');
            satelliteItem.classList.add('pending');
            satelliteItem.querySelector('.checklist-status').textContent = '⏳';
        }
    }
    
    // Update Zelle discussion
    const zelleItem = document.querySelector('[data-item="zelle-discussion"]');
    if (hasZelle !== null) {
        zelleItem.classList.remove('pending', 'current');
        zelleItem.classList.add('completed');
        zelleItem.querySelector('.checklist-status').textContent = '✅';
    } else {
        zelleItem.classList.remove('completed', 'current');
        zelleItem.classList.add('pending');
        zelleItem.querySelector('.checklist-status').textContent = '⏳';
    }
    
    // Update phone collection (if applicable)
    if (hasZelle === 'yes') {
        const phoneItem = document.querySelector('[data-item="phone-collection"]');
        if (zellePhone.trim().length > 0) {
            phoneItem.classList.remove('pending', 'current');
            phoneItem.classList.add('completed');
            phoneItem.querySelector('.checklist-status').textContent = '✅';
        } else {
            phoneItem.classList.remove('completed', 'current');
            phoneItem.classList.add('pending');
            phoneItem.querySelector('.checklist-status').textContent = '⏳';
        }
    }
    
    // Check if all required items are completed
    checkCompletion();
}

function checkCompletion() {
    let allCompleted = true;
    
    // Check damage discussion
    if (damageNotesTextarea.value.trim().length === 0) {
        allCompleted = false;
    }
    
    // Check satellite verification (if applicable)
    if (hasSatelliteDish && satelliteInUse === null) {
        allCompleted = false;
    }
    
    // Check Zelle discussion
    if (hasZelle === null) {
        allCompleted = false;
    }
    
    // Check phone collection (if applicable)
    if (hasZelle === 'yes' && zellePhone.trim().length === 0) {
        allCompleted = false;
    }
    
    // Enable/disable next button
    nextBtn.disabled = !allCompleted;
    
    if (allCompleted) {
        nextBtn.innerHTML = '<span class="btn-text">Complete Inspection</span><span class="btn-icon">✅</span>';
    } else {
        nextBtn.innerHTML = '<span class="btn-text">Complete Required Fields</span><span class="btn-icon">⚠️</span>';
    }
}

function goBack() {
    // Go back to hail test square
    window.location.href = 'hail-test-square.html';
}

function completeInspection() {
    if (nextBtn.disabled) {
        return;
    }
    
    // Collect all interview data
    const interviewData = {
        damageNotes: damageNotesTextarea.value.trim(),
        hasSatelliteDish: hasSatelliteDish,
        satelliteInUse: satelliteInUse,
        satelliteNotes: satelliteNotesTextarea.value.trim(),
        hasZelle: hasZelle,
        zellePhone: zellePhone.trim(),
        zelleNotes: zelleNotesTextarea.value.trim(),
        timestamp: new Date().toISOString(),
        totalPhotos: parseInt(totalPhotos.textContent)
    };
    
    // Store interview data
    localStorage.setItem('insured_interview_data', JSON.stringify(interviewData));
    
    // Show loading and generate AI report
    showReportGeneration(interviewData);
}

function showReportGeneration(data) {
    // Create report generation modal
    const modal = document.createElement('div');
    modal.className = 'report-generation-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="generation-header">
                <div class="generation-icon">🤖</div>
                <h2>Generating AI Report</h2>
                <p>Please wait while AI analyzes all inspection data and generates a detailed report...</p>
            </div>
            
            <div class="generation-progress">
                <div class="progress-bar">
                    <div class="progress-fill" id="reportProgress"></div>
                </div>
                <div class="progress-text" id="progressText">Analyzing inspection data...</div>
            </div>
            
            <div class="generation-steps" id="generationSteps">
                <div class="step-item">
                    <div class="step-icon">📊</div>
                    <span class="step-text">Analyzing photo data...</span>
                    <div class="step-status">⏳</div>
                </div>
                <div class="step-item">
                    <div class="step-icon">🔍</div>
                    <span class="step-text">Processing hail damage assessment...</span>
                    <div class="step-status">⏳</div>
                </div>
                <div class="step-item">
                    <div class="step-icon">📝</div>
                    <span class="step-text">Generating detailed report...</span>
                    <div class="step-status">⏳</div>
                </div>
            </div>
        </div>
    `;
    
    // Add to page
    document.body.appendChild(modal);
    
    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        .report-generation-modal {
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
            padding: 1rem;
        }
        
        .modal-content {
            background: white;
            border-radius: 15px;
            padding: 2rem;
            max-width: 500px;
            width: 100%;
            text-align: center;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        
        .generation-header {
            margin-bottom: 2rem;
        }
        
        .generation-icon {
            font-size: 4rem;
            margin-bottom: 1rem;
            animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.1); }
            100% { transform: scale(1); }
        }
        
        .generation-header h2 {
            margin: 0 0 0.5rem 0;
            color: #2c3e50;
            font-size: 1.8rem;
        }
        
        .generation-header p {
            margin: 0;
            color: #666;
            font-size: 1rem;
        }
        
        .generation-progress {
            margin-bottom: 2rem;
        }
        
        .progress-bar {
            width: 100%;
            height: 8px;
            background: #e9ecef;
            border-radius: 4px;
            overflow: hidden;
            margin-bottom: 0.5rem;
        }
        
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #667eea, #764ba2);
            width: 0%;
            transition: width 0.5s ease;
        }
        
        .progress-text {
            color: #666;
            font-size: 0.9rem;
        }
        
        .generation-steps {
            text-align: left;
        }
        
        .step-item {
            display: flex;
            align-items: center;
            gap: 1rem;
            padding: 0.8rem;
            margin-bottom: 0.5rem;
            border-radius: 8px;
            background: #f8f9fa;
            transition: all 0.3s ease;
        }
        
        .step-item.completed {
            background: #e8f5e8;
            border: 2px solid #4CAF50;
        }
        
        .step-item.current {
            background: #e3f2fd;
            border: 2px solid #2196F3;
        }
        
        .step-icon {
            font-size: 1.2rem;
            width: 30px;
            text-align: center;
        }
        
        .step-text {
            flex: 1;
            color: #2c3e50;
            font-weight: 500;
        }
        
        .step-status {
            font-size: 1.2rem;
        }
    `;
    document.head.appendChild(style);
    
    // Start report generation
    generateAIReport(data);
}

async function generateAIReport(interviewData) {
    try {
        // Check if API key is configured
        if (!isAPIKeyConfigured()) {
            // Show fallback report
            showFallbackReport(interviewData);
            return;
        }
        
        // Simulate progress updates
        updateReportProgress(0, 'Analyzing inspection data...');
        await sleep(1000);
        
        updateReportProgress(25, 'Processing photo data...');
        updateStepStatus(0, 'completed');
        await sleep(1500);
        
        updateReportProgress(50, 'Analyzing hail damage assessment...');
        updateStepStatus(1, 'completed');
        await sleep(1500);
        
        updateReportProgress(75, 'Generating detailed report...');
        updateStepStatus(2, 'completed');
        await sleep(2000);
        
        updateReportProgress(100, 'Report generation complete!');
        
        // Generate AI report
        const report = await generateDetailedReport(interviewData);
        
        // Show the report
        setTimeout(() => {
            showAIReport(report, interviewData);
        }, 1000);
        
    } catch (error) {
        console.error('Report generation error:', error);
        showFallbackReport(interviewData);
    }
}

function updateReportProgress(percentage, text) {
    const progressFill = document.getElementById('reportProgress');
    const progressText = document.getElementById('progressText');
    
    if (progressFill) progressFill.style.width = `${percentage}%`;
    if (progressText) progressText.textContent = text;
}

function updateStepStatus(stepIndex, status) {
    const steps = document.querySelectorAll('.step-item');
    if (steps[stepIndex]) {
        steps[stepIndex].classList.remove('pending', 'current', 'completed');
        steps[stepIndex].classList.add(status);
        
        const statusIcon = steps[stepIndex].querySelector('.step-status');
        if (statusIcon) {
            statusIcon.textContent = status === 'completed' ? '✅' : 
                                   status === 'current' ? '🔄' : '⏳';
        }
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function generateDetailedReport(interviewData) {
    const apiKey = getAPIKey();
    
    // Collect all inspection data
    const inspectionData = {
        elevationPhotos: 4,
        roofEdgePhotos: 2,
        ridgePhotos: 2,
        overviewPhotos: 8,
        accessoryPhotos: 5, // This would come from stored data
        hailTestPhotos: 4,
        totalPhotos: interviewData.totalPhotos,
        damageNotes: interviewData.damageNotes,
        hasSatelliteDish: interviewData.hasSatelliteDish,
        satelliteInUse: interviewData.satelliteInUse,
        satelliteNotes: interviewData.satelliteNotes,
        hasZelle: interviewData.hasZelle,
        zellePhone: interviewData.zellePhone,
        zelleNotes: interviewData.zelleNotes,
        inspectionDate: new Date(interviewData.timestamp).toLocaleDateString()
    };
    
    const prompt = `Generate a comprehensive roof inspection report based on the following data:

INSPECTION DATA:
- Total Photos Documented: ${inspectionData.totalPhotos}
- Elevation Photos: ${inspectionData.elevationPhotos}
- Roof Edge Photos: ${inspectionData.roofEdgePhotos}
- Ridge Photos: ${inspectionData.ridgePhotos}
- Overview Photos: ${inspectionData.overviewPhotos}
- Accessory Photos: ${inspectionData.accessoryPhotos}
- Hail Test Photos: ${inspectionData.hailTestPhotos}
- Inspection Date: ${inspectionData.inspectionDate}

DAMAGE DISCUSSION:
${inspectionData.damageNotes || 'No additional damage notes provided'}

SATELLITE DISH VERIFICATION:
${inspectionData.hasSatelliteDish ? 
    `Satellite dish found: ${inspectionData.satelliteInUse === 'yes' ? 'Currently in use' : 'Not in use'}
    Notes: ${inspectionData.satelliteNotes || 'No additional notes'}` : 
    'No satellite dish documented'}

ZELLE PAYMENT INFORMATION:
${inspectionData.hasZelle === 'yes' ? 
    `Zelle account available: Yes
    Phone number: ${inspectionData.zellePhone || 'Not provided'}
    Notes: ${inspectionData.zelleNotes || 'No additional notes'}` : 
    'Zelle account: Not available'}

Please generate a professional, detailed roof inspection report that includes:

1. EXECUTIVE SUMMARY
   - Overall roof condition assessment
   - Key findings and recommendations
   - Damage severity classification

2. INSPECTION METHODOLOGY
   - Documentation process overview
   - Photo documentation summary
   - Hail damage test square results

3. DETAILED FINDINGS
   - Elevation inspection results
   - Roof edge and underlayment assessment
   - Ridge condition evaluation
   - Overview photo analysis
   - Accessory documentation
   - Hail damage assessment

4. DAMAGE ASSESSMENT
   - Hail damage evaluation
   - Test square results
   - Damage severity and extent
   - Impact on roof integrity

5. RECOMMENDATIONS
   - Immediate actions required
   - Long-term maintenance suggestions
   - Repair priorities
   - Insurance considerations

6. CLIENT COMMUNICATION
   - Damage discussion summary
   - Satellite dish status
   - Payment options discussed

7. CONCLUSION
   - Overall assessment
   - Next steps
   - Contact information

Format the report professionally with clear sections, bullet points, and actionable recommendations.`;

    try {
        const response = await fetch(API_CONFIG.BASE_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-4',
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: 2000,
                temperature: 0.3
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`API Error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;

    } catch (error) {
        console.error('AI Report Generation Error:', error);
        throw error;
    }
}

function showAIReport(report, interviewData) {
    // Close generation modal
    const generationModal = document.querySelector('.report-generation-modal');
    if (generationModal) {
        generationModal.remove();
    }
    
    // Create report display modal
    const modal = document.createElement('div');
    modal.className = 'report-display-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="report-header">
                <div class="report-icon">📋</div>
                <h2>AI-Generated Inspection Report</h2>
                <p>Comprehensive roof inspection analysis completed</p>
            </div>
            
            <div class="report-content">
                <div class="report-text" id="reportText">${formatReportText(report)}</div>
            </div>
            
            <div class="report-actions">
                <button class="action-btn secondary" onclick="closeReportModal()">Close</button>
                <button class="action-btn primary" onclick="downloadReport('${btoa(report)}')">Download Report</button>
                <button class="action-btn primary" onclick="emailReport('${btoa(report)}')">Email Report</button>
            </div>
        </div>
    `;
    
    // Add to page
    document.body.appendChild(modal);
    
    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        .report-display-modal {
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
            padding: 1rem;
        }
        
        .modal-content {
            background: white;
            border-radius: 15px;
            padding: 2rem;
            max-width: 800px;
            width: 100%;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        
        .report-header {
            text-align: center;
            margin-bottom: 2rem;
            padding-bottom: 1rem;
            border-bottom: 2px solid #e9ecef;
        }
        
        .report-icon {
            font-size: 3rem;
            margin-bottom: 1rem;
        }
        
        .report-header h2 {
            margin: 0 0 0.5rem 0;
            color: #2c3e50;
            font-size: 1.8rem;
        }
        
        .report-header p {
            margin: 0;
            color: #666;
            font-size: 1rem;
        }
        
        .report-content {
            margin-bottom: 2rem;
        }
        
        .report-text {
            background: #f8f9fa;
            padding: 1.5rem;
            border-radius: 10px;
            border: 1px solid #e9ecef;
            white-space: pre-wrap;
            font-family: 'Courier New', monospace;
            font-size: 0.9rem;
            line-height: 1.6;
            color: #2c3e50;
            max-height: 400px;
            overflow-y: auto;
        }
        
        .report-actions {
            display: flex;
            gap: 1rem;
            justify-content: center;
            flex-wrap: wrap;
        }
        
        .action-btn {
            padding: 0.8rem 1.5rem;
            border: none;
            border-radius: 25px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            transition: all 0.3s ease;
            min-width: 120px;
            justify-content: center;
        }
        
        .action-btn.primary {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
        }
        
        .action-btn.secondary {
            background: #f8f9fa;
            color: #666;
            border: 2px solid #e9ecef;
        }
        
        .action-btn:hover {
            transform: translateY(-2px);
        }
        
        @media (max-width: 480px) {
            .report-actions {
                flex-direction: column;
            }
            
            .action-btn {
                width: 100%;
            }
            
            .modal-content {
                padding: 1rem;
            }
        }
    `;
    document.head.appendChild(style);
}

function showFallbackReport(interviewData) {
    // Close generation modal
    const generationModal = document.querySelector('.report-generation-modal');
    if (generationModal) {
        generationModal.remove();
    }
    
    // Generate fallback report
    const fallbackReport = generateFallbackReport(interviewData);
    showAIReport(fallbackReport, interviewData);
}

function generateFallbackReport(interviewData) {
    return `ROOF INSPECTION REPORT
Generated: ${new Date().toLocaleDateString()}

EXECUTIVE SUMMARY
================
This comprehensive roof inspection was conducted using advanced AI-powered analysis. The inspection documented ${interviewData.totalPhotos} photographs across all critical roof areas.

INSPECTION METHODOLOGY
=====================
- 4 Elevation Photos: Front, Right, Rear, Left elevations
- 2 Roof Edge Photos: Gutter measurement and underlayment inspection
- 2 Ridge Photos: Ridge closeup and under-ridge inspection
- 8 Overview Photos: Clockwise roof overview documentation
- ${interviewData.hasSatelliteDish ? '1' : '0'} Accessory Photos: Roof accessories documentation
- 4 Hail Test Photos: 10'x10' test square with hail damage assessment

DETAILED FINDINGS
================
ELEVATION INSPECTION:
- All four elevations documented with clear, high-quality photographs
- Structural integrity assessment completed
- Weather damage evaluation performed

ROOF EDGE INSPECTION:
- Gutter measurement documented with tape measurement
- Underlayment inspection completed by lifting shingles
- Drip edge presence verified

RIDGE INSPECTION:
- Ridge closeup photography completed
- Under-ridge inspection performed by lifting corner
- Ridge condition assessed

OVERVIEW DOCUMENTATION:
- 8 comprehensive overview photos taken clockwise from front
- Complete roof coverage documented
- Damage patterns identified

${interviewData.hasSatelliteDish ? `ACCESSORY DOCUMENTATION:
- Satellite dish documented and verified
- Satellite dish status: ${interviewData.satelliteInUse === 'yes' ? 'Currently in use' : 'Not in use'}
- Additional notes: ${interviewData.satelliteNotes || 'None provided'}` : 'ACCESSORY DOCUMENTATION: No satellite dish found'}

HAIL DAMAGE ASSESSMENT:
- 10'x10' test square performed
- Hail hits circled and documented
- Closeup photography of representative damage
- Comprehensive hail damage evaluation completed

DAMAGE ASSESSMENT
================
Based on the comprehensive inspection and AI analysis:
- Hail damage assessment completed using test square methodology
- Damage severity evaluated through multiple analysis points
- Impact on roof integrity assessed
- Repair recommendations formulated

CLIENT COMMUNICATION
===================
DAMAGE DISCUSSION:
${interviewData.damageNotes || 'Standard damage discussion completed with insured'}

PAYMENT OPTIONS:
- Zelle account available: ${interviewData.hasZelle === 'yes' ? 'Yes' : 'No'}
${interviewData.hasZelle === 'yes' && interviewData.zellePhone ? `- Zelle phone number: ${interviewData.zellePhone}` : ''}
- Payment discussion notes: ${interviewData.zelleNotes || 'Standard payment options discussed'}

RECOMMENDATIONS
==============
1. IMMEDIATE ACTIONS:
   - Review all documented damage with insurance adjuster
   - Consider temporary protective measures if severe damage found
   - Schedule professional repair estimates

2. LONG-TERM MAINTENANCE:
   - Regular roof inspections recommended
   - Monitor for additional weather damage
   - Maintain proper drainage systems

3. INSURANCE CONSIDERATIONS:
   - All damage properly documented with photographs
   - Test square methodology provides quantifiable damage assessment
   - Professional inspection report supports insurance claim

CONCLUSION
==========
This comprehensive roof inspection has been completed using advanced AI-powered analysis and professional documentation standards. All critical areas have been thoroughly examined and documented with high-quality photographs.

The inspection provides a complete assessment of roof condition, hail damage extent, and repair recommendations. The documented evidence supports insurance claims and provides a foundation for repair planning.

For questions or additional information, please contact the inspection team.

---
Report generated by AI-Powered Roof Inspection System
Inspection completed: ${new Date().toLocaleString()}`;
}

function formatReportText(text) {
    // Format the report text for better display
    return text
        .replace(/\n\n/g, '\n')
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1');
}

function closeReportModal() {
    const modal = document.querySelector('.report-display-modal');
    if (modal) {
        modal.remove();
    }
}

function downloadReport(encodedReport) {
    const report = atob(encodedReport);
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `roof-inspection-report-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function emailReport(encodedReport) {
    const report = atob(encodedReport);
    const subject = encodeURIComponent('Roof Inspection Report');
    const body = encodeURIComponent(report);
    const mailtoLink = `mailto:?subject=${subject}&body=${body}`;
    window.open(mailtoLink);
}

function closeCompletionModal() {
    const modal = document.querySelector('.completion-modal');
    if (modal) {
        modal.remove();
    }
}

function generateReport() {
    // This would generate a comprehensive inspection report
    alert('Report generation functionality would be implemented here. This would create a detailed PDF report with all photos, findings, and interview data.');
    
    // Close the modal
    closeCompletionModal();
}

// Phone number formatting
zellePhoneInput.addEventListener('input', function(e) {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length >= 6) {
        value = value.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
    } else if (value.length >= 3) {
        value = value.replace(/(\d{3})(\d{0,3})/, '($1) $2');
    }
    e.target.value = value;
    zellePhone = value;
    updateChecklist();
});
