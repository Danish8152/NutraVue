// ============================================
// 🔌 POPULATION NUTRITION INTEGRATION
// ============================================
// Bridges population evaluation with existing food scanner app
// Works by listening to events and augmenting existing data
// Does NOT modify existing code - fails silently if hooks missing
// Version: 1.0

(function() {
    'use strict';

    // ============================================
    // CONFIGURATION
    // ============================================

    const CONFIG = {
        enabled: true,
        autoEvaluate: true,
        defaultTargetGroup: null, // null = disabled, "pregnant" or "child"
        eventListeners: [
            'nutrition:ready',
            'product:scanned',
            'product:loaded'
        ],
        globalFunctions: [
            'displayProduct',
            'fetchProductFromAPI',
            'scanProduct'
        ]
    };

    // ============================================
    // STATE MANAGEMENT
    // ============================================

    let currentPopulationMode = null; // "pregnant", "child", or null
    let lastEvaluationResults = {};

    // ============================================
    // INITIALIZATION
    // ============================================

    function initialize() {
        console.log('🔌 Initializing Population Nutrition Integration...');

        // Check if required modules are loaded
        if (!isModulesLoaded()) {
            console.warn('⚠️ Population nutrition modules not fully loaded. Integration disabled.');
            return;
        }

        // Set up event listeners
        setupEventListeners();

        // Wrap existing functions if they exist
        wrapExistingFunctions();

        // Load user preferences
        loadUserPreferences();

        // Expose API
        exposePublicAPI();

        console.log('✅ Population Nutrition Integration active');
    }

    // ============================================
    // MODULE AVAILABILITY CHECK
    // ============================================

    function isModulesLoaded() {
        const required = [
            'evaluateFoodForPopulation',
            'PREGNANT_LIMITS',
            'CHILD_LIMITS',
            'POPULATION_METADATA'
        ];

        return required.every(key => typeof window[key] !== 'undefined');
    }

    // ============================================
    // EVENT LISTENERS
    // ============================================

    function setupEventListeners() {
        // Listen for nutrition data ready events
        CONFIG.eventListeners.forEach(eventName => {
            window.addEventListener(eventName, handleNutritionEvent);
        });

        // Listen for settings changes (if settings modal exists)
        const settingsForm = document.getElementById('settingsForm');
        if (settingsForm) {
            settingsForm.addEventListener('change', handleSettingsChange);
        }

        console.log('📡 Event listeners registered');
    }

    /**
     * Handle nutrition data events
     */
    function handleNutritionEvent(event) {
        try {
            const nutritionData = event.detail;
            
            if (!nutritionData) {
                console.debug('No nutrition data in event');
                return;
            }

            // Auto-evaluate if mode is set
            if (CONFIG.autoEvaluate && currentPopulationMode) {
                evaluateAndStore(nutritionData, currentPopulationMode);
            }

        } catch (error) {
            console.debug('Event handling failed:', error.message);
        }
    }

    /**
     * Handle settings changes
     */
    function handleSettingsChange(event) {
        try {
            const target = event.target;
            
            // Check for population mode toggle
            if (target.name === 'populationMode' || target.id === 'populationMode') {
                const mode = target.value;
                setPopulationMode(mode === 'none' ? null : mode);
            }

            // Save preferences
            saveUserPreferences();

        } catch (error) {
            console.debug('Settings change handling failed:', error.message);
        }
    }

    // ============================================
    // FUNCTION WRAPPING
    // ============================================

    function wrapExistingFunctions() {
        // Wrap displayProduct if it exists
        if (typeof window.displayProduct === 'function') {
            const originalDisplayProduct = window.displayProduct;
            
            window.displayProduct = function(product) {
                // Call original function
                const result = originalDisplayProduct.apply(this, arguments);
                
                // Augment with population evaluation
                try {
                    if (CONFIG.autoEvaluate && currentPopulationMode && product) {
                        evaluateAndStore(product, currentPopulationMode);
                    }
                } catch (error) {
                    console.debug('Population evaluation in displayProduct failed:', error.message);
                }
                
                return result;
            };
            
            console.log('✅ Wrapped displayProduct function');
        }

        // Wrap scanProduct if it exists
        if (typeof window.scanProduct === 'function') {
            const originalScanProduct = window.scanProduct;
            
            window.scanProduct = async function(barcode) {
                // Call original function
                const result = await originalScanProduct.apply(this, arguments);
                
                // Augment with population evaluation
                try {
                    if (CONFIG.autoEvaluate && currentPopulationMode && result) {
                        evaluateAndStore(result, currentPopulationMode);
                    }
                } catch (error) {
                    console.debug('Population evaluation in scanProduct failed:', error.message);
                }
                
                return result;
            };
            
            console.log('✅ Wrapped scanProduct function');
        }
    }

    // ============================================
    // EVALUATION LOGIC
    // ============================================

    /**
     * Evaluate food and store results
     */
    function evaluateAndStore(productOrNutrition, targetGroup) {
        try {
            // Extract nutrition and product data
            const nutrition = productOrNutrition.nutrition || productOrNutrition;
            const productData = productOrNutrition.nutrition ? productOrNutrition : {};

            // Perform evaluation
            const evaluation = window.evaluateFoodForPopulation(
                nutrition,
                targetGroup,
                productData
            );

            // Store results
            lastEvaluationResults = {
                ...evaluation,
                productName: productData.name || 'Unknown Product',
                timestamp: new Date().toISOString()
            };

            // Make available globally
            window.populationFoodReport = lastEvaluationResults;

            // Dispatch event for UI to consume
            window.dispatchEvent(new CustomEvent('population:evaluated', {
                detail: lastEvaluationResults
            }));

            console.log(`✅ Evaluated for ${targetGroup}:`, evaluation.suitability);

            return evaluation;

        } catch (error) {
            console.error('Evaluation failed:', error);
            return null;
        }
    }

    /**
     * Set population evaluation mode
     */
    function setPopulationMode(mode) {
        if (mode && !['pregnant', 'child'].includes(mode)) {
            console.warn(`Invalid population mode: ${mode}`);
            return;
        }

        currentPopulationMode = mode;
        CONFIG.defaultTargetGroup = mode;

        console.log(`Population mode set to: ${mode || 'disabled'}`);

        // Dispatch event
        window.dispatchEvent(new CustomEvent('population:mode-changed', {
            detail: { mode }
        }));

        // Save preference
        saveUserPreferences();

        return mode;
    }

    /**
     * Get current evaluation results
     */
    function getCurrentEvaluation() {
        return lastEvaluationResults;
    }

    /**
     * Manually trigger evaluation
     */
    function evaluateCurrentProduct(targetGroup) {
        // Try to get current product from global state
        const currentProduct = window.state?.currentProduct || window.currentProduct;
        
        if (!currentProduct) {
            console.warn('No current product to evaluate');
            return null;
        }

        return evaluateAndStore(currentProduct, targetGroup || currentPopulationMode);
    }

    // ============================================
    // PREFERENCES PERSISTENCE
    // ============================================

    function loadUserPreferences() {
        try {
            const saved = localStorage.getItem('population_nutrition_prefs');
            if (saved) {
                const prefs = JSON.parse(saved);
                currentPopulationMode = prefs.mode || null;
                CONFIG.autoEvaluate = prefs.autoEvaluate !== false;
                
                console.log('Loaded preferences:', prefs);
            }
        } catch (error) {
            console.debug('Failed to load preferences:', error.message);
        }
    }

    function saveUserPreferences() {
        try {
            const prefs = {
                mode: currentPopulationMode,
                autoEvaluate: CONFIG.autoEvaluate,
                version: '1.0'
            };
            
            localStorage.setItem('population_nutrition_prefs', JSON.stringify(prefs));
        } catch (error) {
            console.debug('Failed to save preferences:', error.message);
        }
    }

    // ============================================
    // PUBLIC API
    // ============================================

    function exposePublicAPI() {
        window.populationNutrition = {
            // Core functions
            setMode: setPopulationMode,
            getMode: () => currentPopulationMode,
            evaluate: evaluateCurrentProduct,
            getLastEvaluation: getCurrentEvaluation,
            
            // Manual evaluation
            evaluateProduct: (product, targetGroup) => {
                return evaluateAndStore(product, targetGroup || currentPopulationMode);
            },
            
            // Configuration
            enable: () => { CONFIG.enabled = true; },
            disable: () => { CONFIG.enabled = false; },
            isEnabled: () => CONFIG.enabled,
            
            // Metadata access
            getMetadata: (group) => {
                const metadata = window.POPULATION_METADATA;
                return group ? metadata?.[group] : metadata;
            },
            
            // Utility
            getSupportedGroups: () => ['pregnant', 'child'],
            
            // Version
            version: '1.0'
        };

        console.log('✅ Public API exposed at window.populationNutrition');
    }

    // ============================================
    // AUTO-INITIALIZE
    // ============================================

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

})();

