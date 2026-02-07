// ============================================
// OPEN FOOD FACTS API INTEGRATION
// ============================================
const API_BASE_URL = 'https://world.openfoodfacts.org/api/v0'; // edited v0
const USER_AGENT = 'FoodScanPro/1.0 (Nutrition Analysis App)';

/**
 * Fetch product data from Open Food Facts API
 * @param {string} barcode - Product barcode
 * @returns {Promise<Object>} Product data
 */
async function fetchProductFromAPI(barcode) {
    try {
        const response = await fetch(`${API_BASE_URL}/product/${barcode}`, {
            headers: {
                'User-Agent': USER_AGENT
            }
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json(); // edited json
        
        if (data.status === 0 || !data.product) {
            throw new Error('Product not found in database');
        }

        return parseProductData(data.product, barcode);
    } catch (error) {
        console.error('API fetch error:', error);
        throw error;
    }
}

/**
 * Parse Open Food Facts API response to our app format
 */
function parseProductData(apiProduct, barcode) {
    // Get nutriments per 100g
    const nutriments = apiProduct.nutriments || {};
    
    // Extract allergens
    const allergens = [];
    const allergenTags = apiProduct.allergens_tags || [];
    if (allergenTags.some(tag => tag.includes('nuts') || tag.includes('peanuts'))) allergens.push('nuts');
    if (allergenTags.some(tag => tag.includes('milk') || tag.includes('dairy'))) allergens.push('dairy');
    if (allergenTags.some(tag => tag.includes('gluten'))) allergens.push('gluten');
    if (allergenTags.some(tag => tag.includes('soy'))) allergens.push('soy');
    if (allergenTags.some(tag => tag.includes('eggs'))) allergens.push('eggs');

    // Get product image
    let productImage = apiProduct.image_url || apiProduct.image_front_url;
    if (!productImage && apiProduct.images && apiProduct.images.front) {
        productImage = apiProduct.images.front.display?.en || apiProduct.images.front.small?.en;
    }

    return {
        name: apiProduct.product_name || apiProduct.product_name_en || 'Unknown Product',
        brand: apiProduct.brands || 'Unknown Brand',
        barcode: barcode,
        image: productImage || `https://via.placeholder.com/400/6366f1/ffffff?text=No+Image`,
        nutrition: {
            calories: nutriments['energy-kcal_100g'] || nutriments['energy-kcal'] || 0,
            sugar: nutriments.sugars_100g || nutriments.sugars || 0,
            fat: nutriments.fat_100g || nutriments.fat || 0,
            salt: nutriments.salt_100g || nutriments.salt || 0,
            protein: nutriments.proteins_100g || nutriments.proteins || 0,
            fiber: nutriments.fiber_100g || nutriments.fiber || 0
        },
        allergens: allergens,
        ingredients: apiProduct.ingredients_text || apiProduct.ingredients_text_en || 'Ingredients not available',
        categories: apiProduct.categories || '',
        nutriscore: apiProduct.nutriscore_grade || null,
        nova: apiProduct.nova_group || null
    };
}

/**
 * Fetch alternative healthier products from the same category
 */
async function fetchAlternativeProducts(category, currentNutriscore) {
    try {
        if (!category) return [];
        
        // Search for products in same category with better nutriscore
        const categorySearch = category.split(',')[0].trim(); // Take first category
        const response = await fetch(
            `${API_BASE_URL}/search?categories_tags=${encodeURIComponent(categorySearch)}&nutriscore_grade=a,b&page_size=10&fields=product_name,brands,nutriscore_grade,image_url,nutriments`,
            {
                headers: {
                    'User-Agent': USER_AGENT
                }
            }
        );

        if (!response.ok) {
            return [];
        }

        const data = await response.json();
        const products = data.products || [];

        // Filter and format alternatives
        return products
            .filter(p => p.product_name && p.nutriscore_grade)
            .slice(0, 3)
            .map(p => {
                const nutriments = p.nutriments || {};
                const healthScore = calculateHealthScore({
                    calories: nutriments['energy-kcal_100g'] || 0,
                    sugar: nutriments.sugars_100g || 0,
                    fat: nutriments.fat_100g || 0,
                    salt: nutriments.salt_100g || 0,
                    protein: nutriments.proteins_100g || 0,
                    fiber: nutriments.fiber_100g || 0
                }).score;

                return {
                    name: p.product_name,
                    brand: p.brands || '',
                    reason: `Nutriscore: ${p.nutriscore_grade?.toUpperCase() || 'N/A'}`,
                    score: healthScore,
                    image: p.image_url || 'https://via.placeholder.com/60/10b981/ffffff?text=ALT'
                };
            });
    } catch (error) {
        console.error('Error fetching alternatives:', error);
        return [];
    }
}

// ============================================
// STATE MANAGEMENT
// ============================================
const state = {
    totalScans: 0,
    healthyChoices: 0,
    streakDays: 0,
    currentProduct: null,
    scanHistory: [],
    settings: {
        voiceEnabled: true,
        dietaryPreferences: [],
        allergens: [],
        calorieGoal: 2000
    },
    dailyIntake: {
        calories: 0,
        sugar: 0,
        fat: 0,
        salt: 0
    },
    darkMode: false
};

// ============================================
// DOM ELEMENTS
// ============================================
// Theme
const themeToggle = document.getElementById('themeToggle');

// Stats
const totalScansEl = document.getElementById('totalScans');
const healthyChoicesEl = document.getElementById('healthyChoices');
const streakDaysEl = document.getElementById('streakDays');
const historyBadge = document.getElementById('historyBadge');

// Scanner Modes
const modeBtns = document.querySelectorAll('.mode-btn');
const scannerModes = document.querySelectorAll('.scanner-mode');

// Camera Scanner
const startCameraBtn = document.getElementById('startCameraBtn');
const captureBtn = document.getElementById('captureBtn');
const stopCameraBtn = document.getElementById('stopCameraBtn');
const cameraVideo = document.getElementById('cameraVideo');
const cameraCanvas = document.getElementById('cameraCanvas');

// Manual Input
const barcodeInput = document.getElementById('barcodeInput');
const clearInputBtn = document.getElementById('clearInputBtn');
const scanBtn = document.getElementById('scanBtn');

// Voice Input
const voiceBtn = document.getElementById('voiceBtn');
const voiceText = document.getElementById('voiceText');

// Demo Products
const demoCards = document.querySelectorAll('.demo-card');

// Loading
const loadingOverlay = document.getElementById('loadingOverlay');
const loadingSteps = document.querySelectorAll('.loading-step');

// Results
const resultsContainer = document.getElementById('resultsContainer');
const productImage = document.getElementById('productImage');
const productName = document.getElementById('productName');
const productBrand = document.getElementById('productBrand');
const productBarcode = document.getElementById('productBarcode');
const demoBadge = document.getElementById('demoBadge');

// Score
const scoreCircle = document.getElementById('scoreCircle');
const scoreNumber = document.getElementById('scoreNumber');
const scoreLabel = document.getElementById('scoreLabel');
const scoreEmoji = document.getElementById('scoreEmoji');
const scoreGrade = document.querySelector('.grade-value');
const percentileValue = document.getElementById('percentileValue');
const scoreRecommendation = document.getElementById('scoreRecommendation');
const voiceAnalysisBtn = document.getElementById('voiceAnalysisBtn');
const shareScoreBtn = document.getElementById('shareScoreBtn');

// AI Insights
const aiInsights = document.getElementById('aiInsights');
const insightsList = document.getElementById('insightsList');

// Warnings
const warningsCard = document.getElementById('warningsCard');
const warningCount = document.getElementById('warningCount');
const warningsList = document.getElementById('warningsList');

// Allergy
const allergyCard = document.getElementById('allergyCard');
const allergyContent = document.getElementById('allergyContent');

// Nutrition
const nutritionGrid = document.getElementById('nutritionGrid');
const servingBtns = document.querySelectorAll('.serving-btn');
const addToTrackerBtn = document.getElementById('addToTrackerBtn');
const dailyCalories = document.getElementById('dailyCalories');
const dailyCaloriesText = document.getElementById('dailyCaloriesText');

// Alternatives
const alternativesCard = document.getElementById('alternativesCard');
const alternativesList = document.getElementById('alternativesList');

// Action Buttons
const scanAgainBtn = document.getElementById('scanAgainBtn');
const exportPDFBtn = document.getElementById('exportPDFBtn');
const saveBtn = document.getElementById('saveBtn');
const addToCompareBtn = document.getElementById('addToCompareBtn');

// Modals
const historyBtn = document.getElementById('historyBtn');
const historyModal = document.getElementById('historyModal');
const closeHistoryBtn = document.getElementById('closeHistoryBtn');
const historyList = document.getElementById('historyList');
const filterBtns = document.querySelectorAll('.filter-btn');

const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const voiceEnabledToggle = document.getElementById('voiceEnabled');
const calorieGoalInput = document.getElementById('calorieGoal');

// Toast & Achievement
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toastMessage');
const achievementPopup = document.getElementById('achievementPopup');
const achievementTitle = document.getElementById('achievementTitle');
const achievementDesc = document.getElementById('achievementDesc');

// ============================================
// INITIALIZATION
// ============================================
function init() {
    loadState();
    setupEventListeners();
    updateStats();
    
    // Apply dark mode if enabled
    if (state.darkMode) {
        document.body.classList.add('dark-mode');
        themeToggle.querySelector('i').classList.replace('fa-moon', 'fa-sun');
    }
}

// ============================================
// EVENT LISTENERS
// ============================================
function setupEventListeners() {
    // Theme toggle
    themeToggle.addEventListener('click', toggleDarkMode);
    
    // Scanner mode switching
    modeBtns.forEach(btn => {
        btn.addEventListener('click', () => switchScannerMode(btn.dataset.mode));
    });
    
    // Manual input
    scanBtn.addEventListener('click', handleManualScan);
    barcodeInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleManualScan();
    });
    clearInputBtn.addEventListener('click', () => {
        barcodeInput.value = '';
        barcodeInput.focus();
    });
    
    // Camera controls
    startCameraBtn.addEventListener('click', startCamera);
    stopCameraBtn.addEventListener('click', stopCamera);
    captureBtn.addEventListener('click', captureImage);
    
    // Voice input
    voiceBtn.addEventListener('click', handleVoiceInput);
    
    // Demo products
    demoCards.forEach(card => {
        card.addEventListener('click', () => scanProduct(card.dataset.barcode));
    });
    
    // Results actions
    scanAgainBtn.addEventListener('click', resetScanner);
    exportPDFBtn.addEventListener('click', exportPDF);
    saveBtn.addEventListener('click', saveProduct);
    if (addToCompareBtn) addToCompareBtn.addEventListener('click', addToComparison);
    if (voiceAnalysisBtn) voiceAnalysisBtn.addEventListener('click', speakAnalysis);
    if (shareScoreBtn) shareScoreBtn.addEventListener('click', shareResults);
    
    // Serving size
    servingBtns.forEach(btn => {
        btn.addEventListener('click', (e) => updateServing(e.target));
    });
    
    // Daily tracker
    addToTrackerBtn.addEventListener('click', addToDaily);
    
    // Modals
    historyBtn.addEventListener('click', () => openModal(historyModal));
    closeHistoryBtn.addEventListener('click', () => closeModal(historyModal));
    settingsBtn.addEventListener('click', () => openModal(settingsModal));
    closeSettingsBtn.addEventListener('click', () => closeModal(settingsModal));
    
    // History filters
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => filterHistory(btn.dataset.filter));
    });
    
    // Settings
    voiceEnabledToggle.addEventListener('change', () => {
        state.settings.voiceEnabled = voiceEnabledToggle.checked;
        saveState();
    });
    
    calorieGoalInput.addEventListener('change', () => {
        state.settings.calorieGoal = parseInt(calorieGoalInput.value);
        saveState();
        updateDailyTracker();
    });
    
    // Dietary preferences
    document.querySelectorAll('input[name="diet"]').forEach(input => {
        input.addEventListener('change', updateDietaryPreferences);
    });
    
    // Allergen settings
    document.querySelectorAll('input[name="allergen"]').forEach(input => {
        input.addEventListener('change', updateAllergenSettings);
    });
    
    // Modal overlay close
    [historyModal, settingsModal].forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal(modal);
        });
    });
}

