// ============================================
// 🚀 HEALTH SYSTEM ORCHESTRATOR
// ============================================
// Main integration file that connects all health modules
// Load this file AFTER all other modules

/**
 * Main Health System Class
 * Orchestrates all health-related features
 */
class HealthSystemOrchestrator {
    constructor() {
        this.version = '2.0';
        this.initialized = false;
        this.userProfile = this.loadUserProfile();
        
        console.log(`🚀 Health System Orchestrator v${this.version} initializing...`);
        this.init();
    }

    /**
     * Initialize the health system
     */
    init() {
        try {
            // Verify all required modules are loaded
            this.verifyModules();

            // Override original displayProduct function
            this.integrateWithExistingApp();

            // Set up event listeners
            this.setupEventListeners();

            // Load user preferences
            this.loadUserPreferences();

            this.initialized = true;
            console.log('✅ Health System fully initialized and integrated');
            
            // Show welcome message
            this.showWelcomeMessage();
        } catch (error) {
            console.error('❌ Health System initialization failed:', error);
        }
    }

    /**
     * Verify all required modules are loaded
     */
    verifyModules() {
        const requiredModules = [
            { name: 'calculateHealthScore', present: typeof calculateHealthScore === 'function' },
            { name: 'calculateAllDailyValues', present: typeof calculateAllDailyValues === 'function' },
            { name: 'generateDiabeticWarnings', present: typeof generateDiabeticWarnings === 'function' },
            { name: 'fetchProductWithHealthScore', present: typeof fetchProductWithHealthScore === 'function' },
            { name: 'healthUI', present: typeof healthUI !== 'undefined' }
        ];

        const missing = requiredModules.filter(m => !m.present).map(m => m.name);
        
        if (missing.length > 0) {
            console.warn('⚠️ Some modules not found:', missing.join(', '));
            console.warn('Some features may be limited');
        } else {
            console.log('✅ All health modules verified and loaded');
        }
    }

    /**
     * Integrate with existing app.js
     */
    integrateWithExistingApp() {
        // Hook into the existing scanBarcode function
        const originalScanBarcode = window.scanBarcode;
        
        if (typeof originalScanBarcode === 'function') {
            window.scanBarcode = async (barcode) => {
                try {
                    // Show loading
                    this.showLoading('Analyzing nutrition...');

                    // Fetch product with health analysis
                    const enrichedProduct = await this.fetchAndAnalyzeProduct(barcode);
                    
                    // Display using enhanced UI
                    this.displayEnhancedProduct(enrichedProduct);
                    
                    // Hide loading
                    this.hideLoading();
                    
                    // Update stats
                    this.updateHealthStats(enrichedProduct);

                } catch (error) {
                    console.error('Scan error:', error);
                    this.hideLoading();
                    
                    // Fallback to original function
                    if (originalScanBarcode) {
                        return originalScanBarcode.call(window, barcode);
                    }
                }
            };
            
            console.log('✅ Enhanced scanBarcode function integrated');
        }

        // Hook into displayProduct function
        const originalDisplayProduct = window.displayProduct;
        
        if (typeof originalDisplayProduct === 'function') {
            window.displayProduct = (product) => {
                // Call original first
                originalDisplayProduct.call(window, product);
                
                // Enhance with health analysis (with small delay for DOM)
                setTimeout(() => {
                    this.enhanceDisplayedProduct(product);
                }, 100);
            };
            
            console.log('✅ Enhanced displayProduct function integrated');
        }
    }

    /**
     * Fetch and analyze product with all health features
     */
    async fetchAndAnalyzeProduct(barcode) {
        const userOptions = {
            gender: this.userProfile.gender || autoDetectGender(state?.settings),
            isDiabetic: this.userProfile.isDiabetic || false,
            diabeticType: this.userProfile.diabeticType || 'type2',
            activityLevel: this.userProfile.activityLevel || 'moderate',
            profile: this.userProfile.profile || 'standard'
        };

        // Use enhanced API fetch
        if (typeof fetchProductWithHealthScore === 'function') {
            return await fetchProductWithHealthScore(barcode, userOptions);
        }

        // Fallback: fetch normally and enrich
        const product = await this.fetchProductFallback(barcode);
        return this.enrichProduct(product, userOptions);
    }