// ============================================
// USAGE EXAMPLES (for documentation)
// ============================================

/*

// Example 1: Enable pregnancy mode
populationNutrition.setMode('pregnant');

// Example 2: Enable child mode
populationNutrition.setMode('child');

// Example 3: Disable population evaluation
populationNutrition.setMode(null);

// Example 4: Manually evaluate current product
const result = populationNutrition.evaluate();
console.log(result);

// Example 5: Get last evaluation
const lastResult = populationNutrition.getLastEvaluation();
console.log(lastResult.suitability); // "Good Choice", "Moderate", or "Avoid"

// Example 6: Check if specific product is safe
const product = {
    nutrition: { sugar: 2, salt: 0.1, fat: 5, protein: 8 },
    ingredients: "whole grain wheat, water, salt"
};
const evaluation = populationNutrition.evaluateProduct(product, 'child');
console.log(evaluation.emoji, evaluation.suitability);

// Example 7: Listen for evaluation events
window.addEventListener('population:evaluated', (event) => {
    const result = event.detail;
    console.log(`Evaluated: ${result.suitability}`);
    console.log(`Warnings: ${result.warnings.join(', ')}`);
});

// Example 8: Get metadata for a population group
const metadata = populationNutrition.getMetadata('pregnant');
console.log(metadata.disclaimer);

*/