// ============================================
// DARK MODE
// ============================================
function toggleDarkMode() {
    state.darkMode = !state.darkMode;
    document.body.classList.toggle('dark-mode');
    
    const icon = themeToggle.querySelector('i');
    if (state.darkMode) {
        icon.classList.replace('fa-moon', 'fa-sun');
    } else {
        icon.classList.replace('fa-sun', 'fa-moon');
    }
    
    saveState();
}

// ============================================
// SCANNER MODE SWITCHING
// ============================================
function switchScannerMode(mode) {
    modeBtns.forEach(btn => btn.classList.remove('active'));
    scannerModes.forEach(sm => sm.classList.remove('active'));
    
    event.target.closest('.mode-btn').classList.add('active');
    document.getElementById(`${mode}Mode`).classList.add('active');
    
    // Stop camera if switching away from camera mode
    if (mode !== 'camera') {
        stopCamera();
    }
}

// ============================================
// BARCODE SCANNING - UPDATED TO USE API
// ============================================
async function scanProduct(barcode) {
    if (!barcode || barcode.length < 8) {
        showToast('⚠️ Please enter a valid barcode', 'warning');
        return;
    }
    
    showLoading();
    
    try {
        // Fetch product from Open Food Facts API
        const product = await fetchProductFromAPI(barcode);
        
        state.currentProduct = product;
        await displayProduct(product);
        
        // Add to history
        addToHistory(product);
        
        // Update stats
        updateScanStats();
        
        // Check achievements
        checkAchievements();
        
    } catch (error) {
        console.error('Scan error:', error);
        hideLoading();
        showToast(`❌ ${error.message}`, 'error');
    }
}

