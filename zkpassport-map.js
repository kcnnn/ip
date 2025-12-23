// Country data storage (using localStorage for simplicity)
const STORAGE_KEY = 'zkpassport_country_data';

// Initialize country data
let countryData = loadCountryData();

// Country code to name mapping (ISO 3166-1 alpha-2)
const countryNames = {
    'US': 'United States', 'GB': 'United Kingdom', 'CA': 'Canada', 'AU': 'Australia',
    'DE': 'Germany', 'FR': 'France', 'IT': 'Italy', 'ES': 'Spain', 'NL': 'Netherlands',
    'BE': 'Belgium', 'CH': 'Switzerland', 'AT': 'Austria', 'SE': 'Sweden', 'NO': 'Norway',
    'DK': 'Denmark', 'FI': 'Finland', 'PL': 'Poland', 'IE': 'Ireland', 'PT': 'Portugal',
    'GR': 'Greece', 'CZ': 'Czech Republic', 'HU': 'Hungary', 'RO': 'Romania', 'BG': 'Bulgaria',
    'HR': 'Croatia', 'SK': 'Slovakia', 'SI': 'Slovenia', 'EE': 'Estonia', 'LV': 'Latvia',
    'LT': 'Lithuania', 'LU': 'Luxembourg', 'MT': 'Malta', 'CY': 'Cyprus', 'IS': 'Iceland',
    'JP': 'Japan', 'CN': 'China', 'KR': 'South Korea', 'IN': 'India', 'SG': 'Singapore',
    'MY': 'Malaysia', 'TH': 'Thailand', 'ID': 'Indonesia', 'PH': 'Philippines', 'VN': 'Vietnam',
    'NZ': 'New Zealand', 'ZA': 'South Africa', 'EG': 'Egypt', 'NG': 'Nigeria', 'KE': 'Kenya',
    'BR': 'Brazil', 'MX': 'Mexico', 'AR': 'Argentina', 'CL': 'Chile', 'CO': 'Colombia',
    'PE': 'Peru', 'VE': 'Venezuela', 'EC': 'Ecuador', 'UY': 'Uruguay', 'PY': 'Paraguay',
    'BO': 'Bolivia', 'CR': 'Costa Rica', 'PA': 'Panama', 'GT': 'Guatemala', 'HN': 'Honduras',
    'SV': 'El Salvador', 'NI': 'Nicaragua', 'DO': 'Dominican Republic', 'CU': 'Cuba',
    'JM': 'Jamaica', 'TT': 'Trinidad and Tobago', 'BS': 'Bahamas', 'BB': 'Barbados',
    'RU': 'Russia', 'UA': 'Ukraine', 'BY': 'Belarus', 'KZ': 'Kazakhstan', 'UZ': 'Uzbekistan',
    'GE': 'Georgia', 'AM': 'Armenia', 'AZ': 'Azerbaijan', 'TR': 'Turkey', 'IL': 'Israel',
    'SA': 'Saudi Arabia', 'AE': 'United Arab Emirates', 'QA': 'Qatar', 'KW': 'Kuwait',
    'BH': 'Bahrain', 'OM': 'Oman', 'JO': 'Jordan', 'LB': 'Lebanon', 'IQ': 'Iraq',
    'IR': 'Iran', 'PK': 'Pakistan', 'BD': 'Bangladesh', 'LK': 'Sri Lanka', 'NP': 'Nepal',
    'MM': 'Myanmar', 'KH': 'Cambodia', 'LA': 'Laos', 'BN': 'Brunei', 'TL': 'East Timor',
    'MN': 'Mongolia', 'TW': 'Taiwan', 'HK': 'Hong Kong', 'MO': 'Macau', 'AF': 'Afghanistan',
    'DZ': 'Algeria', 'AO': 'Angola', 'BJ': 'Benin', 'BW': 'Botswana', 'BF': 'Burkina Faso',
    'BI': 'Burundi', 'CM': 'Cameroon', 'CV': 'Cape Verde', 'CF': 'Central African Republic',
    'TD': 'Chad', 'KM': 'Comoros', 'CG': 'Congo', 'CD': 'DR Congo', 'CI': 'Ivory Coast',
    'DJ': 'Djibouti', 'GQ': 'Equatorial Guinea', 'ER': 'Eritrea', 'SZ': 'Eswatini',
    'ET': 'Ethiopia', 'GA': 'Gabon', 'GM': 'Gambia', 'GH': 'Ghana', 'GN': 'Guinea',
    'GW': 'Guinea-Bissau', 'LS': 'Lesotho', 'LR': 'Liberia', 'LY': 'Libya', 'MG': 'Madagascar',
    'MW': 'Malawi', 'ML': 'Mali', 'MR': 'Mauritania', 'MU': 'Mauritius', 'MA': 'Morocco',
    'MZ': 'Mozambique', 'NA': 'Namibia', 'NE': 'Niger', 'RW': 'Rwanda', 'ST': 'São Tomé and Príncipe',
    'SN': 'Senegal', 'SC': 'Seychelles', 'SL': 'Sierra Leone', 'SO': 'Somalia', 'SS': 'South Sudan',
    'SD': 'Sudan', 'TZ': 'Tanzania', 'TG': 'Togo', 'TN': 'Tunisia', 'UG': 'Uganda',
    'ZM': 'Zambia', 'ZW': 'Zimbabwe'
};

