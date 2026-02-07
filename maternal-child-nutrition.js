// ============================================
// 🤰👶 MATERNAL & CHILD NUTRITION ENGINE
// ============================================
// Pregnancy and child (under 6) food safety analysis
// Version: 1.0
// Author: FoodScan Pro Team
// NOTE: This module extends existing functionality without modifying core files

/**
 * SAFETY REFERENCE LIMITS (per 100g)
 * Based on WHO, FDA, AAP, EFSA guidelines
 */
const SAFETY_LIMITS = {
    pregnancy: {
        // Critical nutrients to monitor
        vitaminA_retinol_max: 3000,    // mcg (IU equivalent ~10,000 IU max daily)
        caffeine_max: 0,                // mg per 100g (avoid caffeine-containing foods)
        sugar_max: 5,                   // g (WHO: limit added sugars)
        sodium_max: 0.3,                // g (equivalent to 0.75g salt)
        mercury_max: 0,                 // Should be zero for safety
        alcohol_max: 0,                 // Absolute zero tolerance
        
        // Beneficial nutrients (minimums)
        iron_min: 2,                    // mg (important for pregnancy)
        calcium_min: 100,               // mg (bone health)
        protein_min: 8,                 // g (fetal development)
        fiber_min: 5,                   // g (digestive health)
        folate_min: 50,                 // mcg (neural tube development)
        
        // Warning thresholds
        calories_caution: 250,          // kcal (avoid calorie-dense foods)
        fat_caution: 15,                // g
        saturatedFat_caution: 5         // g
    },
    
    baby_under_6: {
        // STRICT limits for babies/children under 6
        sugar_max: 2,                   // g (AAP: no added sugar under 2 years)
        salt_max: 0.2,                  // g (very low sodium tolerance)
        sodium_max: 0.08,               // g
        caffeine_max: 0,                // Absolutely zero
        artificialSweeteners_max: 0,    // Zero tolerance
        
        // Choking hazards (texture indicators)
        fiber_choking_risk: 8,          // High fiber = hard/chunky texture
        
        // Nutritional minimums
        protein_min: 5,                 // g (growth)
        calcium_min: 80,                // mg (bone development)
        iron_min: 1.5,                  // mg (brain development)
        
        // Caution thresholds
        calories_caution: 180,          // kcal
        fat_caution: 10,                // g
        
        // Processing indicators
        additives_tolerance: 0          // No artificial additives
    }
};

/**
 * Known unsafe ingredients for pregnancy/children
 */
const UNSAFE_INGREDIENTS = {
    pregnancy: [
        'alcohol', 'ethanol', 'wine', 'beer',
        'raw fish', 'sushi', 'sashimi',
        'unpasteurized', 'raw milk',
        'liver', 'pâté',
        'caffeine', 'coffee', 'energy drink',
        'artificial sweeteners', 'saccharin',
        'msg', 'monosodium glutamate',
        'nitrates', 'nitrites'
    ],
    
    baby_under_6: [
        'honey', 'corn syrup',          // Botulism risk (under 1 year)
        'artificial sweeteners', 'aspartame', 'sucralose', 'saccharin',
        'caffeine', 'coffee', 'tea', 'chocolate',
        'nuts', 'peanuts',              // Choking + allergy risk
        'whole grapes', 'popcorn',      // Choking hazard
        'hot dogs', 'sausages',         // Choking + processing
        'artificial colors', 'red 40', 'yellow 5',
        'preservatives', 'sodium benzoate',
        'msg', 'monosodium glutamate',
        'raw honey', 'unpasteurized'
    ]
};

// ============================================
// MAIN EVALUATION FUNCTION
// ============================================

/**
 * Evaluate food suitability for maternal/child nutrition
 * @param {Object} nutrition - Nutrition data per 100g
 * @param {string} context - "pregnant" or "baby_under_6"
 * @returns {Object} Safety evaluation result
 */