async function handleManualScan() {
    const barcode = barcodeInput.value.trim();
    await scanProduct(barcode);
}

// ============================================
// CAMERA SCANNER
// ============================================
let stream = null;
let quaggaStarted = false;

async function startCamera() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment' } 
        });
        
        cameraVideo.srcObject = stream;
        startCameraBtn.style.display = 'none';
        captureBtn.style.display = 'inline-flex';
        stopCameraBtn.style.display = 'inline-flex';
        
        // Initialize Quagga for barcode detection
        initQuagga();
        
        showToast('📸 Camera started!');
    } catch (error) {
        showToast('❌ Camera access denied', 'error');
        console.error('Camera error:', error);
    }
}

function initQuagga() {
    if (typeof Quagga === 'undefined') {
        console.warn('Quagga library not loaded');
        return;
    }

    Quagga.init({
        inputStream: {
            name: "Live",
            type: "LiveStream",
            target: cameraVideo,
            constraints: {
                facingMode: "environment"
            }
        },
        decoder: {
            readers: ["ean_reader", "ean_8_reader", "upc_reader", "upc_e_reader"]
        }
    }, function(err) {
        if (err) {
            console.error(err);
            return;
        }
        Quagga.start();
        quaggaStarted = true;
    });

    Quagga.onDetected(async function(result) {
        const code = result.codeResult.code;
        if (code && code.length >= 8) {
            stopCamera();
            await scanProduct(code);
        }
    });
}