// Load country data from localStorage
function loadCountryData() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        return JSON.parse(stored);
    }
    return {};
}

// Save country data to localStorage
function saveCountryData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(countryData));
}

// Add a country to the data
function addCountry(countryCode) {
    if (!countryCode) return;
    
    const code = countryCode.toUpperCase();
    if (!countryData[code]) {
        countryData[code] = 0;
    }
    countryData[code]++;
    saveCountryData();
    updateMap();
    updateStats();
}

// Initialize map
let map;
function initMap() {
    // Create map centered on the world
    map = L.map('map').setView([20, 0], 2);

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18
    }).addTo(map);

    // Add markers for each country with data
    updateMap();
}

// Update map with country data
function updateMap() {
    // Clear existing markers
    map.eachLayer((layer) => {
        if (layer instanceof L.Marker || layer instanceof L.CircleMarker) {
            map.removeLayer(layer);
        }
    });

    // Get country coordinates (simplified - using approximate centers)
    const countryCoords = getCountryCoordinates();

    // Add markers for countries with data
    Object.keys(countryData).forEach(countryCode => {
        const count = countryData[countryCode];
        if (count > 0 && countryCoords[countryCode]) {
            const coords = countryCoords[countryCode];
            const countryName = countryNames[countryCode] || countryCode;
            
            // Create marker with size based on count
            const radius = Math.max(5, Math.min(30, count * 2));
            const marker = L.circleMarker(coords, {
                radius: radius,
                fillColor: '#4A90E2',
                color: '#2E5C8A',
                weight: 2,
                opacity: 1,
                fillOpacity: 0.7
            }).addTo(map);

            marker.bindPopup(`
                <strong>${countryName}</strong><br>
                Verified: ${count} ${count === 1 ? 'person' : 'people'}
            `);
        }
    });
}