function evaluateFoodSuitability(nutrition, context) {
    // Validate inputs
    if (!nutrition || typeof nutrition !== 'object') {
        return createInsufficientDataResponse(context);
    }
    
    if (context !== 'pregnant' && context !== 'baby_under_6') {
        console.warn('Invalid context. Use "pregnant" or "baby_under_6"');
        return createInsufficientDataResponse(context);
    }
    
    // Route to appropriate analyzer
    if (context === 'pregnant') {
        return analyzePregnancySafety(nutrition);
    } else {
        return analyzeBabySafety(nutrition);
    }
}

// ============================================
// PREGNANCY SAFETY ANALYSIS
// ============================================

/**
 * Analyze food safety for pregnant women
 * @param {Object} nutrition - Nutrition data per 100g
 * @returns {Object} Pregnancy safety evaluation
 */
function analyzePregnancySafety(nutrition) {
    const limits = SAFETY_LIMITS.pregnancy;
    let score = 100;
    let warnings = [];
    let positives = [];
    
    // Normalize nutrition values
    const n = {
        calories: nutrition.calories || 0,
        sugar: nutrition.sugar || 0,
        sodium: nutrition.sodium || (nutrition.salt || 0) * 400, // Convert salt to sodium
        salt: nutrition.salt || 0,
        fat: nutrition.fat || 0,
        saturatedFat: nutrition.saturatedFat || 0,
        protein: nutrition.protein || 0,
        fiber: nutrition.fiber || 0,
        caffeine: nutrition.caffeine || 0,
        vitaminA: nutrition.vitamins?.a || 0,
        iron: nutrition.minerals?.iron || nutrition.iron || 0,
        calcium: nutrition.minerals?.calcium || nutrition.calcium || 0,
        folate: nutrition.vitamins?.folate || nutrition.folate || 0
    };
    
    // Check ingredients for unsafe items
    const ingredients = nutrition.ingredients || '';
    const unsafeFound = checkUnsafeIngredients(ingredients, 'pregnancy');
    
    // ============================================
    // CRITICAL RISK FACTORS (Auto-AVOID)
    // ============================================
    
    // 1. Caffeine (any amount is concerning)
    if (n.caffeine > limits.caffeine_max) {
        score = 0;
        warnings.push({
            severity: 'critical',
            message: `Contains caffeine (${n.caffeine}mg/100g) - limit caffeine during pregnancy`,
            nutrient: 'caffeine'
        });
    }
    
    // 2. Unsafe ingredients detected
    if (unsafeFound.length > 0) {
        score = Math.min(score, 25);
        warnings.push({
            severity: 'critical',
            message: `Contains unsafe ingredients: ${unsafeFound.join(', ')}`,
            nutrient: 'ingredients'
        });
    }
    
    // 3. Excessive Vitamin A (Retinol) - teratogenic risk
    if (n.vitaminA > limits.vitaminA_retinol_max) {
        score -= 40;
        warnings.push({
            severity: 'critical',
            message: `Very high Vitamin A (${n.vitaminA}mcg) - may cause birth defects`,
            nutrient: 'vitaminA'
        });
    }
    
    // ============================================
    // HIGH RISK FACTORS (Major penalties)
    // ============================================
    
    // 4. Excessive sugar (gestational diabetes risk)
    if (n.sugar > limits.sugar_max) {
        const sugarPenalty = Math.min(25, (n.sugar - limits.sugar_max) * 2);
        score -= sugarPenalty;
        warnings.push({
            severity: 'high',
            message: `High sugar content (${n.sugar.toFixed(1)}g) - gestational diabetes risk`,
            nutrient: 'sugar'
        });
    }
    
    // 5. High sodium (preeclampsia/edema risk)
    if (n.salt > limits.sodium_max) {
        const sodiumPenalty = Math.min(20, (n.salt - limits.sodium_max) * 25);
        score -= sodiumPenalty;
        warnings.push({
            severity: 'high',
            message: `High sodium (${n.salt.toFixed(2)}g) - may increase blood pressure`,
            nutrient: 'sodium'
        });
    }
    
    // 6. Very high calorie density
    if (n.calories > limits.calories_caution) {
        const calPenalty = Math.min(15, (n.calories - limits.calories_caution) * 0.05);
        score -= calPenalty;
        warnings.push({
            severity: 'moderate',
            message: `High calorie density (${n.calories}kcal) - monitor portion size`,
            nutrient: 'calories'
        });
    }
    
    // 7. High saturated fat
    if (n.saturatedFat > limits.saturatedFat_caution) {
        const fatPenalty = Math.min(10, (n.saturatedFat - limits.saturatedFat_caution) * 1.5);
        score -= fatPenalty;
        warnings.push({
            severity: 'moderate',
            message: `High saturated fat (${n.saturatedFat.toFixed(1)}g) - limit intake`,
            nutrient: 'saturatedFat'
        });
    }
    
    // ============================================
    // POSITIVE FACTORS (Nutritional benefits)
    // ============================================
    
    // 8. Good iron content (anemia prevention)
    if (n.iron >= limits.iron_min) {
        positives.push({
            message: `Good iron content (${n.iron.toFixed(1)}mg) - supports healthy pregnancy`,
            nutrient: 'iron'
        });
        score += 5;
    }
    
    // 9. Good calcium (bone health)
    if (n.calcium >= limits.calcium_min) {
        positives.push({
            message: `Contains calcium (${n.calcium.toFixed(0)}mg) - important for baby's bones`,
            nutrient: 'calcium'
        });
        score += 5;
    }
    
    // 10. Good protein (fetal development)
    if (n.protein >= limits.protein_min) {
        positives.push({
            message: `Good protein (${n.protein.toFixed(1)}g) - supports fetal growth`,
            nutrient: 'protein'
        });
        score += 5;
    }
    
    // 11. High fiber (digestive health)
    if (n.fiber >= limits.fiber_min) {
        positives.push({
            message: `High fiber (${n.fiber.toFixed(1)}g) - helps prevent constipation`,
            nutrient: 'fiber'
        });
        score += 5;
    }
    
    // 12. Folate present (neural tube health)
    if (n.folate >= limits.folate_min) {
        positives.push({
            message: `Contains folate (${n.folate.toFixed(0)}mcg) - crucial for baby's development`,
            nutrient: 'folate'
        });
        score += 8;
    }
    
    // ============================================
    // FINAL SCORING & CATEGORIZATION
    // ============================================
    
    score = Math.max(0, Math.min(100, Math.round(score)));
    
    let status, label, emoji, color, explanation;
    
    if (score >= 75) {
        status = 'Safe';
        label = 'Pregnancy Safe';
        emoji = '✅';
        color = '#10b981';
        explanation = 'This food is generally safe for pregnancy and provides beneficial nutrients.';
    } else if (score >= 50) {
        status = 'Caution';
        label = 'Use Caution';
        emoji = '⚠️';
        color = '#f59e0b';
        explanation = 'This food may be consumed occasionally during pregnancy, but monitor portions and frequency.';
    } else if (score >= 25) {
        status = 'Avoid';
        label = 'Not Recommended';
        emoji = '🚫';
        color = '#f97316';
        explanation = 'This food is not recommended during pregnancy due to nutritional concerns.';
    } else {
        status = 'Avoid';
        label = 'Unsafe for Pregnancy';
        emoji = '❌';
        color = '#ef4444';
        explanation = 'This food should be avoided during pregnancy due to safety concerns.';
    }
    
    return {
        score,
        status,
        label,
        explanation,
        emoji,
        color,
        warnings: warnings.map(w => w.message),
        warningsDetailed: warnings,
        positives: positives.map(p => p.message),
        positivesDetailed: positives,
        context: 'pregnant',
        nutritionHighlights: {
            iron: n.iron,
            calcium: n.calcium,
            protein: n.protein,
            fiber: n.fiber,
            folate: n.folate
        },
        timestamp: new Date().toISOString()
    };
}