function captureImage() {
    const context = cameraCanvas.getContext('2d');
    cameraCanvas.width = cameraVideo.videoWidth;
    cameraCanvas.height = cameraVideo.videoHeight;
    context.drawImage(cameraVideo, 0, 0);
    
    showToast('📸 Image captured! Processing...', 'info');
}

function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
    
    if (quaggaStarted && typeof Quagga !== 'undefined') {
        Quagga.stop();
        quaggaStarted = false;
    }
    
    cameraVideo.srcObject = null;
    startCameraBtn.style.display = 'inline-flex';
    captureBtn.style.display = 'none';
    stopCameraBtn.style.display = 'none';
}

// ============================================
// VOICE INPUT
// ============================================
function handleVoiceInput() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        showToast('⚠️ Voice input not supported', 'warning');
        return;
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.lang = 'en-US';
    recognition.continuous = false;
    
    voiceBtn.classList.add('active');
    document.querySelector('.voice-status').textContent = 'Listening...';
    
    recognition.onresult = async (event) => {
        const transcript = event.results[0][0].transcript;
        const barcode = transcript.replace(/\s/g, '');
        
        voiceText.textContent = `"${transcript}"`;
        
        if (/^\d{8,13}$/.test(barcode)) {
            await scanProduct(barcode);
        } else {
            showToast('⚠️ Please speak a valid barcode number', 'warning');
        }
    };
    
    recognition.onerror = () => {
        showToast('❌ Voice recognition failed', 'error');
        voiceBtn.classList.remove('active');
        document.querySelector('.voice-status').textContent = 'Tap to speak barcode number';
    };
    
    recognition.onend = () => {
        voiceBtn.classList.remove('active');
        document.querySelector('.voice-status').textContent = 'Tap to speak barcode number';
    };
    
    recognition.start();
}

// ============================================
// DISPLAY PRODUCT - UPDATED FOR API DATA
// ============================================
async function displayProduct(product) {
    // Set basic info
    productImage.src = product.image;
    productName.textContent = product.name;
    productBrand.textContent = product.brand;
    productBarcode.textContent = product.barcode;
    
    // Calculate health score
    const healthData = calculateHealthScore(product.nutrition);
    
    // Update score display
    updateScoreDisplay(healthData);
    
    // Generate AI insights
    generateAIInsights(product, healthData);
    
    // Check for warnings
    checkWarnings(product, healthData);
    
    // Check allergens
    checkAllergens(product);
    
    // Display nutrition facts
    displayNutrition(product.nutrition);
    
    // Load and display alternatives
    await loadAlternatives(product);
    
    // Show results
    hideLoading();
    resultsContainer.classList.add('active');
    resultsContainer.scrollIntoView({ behavior: 'smooth' });
}

// ============================================
// HEALTH SCORE CALCULATION
// ============================================
function calculateHealthScore(nutrition) {
    let score = 100;

    if (nutrition.calories > 200)
        score -= Math.min(30, (nutrition.calories - 200) / 5);

    if (nutrition.sugar > 5)
        score -= Math.min(25, (nutrition.sugar - 5) * 3);

    if (nutrition.fat > 10)
        score -= Math.min(20, (nutrition.fat - 10) * 2);

    if (nutrition.salt > 0.3)
        score -= Math.min(15, (nutrition.salt - 0.3) * 20);

    // ✅ Positive nutrients
    if (nutrition.protein >= 8)
        score += Math.min(10, nutrition.protein);

    if (nutrition.fiber >= 5)
        score += Math.min(10, nutrition.fiber * 2);

    score = Math.max(0, Math.min(100, Math.round(score)));

    let grade, label, emoji, recommendation, color;

    if (score >= 90) {
        grade = 'A+';
        label = 'Excellent';
        emoji = '🌟';
        recommendation = 'Highly nutritious and healthy choice!';
        color = '#10b981';
    } else if (score >= 80) {
        grade = 'A';
        label = 'Very Good';
        emoji = '😊';
        recommendation = 'Great option for daily consumption.';
        color = '#22c55e';
    } else if (score >= 70) {
        grade = 'B';
        label = 'Good';
        emoji = '👍';
        recommendation = 'Healthy, but consume mindfully.';
        color = '#84cc16';
    } else if (score >= 60) {
        grade = 'C';
        label = 'Average';
        emoji = '😐';
        recommendation = 'Okay occasionally, not ideal daily.';
        color = '#eab308';
    } else if (score >= 40) {
        grade = 'D';
        label = 'Unhealthy';
        emoji = '😕';
        recommendation = 'Limit intake and choose better options.';
        color = '#f97316';
    } else {
        grade = 'F';
        label = 'Very Unhealthy';
        emoji = '⚠️';
        recommendation = 'Avoid frequent consumption.';
        color = '#ef4444';
    }

    return { score, grade, label, emoji, recommendation, color };
}