// Get approximate coordinates for countries
function getCountryCoordinates() {
    return {
        'US': [39.8283, -98.5795], 'GB': [54.7024, -3.2766], 'CA': [56.1304, -106.3468],
        'AU': [-25.2744, 133.7751], 'DE': [51.1657, 10.4515], 'FR': [46.2276, 2.2137],
        'IT': [41.8719, 12.5674], 'ES': [40.4637, -3.7492], 'NL': [52.1326, 5.2913],
        'BE': [50.5039, 4.4699], 'CH': [46.8182, 8.2275], 'AT': [47.5162, 14.5501],
        'SE': [60.1282, 18.6435], 'NO': [60.4720, 8.4689], 'DK': [56.2639, 9.5018],
        'FI': [61.9241, 25.7482], 'PL': [51.9194, 19.1451], 'IE': [53.4129, -8.2439],
        'PT': [39.3999, -8.2245], 'GR': [39.0742, 21.8243], 'CZ': [49.8175, 15.4730],
        'HU': [47.1625, 19.5033], 'RO': [45.9432, 24.9668], 'BG': [42.7339, 25.4858],
        'HR': [45.1000, 15.2000], 'SK': [48.6690, 19.6990], 'SI': [46.1512, 14.9955],
        'EE': [58.5953, 25.0136], 'LV': [56.8796, 24.6032], 'LT': [55.1694, 23.8813],
        'LU': [49.8153, 6.1296], 'MT': [35.9375, 14.3754], 'CY': [35.1264, 33.4299],
        'IS': [64.9631, -19.0208], 'JP': [36.2048, 138.2529], 'CN': [35.8617, 104.1954],
        'KR': [35.9078, 127.7669], 'IN': [20.5937, 78.9629], 'SG': [1.3521, 103.8198],
        'MY': [4.2105, 101.9758], 'TH': [15.8700, 100.9925], 'ID': [-0.7893, 113.9213],
        'PH': [12.8797, 121.7740], 'VN': [14.0583, 108.2772], 'NZ': [-40.9006, 174.8860],
        'ZA': [-30.5595, 22.9375], 'EG': [26.0975, 30.0444], 'NG': [9.0820, 8.6753],
        'KE': [-0.0236, 37.9062], 'BR': [-14.2350, -51.9253], 'MX': [23.6345, -102.5528],
        'AR': [-38.4161, -63.6167], 'CL': [-35.6751, -71.5430], 'CO': [4.5709, -74.2973],
        'PE': [-9.1900, -75.0152], 'VE': [6.4238, -66.5897], 'EC': [-1.8312, -78.1834],
        'UY': [-32.5228, -55.7658], 'PY': [-23.4425, -58.4438], 'BO': [-16.2902, -63.5887],
        'CR': [9.7489, -83.7534], 'PA': [8.5380, -80.7821], 'GT': [15.7835, -90.2308],
        'HN': [15.2000, -86.2419], 'SV': [13.7942, -88.8965], 'NI': [12.2650, -85.2072],
        'DO': [18.7357, -70.1627], 'CU': [21.5218, -77.7812], 'JM': [18.1096, -77.2975],
        'TT': [10.6918, -61.2225], 'BS': [25.0343, -77.3963], 'BB': [13.1939, -59.5432],
        'RU': [61.5240, 105.3188], 'UA': [48.3794, 31.1656], 'BY': [53.7098, 27.9534],
        'KZ': [48.0196, 66.9237], 'UZ': [41.3775, 64.5853], 'GE': [42.3154, 43.3569],
        'AM': [40.0691, 45.0382], 'AZ': [40.1431, 47.5769], 'TR': [38.9637, 35.2433],
        'IL': [31.0461, 34.8516], 'SA': [23.8859, 45.0792], 'AE': [23.4241, 53.8478],
        'QA': [25.3548, 51.1839], 'KW': [29.3117, 47.4818], 'BH': [25.9304, 50.6378],
        'OM': [21.4735, 55.9754], 'JO': [30.5852, 36.2384], 'LB': [33.8547, 35.8623],
        'IQ': [33.2232, 43.6793], 'IR': [32.4279, 53.6880], 'PK': [30.3753, 69.3451],
        'BD': [23.6850, 90.3563], 'LK': [7.8731, 80.7718], 'NP': [28.3949, 84.1240],
        'MM': [21.9162, 95.9560], 'KH': [12.5657, 104.9910], 'LA': [19.8563, 102.4955],
        'BN': [4.5353, 114.7277], 'TL': [-8.8742, 125.7275], 'MN': [46.8625, 103.8467],
        'TW': [23.6978, 120.9605], 'HK': [22.3193, 114.1694], 'MO': [22.1987, 113.5439],
        'AF': [33.9391, 67.7100], 'DZ': [28.0339, 1.6596], 'AO': [-11.2027, 17.8739],
        'BJ': [9.3077, 2.3158], 'BW': [-22.3285, 24.6849], 'BF': [12.2383, -1.5616],
        'BI': [-3.3731, 29.9189], 'CM': [7.3697, 12.3547], 'CV': [16.5388, -24.0132],
        'CF': [6.6111, 20.9394], 'TD': [15.4542, 18.7322], 'KM': [-11.6455, 43.3333],
        'CG': [-0.2280, 15.8277], 'CD': [-4.0383, 21.7587], 'CI': [7.5400, -5.5471],
        'DJ': [11.8251, 42.5903], 'GQ': [1.6508, 10.2679], 'ER': [15.1794, 39.7823],
        'SZ': [-26.5225, 31.4659], 'ET': [9.1450, 38.7667], 'GA': [-0.8037, 11.6094],
        'GM': [13.4432, -15.3101], 'GH': [7.9465, -1.0232], 'GN': [9.9456, -9.6966],
        'GW': [11.8037, -15.1804], 'LS': [-29.6103, 28.2336], 'LR': [6.4281, -9.4295],
        'LY': [26.3351, 17.2283], 'MG': [-18.7669, 46.8691], 'MW': [-13.2543, 34.3015],
        'ML': [17.5707, -3.9962], 'MR': [21.0079, -10.9408], 'MU': [-20.3484, 57.5522],
        'MA': [31.7917, -7.0926], 'MZ': [-18.6657, 35.5296], 'NA': [-22.9576, 18.4904],
        'NE': [17.6078, 8.0817], 'RW': [-1.9403, 29.8739], 'ST': [0.1864, 6.6131],
        'SN': [14.4974, -14.4524], 'SC': [-4.6796, 55.4920], 'SL': [8.4606, -11.7799],
        'SO': [5.1521, 46.1996], 'SS': [6.8770, 31.3070], 'SD': [12.8628, 30.2176],
        'TZ': [-6.3690, 34.8888], 'TG': [8.6195, 0.8248], 'TN': [33.8869, 9.5375],
        'UG': [1.3733, 32.2903], 'ZM': [-13.1339, 27.8493], 'ZW': [-19.0154, 29.1549]
    };
}

