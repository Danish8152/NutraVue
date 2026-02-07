// ============================================
// 🧠 POPULATION FOOD EVALUATOR
// ============================================
// Evaluates food safety for vulnerable populations
// Version: 1.0

/**
 * Evaluate food suitability for specific population groups
 * @param {Object} nutrition - Nutrition data per 100g
 * @param {string} targetGroup - "pregnant" or "child"
 * @param {Object} productData - Optional full product data (allergens, ingredients, etc.)
 * @returns {Object} Evaluation results
 */
function evaluateFoodForPopulation(nutrition, targetGroup, productData = {}) {
    // Validate inputs
    if (!nutrition || typeof nutrition !== 'object') {
        return createInsufficientDataResult(targetGroup);
    }

    if (!['pregnant', 'child'].includes(targetGroup)) {
        console.warn(`Unknown target group: ${targetGroup}`);
        return createInsufficientDataResult(targetGroup);
    }

    // Get appropriate limits
    const limits = targetGroup === 'pregnant' ? 
        (window.PREGNANT_LIMITS || PREGNANT_LIMITS) : 
        (window.CHILD_LIMITS || CHILD_LIMITS);

    // Initialize evaluation state
    const warnings = [];
    const positives = [];
    let severityScore = 0; // 0 = good, 100+ = avoid

    // ============================================
    // CRITICAL SAFETY CHECKS
    // ============================================

    // 1. Check for strictly avoided ingredients (immediate disqualification)
    const strictCheck = checkStrictlyAvoided(productData, targetGroup, limits);
    if (strictCheck.isViolated) {
        return createAvoidResult(
            targetGroup,
            [strictCheck.message],
            strictCheck.explanation
        );
    }

    // ============================================
    // NUTRIENT EVALUATION
    // ============================================

    // 2. Sugar assessment
    const sugarResult = evaluateNutrient(
        nutrition.sugar || 0,
        limits.sugar,
        'sugar'
    );
    severityScore += sugarResult.severity;
    if (sugarResult.warning) warnings.push(sugarResult.warning);
    if (sugarResult.positive) positives.push(sugarResult.positive);

    // 3. Salt assessment
    const saltResult = evaluateNutrient(
        nutrition.salt || 0,
        limits.salt,
        'salt'
    );
    severityScore += saltResult.severity;
    if (saltResult.warning) warnings.push(saltResult.warning);
    if (saltResult.positive) positives.push(saltResult.positive);

    // 4. Saturated fat assessment
    if (limits.saturatedFat) {
        const satFatResult = evaluateNutrient(
            nutrition.saturatedFat || 0,
            limits.saturatedFat,
            'saturated fat'
        );
        severityScore += satFatResult.severity;
        if (satFatResult.warning) warnings.push(satFatResult.warning);
    }

    // 5. Total fat assessment (for children)
    if (targetGroup === 'child' && limits.fat) {
        const fatResult = evaluateNutrient(
            nutrition.fat || 0,
            limits.fat,
            'fat'
        );
        severityScore += fatResult.severity;
        if (fatResult.warning) warnings.push(fatResult.warning);
    }

    // 6. Caffeine check (pregnant women)
    if (targetGroup === 'pregnant' && limits.caffeine) {
        const caffeineAmount = nutrition.caffeine || detectCaffeineFromIngredients(productData.ingredients);
        if (caffeineAmount > limits.caffeine.moderate) {
            warnings.push(`Contains caffeine (${caffeineAmount}mg) - not recommended during pregnancy`);
            severityScore += 50;
        }
    }

    // ============================================
    // POSITIVE ATTRIBUTES
    // ============================================

    // 7. Check for beneficial nutrients
    if (targetGroup === 'pregnant' && limits.requiredNutrients) {
        const nutrientCheck = checkEssentialNutrients(nutrition, limits.requiredNutrients);
        positives.push(...nutrientCheck.positives);
    }

    if (targetGroup === 'child' && limits.essentialNutrients) {
        const nutrientCheck = checkEssentialNutrients(nutrition, limits.essentialNutrients);
        positives.push(...nutrientCheck.positives);
    }

    // 8. Fiber assessment (positive)
    if (nutrition.fiber >= 3) {
        positives.push(`Good fiber content (${nutrition.fiber.toFixed(1)}g) - supports digestive health`);
    }

    // ============================================
    // ADDITIONAL WARNINGS
    // ============================================

    // 9. Check warning triggers
    if (limits.warnings) {
        Object.entries(limits.warnings).forEach(([key, config]) => {
            let triggered = false;
            
            try {
                if (config.trigger) {
                    if (key === 'highlyProcessed' || key === 'ultraProcessed') {
                        triggered = config.trigger(productData);
                    } else if (key === 'allergen') {
                        triggered = config.trigger(productData.allergens || []);
                    } else if (key === 'choking') {
                        triggered = config.trigger(productData);
                    } else if (key === 'artificialAdditives') {
                        triggered = config.trigger(productData.ingredients || '');
                    } else {
                        triggered = config.trigger(nutrition);
                    }
                }
            } catch (error) {
                // Silently skip if trigger fails
                console.debug(`Warning trigger failed for ${key}:`, error.message);
            }

            if (triggered && config.message) {
                warnings.push(config.message);
                severityScore += 15;
            }
        });
    }

    // 10. Check caution ingredients (for children)
    if (targetGroup === 'child' && limits.cautionIngredients && productData.ingredients) {
        const cautionFound = checkCautionIngredients(
            productData.ingredients,
            limits.cautionIngredients
        );
        if (cautionFound.length > 0) {
            warnings.push(`Contains: ${cautionFound.join(', ')} - limit consumption`);
            severityScore += 10;
        }
    }

    // ============================================
    // DETERMINE SUITABILITY
    // ============================================

    let suitability, emoji, color, explanation;

    if (severityScore >= 80) {
        // AVOID
        suitability = 'Avoid';
        emoji = '🚫';
        color = '#ef4444';
        explanation = generateExplanation('avoid', targetGroup, warnings, positives);
    } else if (severityScore >= 40) {
        // MODERATE
        suitability = 'Moderate';
        emoji = '⚠️';
        color = '#f59e0b';
        explanation = generateExplanation('moderate', targetGroup, warnings, positives);
    } else {
        // GOOD
        suitability = 'Good Choice';
        emoji = '✅';
        color = '#10b981';
        explanation = generateExplanation('good', targetGroup, warnings, positives);
    }

    // ============================================
    // RETURN RESULTS
    // ============================================

    const metadata = (window.POPULATION_METADATA || POPULATION_METADATA)[targetGroup];

    return {
        suitability,
        emoji,
        color,
        warnings,
        positives,
        explanation,
        severityScore,
        targetGroup,
        metadata: {
            displayName: metadata?.displayName || targetGroup,
            disclaimer: metadata?.disclaimer || 'This information is for awareness only, not medical advice.',
            evaluationDate: new Date().toISOString()
        }
    };
}