function updateScoreDisplay(healthData) {
    scoreNumber.textContent = healthData.score;
    scoreLabel.textContent = healthData.label;
    scoreEmoji.textContent = healthData.emoji;
    scoreGrade.textContent = healthData.grade;
    scoreRecommendation.textContent = healthData.recommendation;
    
    // Update circle color
    scoreCircle.style.setProperty('--score-color', healthData.color);
    scoreCircle.style.setProperty('--score', healthData.score);
    
    // Percentile (random for demo, could be calculated from database)
    const percentile = Math.min(99, Math.max(1, 100 - healthData.score + Math.floor(Math.random() * 20)));
    percentileValue.textContent = percentile;
}

// ============================================
// AI INSIGHTS GENERATION
// ============================================
function generateAIInsights(product, healthData) {
    const insights = [];
    const n = product.nutrition;
    
    // Calorie insight
    if (n.calories < 100) {
        insights.push({
            icon: '💚',
            type: 'positive',
            text: 'Low calorie content makes this a light choice'
        });
    } else if (n.calories > 400) {
        insights.push({
            icon: '⚠️',
            type: 'warning',
            text: 'High calorie content - consider portion sizes'
        });
    }
    
    // Sugar insight
    if (n.sugar < 5) {
        insights.push({
            icon: '✨',
            type: 'positive',
            text: 'Low sugar content is heart-healthy'
        });
    } else if (n.sugar > 15) {
        insights.push({
            icon: '🍬',
            type: 'warning',
            text: `High sugar: ${n.sugar.toFixed(1)}g per 100g exceeds recommendations`
        });
    }
    
    // Fat insight
    if (n.fat < 3) {
        insights.push({
            icon: '🥗',
            type: 'positive',
            text: 'Low fat content supports weight management'
        });
    } else if (n.fat > 20) {
        insights.push({
            icon: '🧈',
            type: 'warning',
            text: 'High fat content - enjoy in moderation'
        });
    }
    
    // Salt insight
    if (n.salt < 0.3) {
        insights.push({
            icon: '👌',
            type: 'positive',
            text: 'Low sodium content is blood pressure friendly'
        });
    } else if (n.salt > 1.5) {
        insights.push({
            icon: '🧂',
            type: 'warning',
            text: `High sodium: ${n.salt.toFixed(2)}g may affect blood pressure`
        });
    }
    
    // Protein insight
    if (n.protein > 10) {
        insights.push({
            icon: '💪',
            type: 'positive',
            text: `Good protein source: ${n.protein.toFixed(1)}g supports muscle health`
        });
    }
    
    // Fiber insight
    if (n.fiber > 5) {
        insights.push({
            icon: '🌾',
            type: 'positive',
            text: `High fiber: ${n.fiber.toFixed(1)}g aids digestion`
        });
    }
    
    // Render insights
    insightsList.innerHTML = insights.map(insight => `
        <div class="insight-item ${insight.type}">
            <span class="insight-icon">${insight.icon}</span>
            <span class="insight-text">${insight.text}</span>
        </div>
    `).join('');
    
    aiInsights.style.display = insights.length > 0 ? 'block' : 'none';
}

// ============================================
// WARNINGS
// ============================================
function checkWarnings(product, healthData) {
    const warnings = [];
    const n = product.nutrition;
    
    if (healthData.score < 50) {
        warnings.push({ icon: '⚠️', text: 'Low nutritional value' });
    }
    
    if (n.sugar > 20) {
        warnings.push({ icon: '🍬', text: 'Very high sugar content' });
    }
    
    if (n.salt > 2) {
        warnings.push({ icon: '🧂', text: 'Excessive sodium levels' });
    }
    
    if (n.fat > 30) {
        warnings.push({ icon: '🧈', text: 'Very high fat content' });
    }
    
    // Check dietary preferences
    state.settings.dietaryPreferences.forEach(pref => {
        if (pref === 'diabetic' && n.sugar > 10) {
            warnings.push({ icon: '💉', text: 'Not suitable for diabetics' });
        }
        if (pref === 'keto' && n.sugar > 5) {
            warnings.push({ icon: '🥓', text: 'Not keto-friendly' });
        }
    });
    
    if (warnings.length > 0) {
        warningCount.textContent = warnings.length;
        warningsList.innerHTML = warnings.map(w => `
            <div class="warning-item">
                <span class="warning-icon">${w.icon}</span>
                <span>${w.text}</span>
            </div>
        `).join('');
        warningsCard.style.display = 'block';
    } else {
        warningsCard.style.display = 'none';
    }
}