// Update statistics
function updateStats() {
    const total = Object.values(countryData).reduce((sum, count) => sum + count, 0);
    const countries = Object.keys(countryData).filter(code => countryData[code] > 0).length;
    
    document.getElementById('totalCount').textContent = total;
    document.getElementById('countryCount').textContent = countries;
}

// ZKPassport integration
import { ZKPassport } from "@zkpassport/sdk";
import QRCode from "qrcode";

console.log('QRCode library loaded:', typeof QRCode);
console.log('ZKPassport library loaded:', typeof ZKPassport);

// Global test function - created at module load time
if (typeof window !== 'undefined') {
    window.testZKPassportResult = function(testResult) {
        console.log('=== TEST: Manually triggering result handler ===');
        if (window.zkPassportResultHandler) {
            window.zkPassportResultHandler({
                verified: true,
                result: testResult || {
                    nationality: {
                        disclose: {
                            result: 'US' // Test with US
                        }
                    }
                }
            });
        } else {
            console.error('Result handler not available yet. Trying direct processing...');
            // Try to use processVerificationResult directly
            if (typeof processVerificationResult === 'function') {
                processVerificationResult(true, testResult || {
                    nationality: {
                        disclose: {
                            result: 'US'
                        }
                    }
                });
            } else {
                console.error('processVerificationResult function not available');
            }
        }
    };
    console.log('✓✓✓ TEST FUNCTION CREATED! Type: window.testZKPassportResult() to test ✓✓✓');
    console.log('Test function exists:', typeof window.testZKPassportResult);
} else {
    console.error('window object not available - this is not a browser environment');
}

// Global variable to store the verification URL and query builder
let currentVerificationUrl = null;
let currentQueryBuilder = null;