/**
 * Evaluate a single nutrient against limits
 */
function evaluateNutrient(value, limits, nutrientName) {
    const result = {
        severity: 0,
        warning: null,
        positive: null
    };

    if (value <= limits.safe) {
        result.positive = `Low ${nutrientName} (${value.toFixed(1)}g) - excellent`;
        result.severity = 0;
    } else if (value <= limits.moderate) {
        result.warning = `Moderate ${nutrientName} (${value.toFixed(1)}g) - ${limits.reason}`;
        result.severity = 20;
    } else {
        result.warning = `High ${nutrientName} (${value.toFixed(1)}g) - ${limits.reason}`;
        result.severity = 40;
    }

    return result;
}

/**
 * Check for strictly avoided ingredients
 */
function checkStrictlyAvoided(productData, targetGroup, limits) {
    const result = {
        isViolated: false,
        message: '',
        explanation: ''
    };

    // Get list of strictly avoided items
    let avoidList = [];
    
    if (targetGroup === 'pregnant' && limits.avoidIngredients) {
        avoidList = limits.avoidIngredients;
    } else if (targetGroup === 'child' && limits.strictlyAvoided) {
        avoidList = limits.strictlyAvoided;
    }

    // Check ingredients text
    const ingredients = (productData.ingredients || '').toLowerCase();
    const productName = (productData.name || '').toLowerCase();
    
    for (const avoided of avoidList) {
        const searchTerm = avoided.toLowerCase();
        
        if (ingredients.includes(searchTerm) || productName.includes(searchTerm)) {
            result.isViolated = true;
            result.message = `Contains ${avoided} - strictly not recommended for ${targetGroup === 'pregnant' ? 'pregnancy' : 'young children'}`;
            result.explanation = `This product contains ingredients that should be avoided by ${targetGroup === 'pregnant' ? 'pregnant women' : 'children under 6'} due to safety concerns.`;
            return result;
        }
    }

    return result;
}