// ============================================
// ALLERGEN CHECK
// ============================================
function checkAllergens(product) {
    const userAllergens = state.settings.allergens;
    const productAllergens = product.allergens || [];
    
    const matches = productAllergens.filter(a => userAllergens.includes(a));
    
    if (matches.length > 0) {
        allergyContent.innerHTML = `
            <div class="allergy-alert">
                <i class="fas fa-exclamation-triangle"></i>
                <div>
                    <strong>Allergen Alert!</strong>
                    <p>Contains: ${matches.map(a => a.charAt(0).toUpperCase() + a.slice(1)).join(', ')}</p>
                </div>
            </div>
        `;
        allergyCard.style.display = 'block';
    } else if (productAllergens.length > 0) {
        allergyContent.innerHTML = `
            <div class="allergy-info">
                <i class="fas fa-info-circle"></i>
                <div>
                    <strong>Allergen Information</strong>
                    <p>Contains: ${productAllergens.map(a => a.charAt(0).toUpperCase() + a.slice(1)).join(', ')}</p>
                </div>
            </div>
        `;
        allergyCard.style.display = 'block';
    } else {
        allergyCard.style.display = 'none';
    }
}

// ============================================
// NUTRITION DISPLAY
// ============================================
function displayNutrition(nutrition) {
    const items = [
        { label: 'Calories', value: nutrition.calories, unit: 'kcal', icon: '🔥', max: 500 },
        { label: 'Sugar', value: nutrition.sugar, unit: 'g', icon: '🍬', max: 25 },
        { label: 'Fat', value: nutrition.fat, unit: 'g', icon: '🧈', max: 30 },
        { label: 'Salt', value: nutrition.salt, unit: 'g', icon: '🧂', max: 2 },
        { label: 'Protein', value: nutrition.protein, unit: 'g', icon: '💪', max: 20, positive: true },
        { label: 'Fiber', value: nutrition.fiber, unit: 'g', icon: '🌾', max: 10, positive: true }
    ];
    
    nutritionGrid.innerHTML = items.map(item => {
        const percentage = Math.min(100, (item.value / item.max) * 100);
        const barClass = item.positive ? 'positive' : (percentage > 80 ? 'danger' : percentage > 50 ? 'warning' : 'good');
        
        return `
            <div class="nutrition-item">
                <div class="nutrition-header">
                    <span class="nutrition-icon">${item.icon}</span>
                    <span class="nutrition-label">${item.label}</span>
                    <span class="nutrition-value">${item.value.toFixed(1)}${item.unit}</span>
                </div>
                <div class="nutrition-bar">
                    <div class="nutrition-fill ${barClass}" style="width: ${percentage}%"></div>
                </div>
            </div>
        `;
    }).join('');
}

// ============================================
// SERVING SIZE
// ============================================
let currentServing = 1;

function updateServing(btn) {
    servingBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    const multiplier = parseFloat(btn.dataset.serving);
    currentServing = multiplier;
    
    if (!state.currentProduct) return;
    
    const nutrition = { ...state.currentProduct.nutrition };
    Object.keys(nutrition).forEach(key => {
        nutrition[key] = nutrition[key] * multiplier;
    });
    
    displayNutrition(nutrition);
}

// ============================================
// DAILY TRACKER
// ============================================
function addToDaily() {
    if (!state.currentProduct) return;
    
    const n = state.currentProduct.nutrition;
    const multiplier = currentServing;
    
    state.dailyIntake.calories += n.calories * multiplier;
    state.dailyIntake.sugar += n.sugar * multiplier;
    state.dailyIntake.fat += n.fat * multiplier;
    state.dailyIntake.salt += n.salt * multiplier;
    
    updateDailyTracker();
    saveState();
    
    showToast('✅ Added to daily tracker!');
}

function updateDailyTracker() {
    const goal = state.settings.calorieGoal;
    const current = state.dailyIntake.calories;
    const percentage = Math.min(100, (current / goal) * 100);
    
    dailyCalories.style.width = `${percentage}%`;
    dailyCaloriesText.textContent = `${Math.round(current)}/${goal} kcal`;
    
    if (percentage > 90) {
        dailyCalories.style.background = 'var(--danger)';
    } else if (percentage > 70) {
        dailyCalories.style.background = 'var(--warning)';
    } else {
        dailyCalories.style.background = 'var(--success)';
    }
}

// ============================================
// ALTERNATIVES - UPDATED TO USE API
// ============================================
async function loadAlternatives(product) {
    try {
        const alternatives = await fetchAlternativeProducts(
            product.categories,
            product.nutriscore
        );
        
        if (alternatives.length > 0) {
            alternativesList.innerHTML = alternatives.map(alt => `
                <div class="alternative-item">
                    <img src="${alt.image}" alt="${alt.name}" class="alternative-image">
                    <div class="alternative-info">
                        <div class="alternative-name">${alt.name}</div>
                        <div class="alternative-brand">${alt.brand}</div>
                        <div class="alternative-reason">${alt.reason}</div>
                    </div>
                    <div class="alternative-score ${alt.score >= 70 ? 'good' : 'warning'}">
                        ${alt.score}
                    </div>
                </div>
            `).join('');
            alternativesCard.style.display = 'block';
        } else {
            alternativesCard.style.display = 'none';
        }
    } catch (error) {
        console.error('Error loading alternatives:', error);
        alternativesCard.style.display = 'none';
    }
}

// ============================================
// LOADING ANIMATION
// ============================================
function showLoading() {
    loadingOverlay.classList.add('active');
    
    // Animate loading steps
    loadingSteps.forEach((step, index) => {
        setTimeout(() => {
            step.classList.add('active');
        }, index * 500);
    });
}