async function initZKPassport() {
    const qrCodeContainer = document.getElementById('qrCodeContainer');
    const qrCodeCanvas = document.getElementById('qrCode');
    const statusDiv = document.getElementById('status');

    // Check if required elements exist
    if (!qrCodeContainer || !qrCodeCanvas || !statusDiv) {
        console.error('Required DOM elements not found');
        return;
    }

    const qrLoading = qrCodeContainer.querySelector('.qr-loading');
    if (!qrLoading) {
        console.error('QR loading element not found');
        return;
    }

    // Initialize ZKPassport
    // Domain is optional in browser - it will be inferred automatically
    const zkPassport = new ZKPassport();
    
    // Store zkPassport instance globally so we can query it later
    window.zkPassportInstance = zkPassport;

    try {
        statusDiv.textContent = 'Initializing ZKPassport verification...';
        statusDiv.className = 'status-message info';
        console.log('Starting ZKPassport initialization...');

        // Create verification request
        console.log('Creating verification request...');
        const queryBuilder = await zkPassport.request({
            name: "Global Citizen Map",
            logo: window.location.origin + "/logo.png",
            purpose: "Verify your country of residence",
            scope: "residency-verification",
        });

        console.log('Query builder created, requesting nationality...');
        // Request nationality (country) disclosure
        const { url, onResult } = queryBuilder
            .disclose("nationality")
            .done();

        console.log('Verification URL generated:', url);
        
        // Store these globally for later use
        currentVerificationUrl = url;
        currentQueryBuilder = queryBuilder;
        window.currentVerificationUrl = url;
        window.currentQueryBuilder = queryBuilder;

        // Set up result handler
        console.log('Setting up onResult callback...');
        const resultHandler = ({ verified, result }) => {
            console.log('=== Verification result received via callback ===');
            console.log('Verified:', verified);
            console.log('Result:', result);
            console.log('Result type:', typeof result);
            console.log('Result stringified:', JSON.stringify(result, null, 2));
            
            // Store result in localStorage in case page reloads
            if (result) {
                localStorage.setItem('zkpassport_last_result', JSON.stringify(result));
                localStorage.setItem('zkpassport_last_verified', verified.toString());
                localStorage.setItem('zkpassport_result_timestamp', Date.now().toString());
            }
            
            processVerificationResult(verified, result);
        };
        
        onResult(resultHandler);
        console.log('onResult callback registered');
        
        // Store handler globally so we can test it
        window.zkPassportResultHandler = resultHandler;
        console.log('Result handler stored globally. Test function should work now.');
        
        // Test: Try to manually trigger result check after a delay
        // Sometimes ZKPassport needs time to process
        setTimeout(async () => {
            console.log('=== Delayed check for results (5 seconds after init) ===');
            await checkURLForResult();
        }, 5000);
        
        // Also check periodically in case result comes in later
        const resultCheckInterval = setInterval(() => {
            console.log('=== Periodic result check ===');
            checkURLForResult();
        }, 3000);
        
        // Stop checking after 5 minutes
        setTimeout(() => {
            clearInterval(resultCheckInterval);
            console.log('Stopped periodic result checking after 5 minutes');
        }, 5 * 60 * 1000);
        
        // Show check button immediately (in case callback doesn't fire)
        const checkButton = document.getElementById('checkResultButton');
        if (checkButton) {
            checkButton.style.display = 'block';
            console.log('Check button found and made visible');
            
            // Remove any existing listeners to avoid duplicates
            const newButton = checkButton.cloneNode(true);
            checkButton.parentNode.replaceChild(newButton, checkButton);
            
            newButton.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('=== BUTTON CLICKED - Manual check for results triggered ===');
                console.log('Current URL:', window.location.href);
                console.log('Full URL:', window.location.href);
                console.log('URL search:', window.location.search);
                console.log('URL hash:', window.location.hash);
                console.log('localStorage keys:', Object.keys(localStorage).filter(k => k.startsWith('zkpassport')));
                
                const storedResult = localStorage.getItem('zkpassport_last_result');
                const storedVerified = localStorage.getItem('zkpassport_last_verified');
                const storedTimestamp = localStorage.getItem('zkpassport_result_timestamp');
                
                console.log('zkpassport_last_result:', storedResult ? storedResult.substring(0, 200) + '...' : 'null');
                console.log('zkpassport_last_verified:', storedVerified);
                console.log('zkpassport_result_timestamp:', storedTimestamp);
                
                checkURLForResult();
            });
        } else {
            console.error('Check button element not found!');
        }

        // Generate QR code with the verification URL
        console.log('Generating QR code for URL:', url);
        console.log('QRCode library available:', typeof QRCode);
        console.log('Canvas element:', qrCodeCanvas);
        
        if (!url) {
            throw new Error('Verification URL is missing');
        }
        
        try {
            qrLoading.style.display = 'none';
            console.log('Calling QRCode.toCanvas...');
            await QRCode.toCanvas(qrCodeCanvas, url, {
                width: 300,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            });
            console.log('QR code generated successfully');
            statusDiv.textContent = 'Scan the QR code with your ZKPassport app';
            statusDiv.className = 'status-message info';
        } catch (error) {
            console.error('QR code generation error:', error);
            console.error('Error details:', error.stack);
            qrLoading.textContent = 'Error: ' + error.message;
            qrLoading.style.display = 'block';
            statusDiv.innerHTML = `Error generating QR code: ${error.message}<br><small>URL: ${url}</small>`;
            statusDiv.className = 'status-message error';
        }

    } catch (error) {
        console.error('ZKPassport error:', error);
        console.error('Error stack:', error.stack);
        qrLoading.textContent = 'Error: ' + (error.message || 'Failed to initialize ZKPassport');
        qrLoading.style.display = 'block';
        statusDiv.textContent = 'Error: ' + (error.message || 'Failed to initialize ZKPassport');
        statusDiv.className = 'status-message error';
    }
}