/**
 * Check for essential nutrients
 */
function checkEssentialNutrients(nutrition, required) {
    const positives = [];

    if (nutrition.protein >= required.protein) {
        positives.push(`Good protein source (${nutrition.protein.toFixed(1)}g)`);
    }

    if (nutrition.fiber && nutrition.fiber >= (required.fiber || 3)) {
        positives.push(`High fiber (${nutrition.fiber.toFixed(1)}g)`);
    }

    if (nutrition.iron && nutrition.iron >= (required.iron || 0.001)) {
        positives.push(`Contains iron - important for development`);
    }

    if (nutrition.calcium && nutrition.calcium >= (required.calcium || 0.1)) {
        positives.push(`Good calcium source - supports bone health`);
    }

    return { positives };
}

/**
 * Check for caution ingredients in children's food
 */
function checkCautionIngredients(ingredients, cautionList) {
    const found = [];
    const ingredientsLower = ingredients.toLowerCase();

    for (const item of cautionList) {
        if (ingredientsLower.includes(item.toLowerCase())) {
            found.push(item);
        }
    }

    return found;
}

/**
 * Detect caffeine from ingredients text
 */
function detectCaffeineFromIngredients(ingredients) {
    if (!ingredients) return 0;

    const ingredientsLower = ingredients.toLowerCase();
    
    // Estimate caffeine content
    if (ingredientsLower.includes('coffee')) return 80;
    if (ingredientsLower.includes('espresso')) return 120;
    if (ingredientsLower.includes('tea') || ingredientsLower.includes('green tea')) return 30;
    if (ingredientsLower.includes('chocolate') || ingredientsLower.includes('cocoa')) return 10;
    if (ingredientsLower.includes('energy')) return 100;
    
    return 0;
}

/**
 * Generate explanation text
 */
function generateExplanation(category, targetGroup, warnings, positives) {
    const groupName = targetGroup === 'pregnant' ? 'pregnancy' : 'young children';
    
    if (category === 'good') {
        let text = `This product appears suitable for ${groupName}. `;
        
        if (positives.length > 0) {
            text += `Positive aspects: ${positives.slice(0, 2).join('; ')}. `;
        }
        
        if (warnings.length > 0) {
            text += `Minor considerations: ${warnings[0]}`;
        }
        
        return text;
    } else if (category === 'moderate') {
        let text = `This product can be consumed occasionally by ${groupName}, but should not be a regular choice. `;
        
        if (warnings.length > 0) {
            text += `Concerns: ${warnings.slice(0, 2).join('; ')}. `;
        }
        
        text += `Monitor portion sizes and frequency.`;
        
        return text;
    } else {
        let text = `This product is not recommended for ${groupName}. `;
        
        if (warnings.length > 0) {
            text += `Main concerns: ${warnings.slice(0, 3).join('; ')}. `;
        }
        
        text += `Choose alternative products better suited for this population.`;
        
        return text;
    }
}

/**
 * Create result when data is insufficient
 */
function createInsufficientDataResult(targetGroup) {
    const categories = window.SUITABILITY_CATEGORIES || SUITABILITY_CATEGORIES;
    
    return {
        suitability: 'Insufficient Data',
        emoji: '❓',
        color: '#9ca3af',
        warnings: ['Not enough nutrition information to evaluate safety'],
        positives: [],
        explanation: 'This product lacks sufficient nutrition data for a proper safety assessment.',
        severityScore: null,
        targetGroup,
        metadata: {
            disclaimer: 'Unable to evaluate - insufficient product data'
        }
    };
}

/**
 * Create avoid result for critical violations
 */
function createAvoidResult(targetGroup, warnings, explanation) {
    return {
        suitability: 'Avoid',
        emoji: '🚫',
        color: '#ef4444',
        warnings,
        positives: [],
        explanation,
        severityScore: 100,
        targetGroup,
        metadata: {
            disclaimer: 'This information is for awareness only, not medical advice.'
        }
    };
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        evaluateFoodForPopulation
    };
}

// Make available globally for browser usage
if (typeof window !== 'undefined') {
    window.evaluateFoodForPopulation = evaluateFoodForPopulation;
}

console.log('✅ Population Food Evaluator loaded successfully');