    /**
     * Fallback product fetch
     */
    async fetchProductFallback(barcode) {
        const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}`);
        const data = await response.json();
        
        if (data.status === 0 || !data.product) {
            throw new Error('Product not found');
        }

        return this.parseBasicProduct(data.product, barcode);
    }

    /**
     * Parse basic product data
     */
    parseBasicProduct(apiProduct, barcode) {
        const nutriments = apiProduct.nutriments || {};
        
        return {
            name: apiProduct.product_name || 'Unknown Product',
            brand: apiProduct.brands || 'Unknown Brand',
            barcode: barcode,
            image: apiProduct.image_url || 'https://via.placeholder.com/400',
            nutrition: {
                calories: nutriments['energy-kcal_100g'] || 0,
                sugar: nutriments.sugars_100g || 0,
                fat: nutriments.fat_100g || 0,
                salt: nutriments.salt_100g || 0,
                protein: nutriments.proteins_100g || 0,
                fiber: nutriments.fiber_100g || 0,
                carbs: nutriments.carbohydrates_100g || 0
            },
            allergens: [],
            ingredients: apiProduct.ingredients_text || 'Not available',
            categories: apiProduct.categories || '',
            nutriscore: apiProduct.nutriscore_grade || null
        };
    }

    /**
     * Enrich product with health analysis
     */
    enrichProduct(product, options) {
        const nutrition = product.nutrition;

        // Calculate health score
        const healthScore = calculateHealthScore(nutrition, options);

        // Calculate daily values
        const dailyValues = calculateAllDailyValues(nutrition, options);

        // Generate diabetic warnings
        const diabeticWarnings = generateDiabeticWarnings(nutrition, options);

        return {
            ...product,
            healthScore,
            dailyValues,
            diabeticWarnings
        };
    }

    /**
     * Display enhanced product
     */
    displayEnhancedProduct(product) {
        // Use UI integration module
        if (typeof healthUI !== 'undefined') {
            healthUI.displayHealthAnalysis(product, this.userProfile);
        }

        // Store current product
        if (typeof state !== 'undefined') {
            state.currentProduct = product;
        }

        // Scroll to results
        const resultsContainer = document.getElementById('resultsContainer');
        if (resultsContainer) {
            resultsContainer.classList.add('active');
            setTimeout(() => {
                resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 100);
        }

        // Announce for accessibility
        this.announceResults(product);
    }

    /**
     * Enhance already displayed product
     */
    enhanceDisplayedProduct(product) {
        if (!product || !product.nutrition) return;

        // Calculate health data if not present
        if (!product.healthScore) {
            const enriched = this.enrichProduct(product, this.userProfile);
            this.displayEnhancedProduct(enriched);
        } else {
            this.displayEnhancedProduct(product);
        }
    }

    /**
     * Update health statistics
     */
    updateHealthStats(product) {
        if (typeof state === 'undefined') return;

        const score = product.healthScore?.score || 0;
        
        // Update healthy choices count
        if (score >= 70) {
            state.healthyChoices = (state.healthyChoices || 0) + 1;
        }

        // Update total scans
        state.totalScans = (state.totalScans || 0) + 1;

        // Save state
        if (typeof saveState === 'function') {
            saveState();
        }

        // Update UI stats
        if (typeof updateStats === 'function') {
            updateStats();
        }
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Listen for settings changes
        window.addEventListener('healthSettingsChanged', (e) => {
            this.userProfile = { ...this.userProfile, ...e.detail };
            this.saveUserProfile();
        });

        // Listen for dietary preference changes
        if (typeof state !== 'undefined' && state.settings) {
            const originalUpdate = window.updateDietaryPreferences;
            
            if (typeof originalUpdate === 'function') {
                window.updateDietaryPreferences = () => {
                    originalUpdate();
                    this.updateUserProfileFromSettings();
                };
            }
        }
    }

    /**
     * Load user profile
     */
    loadUserProfile() {
        try {
            const saved = localStorage.getItem('health_user_profile');
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (error) {
            console.error('Error loading user profile:', error);
        }

        // Default profile
        return {
            gender: 'male',
            isDiabetic: false,
            diabeticType: 'type2',
            activityLevel: 'moderate',
            profile: 'standard'
        };
    }

    /**
     * Save user profile
     */
    saveUserProfile() {
        try {
            localStorage.setItem('health_user_profile', JSON.stringify(this.userProfile));
        } catch (error) {
            console.error('Error saving user profile:', error);
        }
    }

    /**
     * Load user preferences from app state
     */
    loadUserPreferences() {
        if (typeof state === 'undefined') return;

        const settings = state.settings || {};

        // Detect gender from calorie goal
        if (settings.calorieGoal) {
            this.userProfile.gender = settings.calorieGoal <= 2000 ? 'female' : 'male';
        }

        // Detect diabetic status
        if (settings.dietaryPreferences) {
            this.userProfile.isDiabetic = settings.dietaryPreferences.includes('diabetic');
        }

        // Detect activity level
        if (settings.dietaryPreferences) {
            if (settings.dietaryPreferences.includes('athlete')) {
                this.userProfile.activityLevel = 'active';
                this.userProfile.profile = 'athlete';
            }
        }

        this.saveUserProfile();
    }

    /**
     * Update user profile from settings changes
     */
    updateUserProfileFromSettings() {
        this.loadUserPreferences();
        
        // Re-analyze current product if any
        if (typeof state !== 'undefined' && state.currentProduct) {
            const enriched = this.enrichProduct(state.currentProduct, this.userProfile);
            this.displayEnhancedProduct(enriched);
        }
    }

    /**
     * Show loading indicator
     */
    showLoading(message = 'Loading...') {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'flex';
            
            const loadingText = loadingOverlay.querySelector('.loading-text');
            if (loadingText) {
                loadingText.textContent = message;
            }
        }
    }

    /**
     * Hide loading indicator
     */
    hideLoading() {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
    }

    /**
     * Announce results for accessibility
     */
    announceResults(product) {
        const score = product.healthScore?.score || 0;
        const grade = product.healthScore?.grade || '';
        
        const announcement = `Analysis complete. Health score: ${score} out of 100. Grade: ${grade}.`;
        
        // Create or update live region
        let liveRegion = document.getElementById('health-live-region');
        if (!liveRegion) {
            liveRegion = document.createElement('div');
            liveRegion.id = 'health-live-region';
            liveRegion.setAttribute('role', 'status');
            liveRegion.setAttribute('aria-live', 'polite');
            liveRegion.style.cssText = 'position: absolute; left: -10000px; width: 1px; height: 1px; overflow: hidden;';
            document.body.appendChild(liveRegion);
        }
        
        liveRegion.textContent = announcement;
    }

    /**
     * Show welcome message
     */
    showWelcomeMessage() {
        console.log(`
╔══════════════════════════════════════════════════╗
║  🌟 HEALTH SYSTEM v${this.version} READY           ║
╟──────────────────────────────────────────────────╢
║  ✅ Health Score Algorithm                       ║
║  ✅ Daily Value Calculator (Male/Female)         ║
║  ✅ Diabetic Warning System                      ║
║  ✅ Real API Integration                         ║
║  ✅ Enhanced UI Integration                      ║
╟──────────────────────────────────────────────────╢
║  Status: All systems operational                 ║
║  Profile: ${this.userProfile.gender.toUpperCase()} | ${this.userProfile.isDiabetic ? 'Diabetic' : 'Standard'}           ║
╚══════════════════════════════════════════════════╝
        `);

        // Show toast notification
        if (typeof showToast === 'function') {
            setTimeout(() => {
                showToast('🌟 Enhanced Health System Active', 'success');
            }, 1000);
        }
    }

    /**
     * Public API: Manually analyze a product
     */
    async analyzeProduct(barcode) {
        return await this.fetchAndAnalyzeProduct(barcode);
    }

    /**
     * Public API: Update user profile
     */
    updateProfile(updates) {
        this.userProfile = { ...this.userProfile, ...updates };
        this.saveUserProfile();
        
        // Dispatch event
        window.dispatchEvent(new CustomEvent('healthSettingsChanged', {
            detail: updates
        }));

        console.log('✅ User profile updated:', this.userProfile);
    }

    /**
     * Public API: Get current profile
     */
    getProfile() {
        return { ...this.userProfile };
    }

    /**
     * Public API: Calculate health score for nutrition data
     */
    calculateScore(nutrition) {
        return calculateHealthScore(nutrition, this.userProfile);
    }
}

// ============================================
// INITIALIZE SYSTEM
// ============================================

// Wait for DOM to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHealthSystem);
} else {
    initHealthSystem();
}

function initHealthSystem() {
    // Create global instance
    window.healthSystem = new HealthSystemOrchestrator();
    
    // Expose public API
    window.analyzeProduct = (barcode) => window.healthSystem.analyzeProduct(barcode);
    window.updateHealthProfile = (updates) => window.healthSystem.updateProfile(updates);
    window.getHealthProfile = () => window.healthSystem.getProfile();
}

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { HealthSystemOrchestrator };
}