// Function to process verification result
function processVerificationResult(verified, result) {
    console.log('processVerificationResult called with:', { verified, result });
    const statusDiv = document.getElementById('status');
    
    if (verified) {
        try {
            console.log('Full result object:', JSON.stringify(result, null, 2));
            
            // Try multiple possible result structures
            let countryCode = null;
            
            // Structure 1: result.nationality.disclose.result
            if (result?.nationality?.disclose?.result) {
                countryCode = result.nationality.disclose.result;
                console.log('Found country code in result.nationality.disclose.result:', countryCode);
            }
            // Structure 2: result.nationality
            else if (result?.nationality) {
                if (typeof result.nationality === 'string') {
                    countryCode = result.nationality;
                    console.log('Found country code in result.nationality (string):', countryCode);
                } else if (result.nationality.result) {
                    countryCode = result.nationality.result;
                    console.log('Found country code in result.nationality.result:', countryCode);
                } else if (result.nationality.disclose) {
                    countryCode = result.nationality.disclose;
                    console.log('Found country code in result.nationality.disclose:', countryCode);
                }
            }
            // Structure 3: result.country
            else if (result?.country) {
                countryCode = result.country;
                console.log('Found country code in result.country:', countryCode);
            }
            // Structure 4: result.issuing_country (from passport)
            else if (result?.issuing_country) {
                countryCode = result.issuing_country;
                console.log('Found country code in result.issuing_country:', countryCode);
            }
            // Structure 5: Check if result itself is the country code
            else if (typeof result === 'string' && result.length === 2) {
                countryCode = result;
                console.log('Result itself appears to be country code:', countryCode);
            }
            
            if (countryCode) {
                // Convert to uppercase for consistency
                const code = countryCode.toUpperCase();
                console.log('Adding country with code:', code);
                addCountry(code);
                const countryName = countryNames[code] || code;
                if (statusDiv) {
                    statusDiv.textContent = `Verified! Country: ${countryName}`;
                    statusDiv.className = 'status-message success';
                }
                console.log('Country added successfully:', countryName);
                updateStats(); // Make sure stats are updated
            } else {
                console.error('Country code not found in result. Full result:', result);
                console.error('Result keys:', result ? Object.keys(result) : 'result is null/undefined');
                if (statusDiv) {
                    statusDiv.textContent = 'Verification successful but country code not found. Check console for details.';
                    statusDiv.className = 'status-message error';
                }
            }
        } catch (parseError) {
            console.error('Error parsing result:', parseError, result);
            console.error('Error stack:', parseError.stack);
            if (statusDiv) {
                statusDiv.textContent = 'Error processing verification result. Check console.';
                statusDiv.className = 'status-message error';
            }
        }
    } else {
        console.log('Verification was not successful');
        if (statusDiv) {
            statusDiv.textContent = 'Verification failed. Please try again.';
            statusDiv.className = 'status-message error';
        }
    }
}

// Function to try to get result from ZKPassport SDK
async function tryGetResultFromSDK() {
    if (!window.zkPassportInstance || !window.currentQueryBuilder) {
        console.log('No ZKPassport instance or query builder available');
        return null;
    }
    
    try {
        console.log('Attempting to re-query ZKPassport for result...');
        // Try to create a new request with the same parameters to see if we can get the result
        // This might not work, but it's worth trying
        const newQueryBuilder = await window.zkPassportInstance.request({
            name: "Global Citizen Map",
            logo: window.location.origin + "/logo.png",
            purpose: "Verify your country of residence",
            scope: "residency-verification",
        });
        
        const { onResult: newOnResult } = newQueryBuilder
            .disclose("nationality")
            .done();
        
        // Set up a new result handler
        return new Promise((resolve) => {
            newOnResult(({ verified, result }) => {
                console.log('Got result from new query:', { verified, result });
                resolve({ verified, result });
            });
            // Timeout after 1 second if no result
            setTimeout(() => resolve(null), 1000);
        });
    } catch (e) {
        console.error('Error trying to get result from SDK:', e);
        return null;
    }
}