// ============================================
// BABY/CHILD UNDER 6 SAFETY ANALYSIS
// ============================================

/**
 * Analyze food safety for babies and children under 6
 * @param {Object} nutrition - Nutrition data per 100g
 * @returns {Object} Child safety evaluation
 */
function analyzeBabySafety(nutrition) {
    const limits = SAFETY_LIMITS.baby_under_6;
    let score = 100;
    let warnings = [];
    let positives = [];
    
    // Normalize nutrition values
    const n = {
        calories: nutrition.calories || 0,
        sugar: nutrition.sugar || 0,
        salt: nutrition.salt || 0,
        sodium: nutrition.sodium || (nutrition.salt || 0) * 400,
        fat: nutrition.fat || 0,
        protein: nutrition.protein || 0,
        fiber: nutrition.fiber || 0,
        caffeine: nutrition.caffeine || 0,
        calcium: nutrition.minerals?.calcium || nutrition.calcium || 0,
        iron: nutrition.minerals?.iron || nutrition.iron || 0
    };
    
    // Check ingredients for unsafe items
    const ingredients = nutrition.ingredients || '';
    const unsafeFound = checkUnsafeIngredients(ingredients, 'baby_under_6');
    
    // ============================================
    // CRITICAL RISK FACTORS (Auto-AVOID)
    // ============================================
    
    // 1. ANY caffeine = immediate disqualification
    if (n.caffeine > 0) {
        score = 0;
        warnings.push({
            severity: 'critical',
            message: 'Contains caffeine - NEVER suitable for children under 6',
            nutrient: 'caffeine'
        });
    }
    
    // 2. Unsafe ingredients (honey, artificial sweeteners, etc.)
    if (unsafeFound.length > 0) {
        score = 0;
        warnings.push({
            severity: 'critical',
            message: `Contains unsafe ingredients for children: ${unsafeFound.join(', ')}`,
            nutrient: 'ingredients'
        });
    }
    
    // 3. Excessive sugar (AAP guideline: no added sugar under 2)
    if (n.sugar > limits.sugar_max) {
        score -= 50;
        warnings.push({
            severity: 'critical',
            message: `Too much sugar (${n.sugar.toFixed(1)}g) - not suitable for young children`,
            nutrient: 'sugar'
        });
    }
    
    // 4. Excessive salt (kidney development concern)
    if (n.salt > limits.salt_max) {
        score -= 40;
        warnings.push({
            severity: 'critical',
            message: `Too much salt (${n.salt.toFixed(2)}g) - harmful to developing kidneys`,
            nutrient: 'salt'
        });
    }
    
    // ============================================
    // HIGH RISK FACTORS
    // ============================================
    
    // 5. High calorie density (obesity risk)
    if (n.calories > limits.calories_caution) {
        const calPenalty = Math.min(20, (n.calories - limits.calories_caution) * 0.1);
        score -= calPenalty;
        warnings.push({
            severity: 'high',
            message: `High calorie density (${n.calories}kcal) - may contribute to childhood obesity`,
            nutrient: 'calories'
        });
    }
    
    // 6. High fat content
    if (n.fat > limits.fat_caution) {
        const fatPenalty = Math.min(15, (n.fat - limits.fat_caution) * 1);
        score -= fatPenalty;
        warnings.push({
            severity: 'moderate',
            message: `High fat content (${n.fat.toFixed(1)}g) - limit portion size`,
            nutrient: 'fat'
        });
    }
    
    // 7. Very high fiber (choking/texture concern)
    if (n.fiber > limits.fiber_choking_risk) {
        score -= 10;
        warnings.push({
            severity: 'moderate',
            message: `High fiber may indicate hard/chunky texture - choking risk for young children`,
            nutrient: 'fiber'
        });
    }
    
    // ============================================
    // POSITIVE FACTORS
    // ============================================
    
    // 8. Good protein (growth)
    if (n.protein >= limits.protein_min) {
        positives.push({
            message: `Good protein (${n.protein.toFixed(1)}g) - supports healthy growth`,
            nutrient: 'protein'
        });
        score += 8;
    }
    
    // 9. Calcium for bone development
    if (n.calcium >= limits.calcium_min) {
        positives.push({
            message: `Contains calcium (${n.calcium.toFixed(0)}mg) - important for growing bones`,
            nutrient: 'calcium'
        });
        score += 8;
    }
    
    // 10. Iron for brain development
    if (n.iron >= limits.iron_min) {
        positives.push({
            message: `Contains iron (${n.iron.toFixed(1)}mg) - crucial for brain development`,
            nutrient: 'iron'
        });
        score += 8;
    }
    
    // 11. Low sugar AND low salt (ideal profile)
    if (n.sugar <= 1 && n.salt <= 0.1) {
        positives.push({
            message: 'Very low in sugar and salt - excellent for young children',
            nutrient: 'overall'
        });
        score += 10;
    }
    
    // ============================================
    // FINAL SCORING & CATEGORIZATION
    // ============================================
    
    score = Math.max(0, Math.min(100, Math.round(score)));
    
    let status, label, emoji, color, explanation;
    
    if (score >= 80) {
        status = 'Safe';
        label = 'Child Safe';
        emoji = '👶';
        color = '#10b981';
        explanation = 'This food is suitable for children under 6 and provides beneficial nutrients for growth.';
    } else if (score >= 60) {
        status = 'Caution';
        label = 'Occasional Only';
        emoji = '⚠️';
        color = '#f59e0b';
        explanation = 'This food may be given occasionally with supervision, but should not be a regular part of diet.';
    } else if (score >= 30) {
        status = 'Avoid';
        label = 'Not Recommended';
        emoji = '🚫';
        color = '#f97316';
        explanation = 'This food is not recommended for children under 6 due to nutritional or safety concerns.';
    } else {
        status = 'Avoid';
        label = 'Unsafe for Children';
        emoji = '❌';
        color = '#ef4444';
        explanation = 'This food is unsafe for children under 6 and should be completely avoided.';
    }
    
    return {
        score,
        status,
        label,
        explanation,
        emoji,
        color,
        warnings: warnings.map(w => w.message),
        warningsDetailed: warnings,
        positives: positives.map(p => p.message),
        positivesDetailed: positives,
        context: 'baby_under_6',
        nutritionHighlights: {
            sugar: n.sugar,
            salt: n.salt,
            protein: n.protein,
            calcium: n.calcium,
            iron: n.iron
        },
        timestamp: new Date().toISOString()
    };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Check for unsafe ingredients in product
 * @param {string} ingredients - Ingredients text
 * @param {string} context - "pregnant" or "baby_under_6"
 * @returns {Array} List of unsafe ingredients found
 */
function checkUnsafeIngredients(ingredients, context) {
    if (!ingredients || typeof ingredients !== 'string') {
        return [];
    }
    
    const ingredientsLower = ingredients.toLowerCase();
    const unsafeList = UNSAFE_INGREDIENTS[context] || [];
    const found = [];
    
    unsafeList.forEach(unsafe => {
        if (ingredientsLower.includes(unsafe.toLowerCase())) {
            found.push(unsafe);
        }
    });
    
    return found;
}

/**
 * Create response for insufficient data
 * @param {string} context - Analysis context
 * @returns {Object} Insufficient data response
 */
function createInsufficientDataResponse(context) {
    return {
        score: null,
        status: 'Unknown',
        label: 'Insufficient Data',
        explanation: 'Not enough nutritional information available to assess safety.',
        emoji: '❓',
        color: '#6b7280',
        warnings: ['Insufficient nutritional data for analysis'],
        warningsDetailed: [],
        positives: [],
        positivesDetailed: [],
        context: context || 'unknown',
        nutritionHighlights: {},
        timestamp: new Date().toISOString()
    };
}

// ============================================
// UI INTEGRATION (NON-INVASIVE)
// ============================================

/**
 * Global function to trigger maternal/child analysis
 * Integrates with existing UI without modifying HTML/CSS
 * @param {Object} nutritionData - Nutrition data from scan
 * @param {Object} options - Analysis options
 */
function runMaternalChildAnalysis(nutritionData, options = {}) {
    try {
        const {
            enablePregnancy = true,
            enableBaby = true,
            autoDisplay = true
        } = options;
        
        const results = {};
        
        // Run pregnancy analysis
        if (enablePregnancy) {
            results.pregnancy = evaluateFoodSuitability(nutritionData, 'pregnant');
            if (autoDisplay) {
                displayPregnancyResults(results.pregnancy);
            }
        }
        
        // Run baby/child analysis
        if (enableBaby) {
            results.baby = evaluateFoodSuitability(nutritionData, 'baby_under_6');
            if (autoDisplay) {
                displayBabyResults(results.baby);
            }
        }
        
        return results;
        
    } catch (error) {
        console.error('[Maternal-Child Engine] Analysis error:', error);
        return {
            error: true,
            message: error.message
        };
    }
}

/**
 * Display pregnancy safety results in existing UI
 * Uses inline styles only, no DOM structure changes
 */
function displayPregnancyResults(result) {
    try {
        // Try to find existing result containers
        const containers = [
            document.querySelector('#health-analysis'),
            document.querySelector('.health-score-container'),
            document.querySelector('#product-details'),
            document.querySelector('.analysis-section')
        ];
        
        const targetContainer = containers.find(c => c !== null);
        
        if (!targetContainer) {
            console.warn('[Maternal-Child] No suitable container found for pregnancy results');
            return;
        }
        
        // Create pregnancy safety badge (inline styled)
        const badge = document.createElement('div');
        badge.id = 'pregnancy-safety-badge';
        badge.style.cssText = `
            margin: 15px 0;
            padding: 15px;
            border-radius: 12px;
            border: 3px solid ${result.color};
            background: ${result.color}15;
            font-family: system-ui, -apple-system, sans-serif;
        `;
        
        badge.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 10px;">
                <span style="font-size: 32px;">${result.emoji}</span>
                <div>
                    <div style="font-size: 18px; font-weight: 700; color: ${result.color};">
                        🤰 Pregnancy: ${result.label}
                    </div>
                    <div style="font-size: 14px; color: #64748b; margin-top: 2px;">
                        Safety Score: ${result.score !== null ? result.score + '/100' : 'N/A'}
                    </div>
                </div>
            </div>
            <div style="font-size: 14px; color: #475569; margin-bottom: 10px; line-height: 1.5;">
                ${result.explanation}
            </div>
            ${result.warnings.length > 0 ? `
                <div style="margin-top: 10px;">
                    <div style="font-weight: 600; color: #ef4444; margin-bottom: 5px;">⚠️ Concerns:</div>
                    ${result.warnings.map(w => `
                        <div style="font-size: 13px; color: #64748b; padding: 4px 0; padding-left: 20px;">
                            • ${w}
                        </div>
                    `).join('')}
                </div>
            ` : ''}
            ${result.positives.length > 0 ? `
                <div style="margin-top: 10px;">
                    <div style="font-weight: 600; color: #10b981; margin-bottom: 5px;">✅ Benefits:</div>
                    ${result.positives.map(p => `
                        <div style="font-size: 13px; color: #64748b; padding: 4px 0; padding-left: 20px;">
                            • ${p}
                        </div>
                    `).join('')}
                </div>
            ` : ''}
        `;
        
        // Remove old badge if exists
        const oldBadge = document.getElementById('pregnancy-safety-badge');
        if (oldBadge) {
            oldBadge.remove();
        }
        
        // Insert badge
        targetContainer.insertBefore(badge, targetContainer.firstChild);
        
    } catch (error) {
        console.error('[Maternal-Child] Display error:', error);
    }
}

/**
 * Display baby/child safety results in existing UI
 */
function displayBabyResults(result) {
    try {
        const containers = [
            document.querySelector('#health-analysis'),
            document.querySelector('.health-score-container'),
            document.querySelector('#product-details'),
            document.querySelector('.analysis-section')
        ];
        
        const targetContainer = containers.find(c => c !== null);
        
        if (!targetContainer) {
            console.warn('[Maternal-Child] No suitable container found for baby results');
            return;
        }
        
        const badge = document.createElement('div');
        badge.id = 'baby-safety-badge';
        badge.style.cssText = `
            margin: 15px 0;
            padding: 15px;
            border-radius: 12px;
            border: 3px solid ${result.color};
            background: ${result.color}15;
            font-family: system-ui, -apple-system, sans-serif;
        `;
        
        badge.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 10px;">
                <span style="font-size: 32px;">${result.emoji}</span>
                <div>
                    <div style="font-size: 18px; font-weight: 700; color: ${result.color};">
                        👶 Children Under 6: ${result.label}
                    </div>
                    <div style="font-size: 14px; color: #64748b; margin-top: 2px;">
                        Safety Score: ${result.score !== null ? result.score + '/100' : 'N/A'}
                    </div>
                </div>
            </div>
            <div style="font-size: 14px; color: #475569; margin-bottom: 10px; line-height: 1.5;">
                ${result.explanation}
            </div>
            ${result.warnings.length > 0 ? `
                <div style="margin-top: 10px;">
                    <div style="font-weight: 600; color: #ef4444; margin-bottom: 5px;">⚠️ Concerns:</div>
                    ${result.warnings.map(w => `
                        <div style="font-size: 13px; color: #64748b; padding: 4px 0; padding-left: 20px;">
                            • ${w}
                        </div>
                    `).join('')}
                </div>
            ` : ''}
            ${result.positives.length > 0 ? `
                <div style="margin-top: 10px;">
                    <div style="font-weight: 600; color: #10b981; margin-bottom: 5px;">✅ Benefits:</div>
                    ${result.positives.map(p => `
                        <div style="font-size: 13px; color: #64748b; padding: 4px 0; padding-left: 20px;">
                            • ${p}
                        </div>
                    `).join('')}
                </div>
            ` : ''}
        `;
        
        const oldBadge = document.getElementById('baby-safety-badge');
        if (oldBadge) {
            oldBadge.remove();
        }
        
        targetContainer.insertBefore(badge, targetContainer.firstChild);
        
    } catch (error) {
        console.error('[Maternal-Child] Display error:', error);
    }
}

// ============================================
// AUTO-INTEGRATION HOOKS
// ============================================

/**
 * Auto-attach to existing product scan flow
 * Listens for nutrition data updates and triggers analysis
 */
function initAutoIntegration() {
    // Listen for custom events from existing app
    document.addEventListener('nutritionDataLoaded', function(event) {
        const nutritionData = event.detail?.nutrition;
        if (nutritionData) {
            runMaternalChildAnalysis(nutritionData, {
                enablePregnancy: true,
                enableBaby: true,
                autoDisplay: true
            });
        }
    });
    
    // Observe DOM for nutrition data containers
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.addedNodes.length) {
                // Check if nutrition panel was added
                const nutritionPanel = document.querySelector('#nutrition-panel') || 
                                      document.querySelector('.nutrition-data');
                
                if (nutritionPanel && window.lastScannedNutrition) {
                    runMaternalChildAnalysis(window.lastScannedNutrition);
                }
            }
        });
    });
    
    // Start observing
    const targetNode = document.body;
    observer.observe(targetNode, {
        childList: true,
        subtree: true
    });
    
    console.log('✅ Maternal-Child Engine auto-integration initialized');
}

// ============================================
// GLOBAL EXPORTS
// ============================================

// Export to window for easy access
if (typeof window !== 'undefined') {
    window.evaluateFoodSuitability = evaluateFoodSuitability;
    window.runMaternalChildAnalysis = runMaternalChildAnalysis;
    window.MATERNAL_CHILD_ENGINE_VERSION = '1.0';
    
    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAutoIntegration);
    } else {
        initAutoIntegration();
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        evaluateFoodSuitability,
        runMaternalChildAnalysis,
        analyzePregnancySafety,
        analyzeBabySafety,
        SAFETY_LIMITS,
        UNSAFE_INGREDIENTS
    };
}

console.log('✅ Maternal & Child Nutrition Engine v1.0 loaded successfully');
console.log('🤰 Pregnancy analysis ready');
console.log('👶 Baby/child (under 6) analysis ready');