function hideLoading() {
    loadingOverlay.classList.remove('active');
    loadingSteps.forEach(step => step.classList.remove('active'));
}

// ============================================
// VOICE ANALYSIS
// ============================================
function speakAnalysis() {
    if (!state.settings.voiceEnabled || !state.currentProduct) {
        showToast('⚠️ Voice analysis is disabled', 'warning');
        return;
    }
    
    if (!('speechSynthesis' in window)) {
        showToast('⚠️ Text-to-speech not supported', 'warning');
        return;
    }
    
    const healthData = calculateHealthScore(state.currentProduct.nutrition);
    const text = `${state.currentProduct.name} by ${state.currentProduct.brand}. Health score: ${healthData.score} out of 100. Grade: ${healthData.grade}. ${healthData.recommendation}`;
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    
    speechSynthesis.speak(utterance);
    showToast('🔊 Playing voice analysis...');
}

// ============================================
// EXPORT PDF
// ============================================
function exportPDF() {
    if (!state.currentProduct) return;
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    const healthData = calculateHealthScore(state.currentProduct.nutrition);
    const p = state.currentProduct;
    
    // Title
    doc.setFontSize(20);
    doc.text('FoodScan Pro - Nutrition Report', 20, 20);
    
    // Product info
    doc.setFontSize(12);
    doc.text(`Product: ${p.name}`, 20, 40);
    doc.text(`Brand: ${p.brand}`, 20, 50);
    doc.text(`Barcode: ${p.barcode}`, 20, 60);
    
    // Health Score
    doc.setFontSize(16);
    doc.text(`Health Score: ${healthData.score}/100 (${healthData.grade})`, 20, 80);
    doc.setFontSize(12);
    doc.text(healthData.recommendation, 20, 90);
    
    // Nutrition Facts
    doc.text('Nutrition Facts (per 100g):', 20, 110);
    doc.text(`Calories: ${p.nutrition.calories.toFixed(1)} kcal`, 20, 120);
    doc.text(`Sugar: ${p.nutrition.sugar.toFixed(1)}g`, 20, 130);
    doc.text(`Fat: ${p.nutrition.fat.toFixed(1)}g`, 20, 140);
    doc.text(`Salt: ${p.nutrition.salt.toFixed(2)}g`, 20, 150);
    doc.text(`Protein: ${p.nutrition.protein.toFixed(1)}g`, 20, 160);
    doc.text(`Fiber: ${p.nutrition.fiber.toFixed(1)}g`, 20, 170);
    
    // Save
    doc.save(`foodscan-${p.barcode}.pdf`);
    showToast('📄 PDF exported successfully!');
}

// ============================================
// SAVE TO HISTORY
// ============================================
function saveProduct() {
    if (!state.currentProduct) return;
    
    const exists = state.scanHistory.some(item => 
        item.barcode === state.currentProduct.barcode
    );
    
    if (exists) {
        showToast('ℹ️ Product already in history', 'info');
    } else {
        addToHistory(state.currentProduct);
        showToast('💾 Product saved to history!');
    }
}

function addToHistory(product) {
    const healthData = calculateHealthScore(product.nutrition);
    
    const historyItem = {
        ...product,
        score: healthData.score,
        grade: healthData.grade,
        timestamp: new Date().toISOString()
    };
    
    state.scanHistory.unshift(historyItem);
    
    // Keep only last 50
    if (state.scanHistory.length > 50) {
        state.scanHistory = state.scanHistory.slice(0, 50);
    }
    
    historyBadge.textContent = state.scanHistory.length;
    saveState();
}