// Check for verification result in URL parameters (when returning from ZKPassport)
async function checkURLForResult() {
    console.log('=== Checking for verification result ===');
    console.log('Full URL:', window.location.href);
    console.log('URL search:', window.location.search);
    console.log('URL hash:', window.location.hash);
    console.log('All URL params:', Array.from(new URLSearchParams(window.location.search).entries()));
    console.log('All hash params:', window.location.hash ? Array.from(new URLSearchParams(window.location.hash.substring(1)).entries()) : 'no hash');
    
    // Check ALL localStorage keys (not just zkpassport ones)
    console.log('All localStorage keys:', Object.keys(localStorage));
    console.log('All sessionStorage keys:', Object.keys(sessionStorage));
    
    // Check if ZKPassport stored anything in localStorage/sessionStorage
    for (let key of Object.keys(localStorage)) {
        if (key.toLowerCase().includes('zk') || key.toLowerCase().includes('passport') || key.toLowerCase().includes('verify')) {
            console.log(`Found potential ZKPassport key in localStorage: ${key} = ${localStorage.getItem(key).substring(0, 200)}`);
        }
    }
    
    for (let key of Object.keys(sessionStorage)) {
        if (key.toLowerCase().includes('zk') || key.toLowerCase().includes('passport') || key.toLowerCase().includes('verify')) {
            console.log(`Found potential ZKPassport key in sessionStorage: ${key} = ${sessionStorage.getItem(key).substring(0, 200)}`);
        }
    }
    
    // Try to get result from SDK
    const sdkResult = await tryGetResultFromSDK();
    if (sdkResult && sdkResult.verified) {
        console.log('Got result from SDK!');
        processVerificationResult(sdkResult.verified, sdkResult.result);
        return;
    }
    
    // Check if ZKPassport SDK has any internal state
    if (window.zkPassportInstance) {
        console.log('ZKPassport instance available:', window.zkPassportInstance);
        // Try to access any result storage in the SDK
        try {
            console.log('ZKPassport instance properties:', Object.keys(window.zkPassportInstance));
        } catch (e) {
            console.log('Could not inspect ZKPassport instance:', e);
        }
    }
    
    const urlParams = new URLSearchParams(window.location.search);
    const hash = window.location.hash;
    
    // Check localStorage for stored result (check if it's recent - within last 5 minutes)
    const storedResult = localStorage.getItem('zkpassport_last_result');
    const storedVerified = localStorage.getItem('zkpassport_last_verified');
    const storedTimestamp = localStorage.getItem('zkpassport_result_timestamp');
    
    if (storedResult && storedVerified) {
        const timestamp = storedTimestamp ? parseInt(storedTimestamp) : 0;
        const age = Date.now() - timestamp;
        const fiveMinutes = 5 * 60 * 1000;
        
        console.log('Found stored result in localStorage:', { 
            storedVerified, 
            storedResult: storedResult.substring(0, 100) + '...',
            age: age + 'ms',
            isRecent: age < fiveMinutes
        });
        
        if (age < fiveMinutes) {
            try {
                const result = JSON.parse(storedResult);
                const verified = storedVerified === 'true' || storedVerified === '1';
                console.log('Processing stored result...');
                processVerificationResult(verified, result);
                // Don't clear - keep it in case user wants to check again
                return;
            } catch (e) {
                console.error('Error parsing stored result:', e);
            }
        } else {
            console.log('Stored result is too old, ignoring');
        }
    }
    
    // Check URL parameters
    const verified = urlParams.get('verified');
    const resultParam = urlParams.get('result');
    
    // Check hash for result (some OAuth flows use hash)
    let hashResult = null;
    if (hash) {
        const hashParams = new URLSearchParams(hash.substring(1));
        const hashVerified = hashParams.get('verified');
        const hashResultParam = hashParams.get('result');
        
        if (hashVerified !== null || hashResultParam) {
            console.log('Found result in hash:', { hashVerified, hashResultParam });
            if (hashResultParam) {
                try {
                    hashResult = JSON.parse(decodeURIComponent(hashResultParam));
                } catch (e) {
                    console.error('Error parsing result from hash:', e);
                }
            }
            const isHashVerified = hashVerified === 'true' || hashVerified === '1';
            processVerificationResult(isHashVerified, hashResult);
            
            // Clean up hash
            window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
            return;
        }
    }
    
    if (verified !== null || resultParam) {
        console.log('Found verification result in URL params:', { verified, resultParam });
        
        // Try to parse the result if it's a JSON string
        let result = null;
        if (resultParam) {
            try {
                result = JSON.parse(decodeURIComponent(resultParam));
            } catch (e) {
                console.error('Error parsing result from URL:', e);
                // Try as plain string
                result = resultParam;
            }
        }
        
        const isVerified = verified === 'true' || verified === '1';
        processVerificationResult(isVerified, result);
        
        // Clean up URL parameters
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
    } else {
        console.log('No verification result found in URL or localStorage');
    }
}

// Listen for postMessage events (ZKPassport might use this)
window.addEventListener('message', (event) => {
    console.log('=== Received postMessage event ===');
    console.log('Origin:', event.origin);
    console.log('Data:', event.data);
    console.log('Event type:', event.data?.type);
    
    // Check if this is a ZKPassport result
    if (event.data && (event.data.verified !== undefined || event.data.result)) {
        console.log('This looks like a ZKPassport result!');
        processVerificationResult(event.data.verified, event.data.result);
    }
});

// Listen for storage events (in case result is stored in another tab/window)
window.addEventListener('storage', (event) => {
    console.log('=== Storage event detected ===');
    console.log('Key:', event.key);
    console.log('New value:', event.newValue);
    
    if (event.key && event.key.startsWith('zkpassport')) {
        console.log('ZKPassport storage changed, checking for results...');
        checkURLForResult();
    }
});


// Create test function immediately (runs as soon as script loads)
(function createTestFunction() {
    if (typeof window !== 'undefined') {
        window.testZKPassportResult = function(testResult) {
            console.log('=== TEST: Manually triggering result handler ===');
            if (window.zkPassportResultHandler) {
                window.zkPassportResultHandler({
                    verified: true,
                    result: testResult || {
                        nationality: {
                            disclose: {
                                result: 'US' // Test with US
                            }
                        }
                    }
                });
            } else {
                console.error('Result handler not available yet. Trying direct processing...');
                if (typeof processVerificationResult === 'function') {
                    processVerificationResult(true, testResult || {
                        nationality: {
                            disclose: {
                                result: 'US'
                            }
                        }
                    });
                } else {
                    console.error('processVerificationResult function not available');
                }
            }
        };
        console.log('✓✓✓ TEST FUNCTION CREATED! Type: window.testZKPassportResult() ✓✓✓');
    }
})();

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log('=== Page loaded, initializing... ===');
    
    initMap();
    checkURLForResult(); // Check for result first
    initZKPassport();
    updateStats();
    
    // Also set up button handler here as backup
    setTimeout(() => {
        const checkButton = document.getElementById('checkResultButton');
        if (checkButton) {
            console.log('Setting up backup button handler');
            checkButton.onclick = () => {
                console.log('=== BACKUP BUTTON HANDLER CLICKED ===');
                checkURLForResult();
            };
        }
    }, 1000);
    
    // Listen for focus events (user might switch back from mobile app)
    let lastCheckTime = 0;
    window.addEventListener('focus', () => {
        const now = Date.now();
        // Only check if it's been more than 2 seconds since last check
        if (now - lastCheckTime > 2000) {
            console.log('=== Window focused, checking for results ===');
            lastCheckTime = now;
            checkURLForResult();
        }
    });
    
    // Also check when page becomes visible
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            console.log('=== Page became visible, checking for results ===');
            checkURLForResult();
        }
    });
    
    // Periodically check for results (in case they come in after page load)
    setInterval(() => {
        const storedResult = localStorage.getItem('zkpassport_last_result');
        const storedVerified = localStorage.getItem('zkpassport_last_verified');
        const storedTimestamp = localStorage.getItem('zkpassport_result_timestamp');
        
        // Only log periodic checks if there's actually something to check
        if (storedResult || storedVerified) {
            console.log('Periodic check - localStorage:', {
                hasResult: !!storedResult,
                hasVerified: !!storedVerified,
                timestamp: storedTimestamp
            });
        }
        
        if (storedResult && storedVerified && storedTimestamp) {
            const timestamp = parseInt(storedTimestamp);
            const age = Date.now() - timestamp;
            // If result is less than 5 minutes old, check it
            if (age < 300000 && age > 0) {
                console.log('Auto-checking for recent verification result (age: ' + age + 'ms)...');
                checkURLForResult();
            }
        }
        
        // Also check URL on every interval in case it was updated
        const urlParams = new URLSearchParams(window.location.search);
        const hash = window.location.hash;
        if (urlParams.toString() || hash) {
            console.log('URL has params/hash, checking...');
            checkURLForResult();
        }
    }, 2000); // Check every 2 seconds
    
    // Also check when page becomes visible (user might have switched tabs)
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            console.log('Page became visible, checking for results...');
            checkURLForResult();
        }
    });
    
    // Check when window gains focus
    window.addEventListener('focus', () => {
        console.log('Window gained focus, checking for results...');
        checkURLForResult();
    });
});