// ============================================
// HISTORY
// ============================================
function renderHistory(filter = 'all') {
    let items = state.scanHistory;
    
    if (filter === 'healthy') {
        items = items.filter(item => item.score >= 70);
    } else if (filter === 'unhealthy') {
        items = items.filter(item => item.score < 70);
    }
    
    if (items.length === 0) {
        historyList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <p>No ${filter !== 'all' ? filter : ''} scans found</p>
            </div>
        `;
        return;
    }
    
    historyList.innerHTML = '';
    
    items.forEach(item => {
        const date = new Date(item.timestamp);
        const scoreClass = item.score >= 70 ? 'good' : item.score >= 40 ? 'warning' : 'danger';
        
        const historyEl = document.createElement('div');
        historyEl.className = 'history-item';
        historyEl.innerHTML = `
            <img src="${item.image}" alt="${item.name}">
            <div class="history-details">
                <div class="history-name">${item.name}</div>
                <div class="history-meta">
                    ${item.brand} • ${date.toLocaleDateString()}
                </div>
            </div>
            <div class="history-score ${scoreClass}">
                ${item.score}
            </div>
        `;
        
        historyEl.addEventListener('click', () => {
            closeModal(historyModal);
            displayProduct(item);
        });
        
        historyList.appendChild(historyEl);
    });
}

function filterHistory(filter) {
    filterBtns.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    renderHistory(filter);
}

// ============================================
// COMPARISON (Future Feature)
// ============================================
function addToComparison() {
    showToast('🔄 Comparison feature coming soon!', 'info');
}

// ============================================
// SHARE RESULTS
// ============================================
function shareResults() {
    if (!state.currentProduct) return;

    const healthData = calculateHealthScore(state.currentProduct.nutrition);
    const text = `I just scanned ${state.currentProduct.name} with FoodScan Pro!\n\nHealth Score: ${healthData.score}/100\nGrade: ${healthData.grade}\n\n${healthData.recommendation}`;

    if (navigator.share) {
        navigator.share({
            title: 'FoodScan Pro Results',
            text: text,
        }).then(() => {
            showToast('✅ Shared successfully!');
        }).catch(() => {
            fallbackShare(text);
        });
    } else {
        fallbackShare(text);
    }
}

function fallbackShare(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('📋 Results copied to clipboard!');
    }).catch(() => {
        showToast('❌ Share failed', 'error');
    });
}

// ============================================
// SETTINGS
// ============================================
function updateDietaryPreferences() {
    const selected = Array.from(document.querySelectorAll('input[name="diet"]:checked'))
        .map(input => input.value);
    state.settings.dietaryPreferences = selected;
    saveState();
}

function updateAllergenSettings() {
    const selected = Array.from(document.querySelectorAll('input[name="allergen"]:checked'))
        .map(input => input.value);
    state.settings.allergens = selected;
    saveState();
}

// ============================================
// STATS & ACHIEVEMENTS
// ============================================
function updateScanStats() {
    state.totalScans++;
    
    if (state.currentProduct) {
        const healthData = calculateHealthScore(state.currentProduct.nutrition);
        if (healthData.score >= 70) {
            state.healthyChoices++;
        }
    }

    updateStats();
    saveState();
}

function updateStats() {
    totalScansEl.textContent = state.totalScans;
    healthyChoicesEl.textContent = state.healthyChoices;
    streakDaysEl.textContent = state.streakDays;
}

function checkAchievements() {
    // First Scan
    if (state.totalScans === 1) {
        showAchievement('First Scan! 🎉', 'You\'ve started your health journey');
    }
    
    // 10 Scans
    if (state.totalScans === 10) {
        showAchievement('Scanner Pro! 📊', 'You\'ve scanned 10 products');
    }
    
    // 5 Healthy Choices
    if (state.healthyChoices === 5) {
        showAchievement('Health Warrior! 💪', 'Made 5 healthy food choices');
    }
}

function showAchievement(title, description) {
    achievementTitle.textContent = title;
    achievementDesc.textContent = description;
    achievementPopup.classList.add('show');

    setTimeout(() => {
        achievementPopup.classList.remove('show');
    }, 4000);
}

// ============================================
// MODAL MANAGEMENT
// ============================================
function openModal(modal) {
    modal.classList.add('active');
    
    if (modal === historyModal) {
        renderHistory();
    }
}

function closeModal(modal) {
    modal.classList.remove('active');
}

// ============================================
// RESET SCANNER
// ============================================
function resetScanner() {
    resultsContainer.classList.remove('active');
    barcodeInput.value = '';
    voiceText.textContent = '';
    barcodeInput.focus();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================
// TOAST NOTIFICATIONS
// ============================================
function showToast(message, type = 'success') {
    toastMessage.textContent = message;
    toast.classList.remove('error', 'warning', 'info');
    
    if (type !== 'success') {
        toast.classList.add(type);
    }
    
    const icon = toast.querySelector('i');
    if (type === 'success') {
        icon.className = 'fas fa-check-circle';
    } else if (type === 'error') {
        icon.className = 'fas fa-times-circle';
    } else if (type === 'warning') {
        icon.className = 'fas fa-exclamation-circle';
    } else {
        icon.className = 'fas fa-info-circle';
    }
    
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ============================================
// STATE PERSISTENCE (LocalStorage)
// ============================================
function saveState() {
    try {
        localStorage.setItem('foodscan_state', JSON.stringify(state));
    } catch (error) {
        console.error('Failed to save state:', error);
    }
}

function loadState() {
    try {
        const saved = localStorage.getItem('foodscan_state');
        if (saved) {
            const parsed = JSON.parse(saved);
            Object.assign(state, parsed);
            
            // Update UI with loaded state
            voiceEnabledToggle.checked = state.settings.voiceEnabled;
            calorieGoalInput.value = state.settings.calorieGoal;
            
            // Restore dietary preferences
            state.settings.dietaryPreferences.forEach(pref => {
                const input = document.querySelector(`input[name="diet"][value="${pref}"]`);
                if (input) input.checked = true;
            });
            
            // Restore allergen settings
            state.settings.allergens.forEach(allergen => {
                const input = document.querySelector(`input[name="allergen"][value="${allergen}"]`);
                if (input) input.checked = true;
            });
            
            updateDailyTracker();
        }
    } catch (error) {
        console.error('Failed to load state:', error);
    }
}

// ============================================
// INITIALIZE APP
// ============================================
document.addEventListener('DOMContentLoaded', init);

// ============================================
// SERVICE WORKER (for offline support)
// ============================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('✅ Service Worker registered'))
            .catch(err => console.log('❌ Service Worker registration failed'));
    });
}