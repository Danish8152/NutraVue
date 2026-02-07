// ============================================
// 🩺 DIABETIC WARNING SYSTEM
// ============================================
// Medical-grade warning system for diabetic users
// Based on ADA (American Diabetes Association) guidelines

/**
 * Diabetic warning severity levels
 */
const DIABETIC_SEVERITY = {
    CRITICAL: {
        level: 'critical',
        color: '#dc2626',
        bgColor: '#fee2e2',
        icon: '🚫',
        sound: 'alert',
        priority: 1
    },
    HIGH: {
        level: 'high',
        color: '#ea580c',
        bgColor: '#ffedd5',
        icon: '⚠️',
        sound: 'warning',
        priority: 2
    },
    MODERATE: {
        level: 'moderate',
        color: '#f59e0b',
        bgColor: '#fef3c7',
        icon: '⚡',
        sound: 'caution',
        priority: 3
    },
    LOW: {
        level: 'low',
        color: '#84cc16',
        bgColor: '#ecfccb',
        icon: '💡',
        sound: null,
        priority: 4
    },
    SAFE: {
        level: 'safe',
        color: '#10b981',
        bgColor: '#d1fae5',
        icon: '✅',
        sound: null,
        priority: 5
    }
};

/**
 * Glycemic index categories (estimated)
 */
const GLYCEMIC_IMPACT = {
    VERY_HIGH: 'very_high',  // Sugar >20g
    HIGH: 'high',            // Sugar 15-20g
    MODERATE: 'moderate',    // Sugar 10-15g
    LOW: 'low',              // Sugar 5-10g
    VERY_LOW: 'very_low'     // Sugar <5g
};

/**
 * Generate comprehensive diabetic warnings
 * @param {Object} nutrition - Nutrition data per 100g
 * @param {Object} options - Warning options
 * @returns {Array} Array of warning objects
 */
function generateDiabeticWarnings(nutrition, options = {}) {
    const warnings = [];
    const { isDiabetic = false, diabeticType = 'type2' } = options;

    // Only generate warnings for diabetic users
    if (!isDiabetic) {
        return warnings;
    }

    const n = {
        sugar: nutrition.sugar || 0,
        calories: nutrition.calories || 0,
        fat: nutrition.fat || 0,
        salt: nutrition.salt || 0,
        protein: nutrition.protein || 0,
        fiber: nutrition.fiber || 0,
        carbs: nutrition.carbs || (nutrition.sugar || 0) // Estimate if not provided
    };

    // ============================================
    // SUGAR-BASED WARNINGS (Primary concern)
    // ============================================

    if (n.sugar > 20) {
        // CRITICAL: Very high sugar
        warnings.push({
            ...DIABETIC_SEVERITY.CRITICAL,
            type: 'sugar_critical',
            title: 'CRITICAL SUGAR LEVEL',
            message: `Extremely high sugar content: ${n.sugar.toFixed(1)}g per 100g`,
            detail: 'May cause severe blood glucose spike. Avoid completely.',
            impact: 'Blood glucose may rise by 150-200+ mg/dL',
            action: 'DO NOT CONSUME - Consult healthcare provider',
            glycemicImpact: GLYCEMIC_IMPACT.VERY_HIGH
        });
    } else if (n.sugar > 15) {
        // HIGH: High sugar
        warnings.push({
            ...DIABETIC_SEVERITY.HIGH,
            type: 'sugar_high',
            title: 'HIGH SUGAR WARNING',
            message: `Very high sugar content: ${n.sugar.toFixed(1)}g per 100g`,
            detail: 'Will significantly raise blood glucose levels.',
            impact: 'Blood glucose may rise by 100-150 mg/dL',
            action: 'Avoid or consume minimal amount with insulin adjustment',
            glycemicImpact: GLYCEMIC_IMPACT.HIGH
        });
    } else if (n.sugar > 10) {
        // MODERATE: Moderate-high sugar
        warnings.push({
            ...DIABETIC_SEVERITY.MODERATE,
            type: 'sugar_moderate',
            title: 'MODERATE SUGAR ALERT',
            message: `Elevated sugar content: ${n.sugar.toFixed(1)}g per 100g`,
            detail: 'Will raise blood glucose levels noticeably.',
            impact: 'Blood glucose may rise by 50-100 mg/dL',
            action: 'Limit portion size, monitor glucose closely',
            glycemicImpact: GLYCEMIC_IMPACT.MODERATE
        });
    } else if (n.sugar > 5) {
        // LOW: Some sugar present
        warnings.push({
            ...DIABETIC_SEVERITY.LOW,
            type: 'sugar_low',
            title: 'Sugar Content Notice',
            message: `Moderate sugar: ${n.sugar.toFixed(1)}g per 100g`,
            detail: 'May cause mild blood glucose increase.',
            impact: 'Blood glucose may rise by 20-50 mg/dL',
            action: 'Consume in small portions, pair with protein/fiber',
            glycemicImpact: GLYCEMIC_IMPACT.LOW
        });
    } else if (n.sugar <= 3) {
        // SAFE: Low sugar
        warnings.push({
            ...DIABETIC_SEVERITY.SAFE,
            type: 'sugar_safe',
            title: 'Low Sugar - Diabetic Friendly',
            message: `Low sugar content: ${n.sugar.toFixed(1)}g per 100g`,
            detail: 'Minimal impact on blood glucose levels.',
            impact: 'Blood glucose rise: <20 mg/dL',
            action: 'Safe for consumption in normal portions',
            glycemicImpact: GLYCEMIC_IMPACT.VERY_LOW
        });
    }

    // ============================================
    // CARBOHYDRATE WARNINGS
    // ============================================

    if (n.carbs > 50) {
        warnings.push({
            ...DIABETIC_SEVERITY.HIGH,
            type: 'carb_high',
            title: 'High Carbohydrate Content',
            message: `Carbohydrates: ${n.carbs.toFixed(1)}g per 100g`,
            detail: 'High carb foods require careful glucose monitoring.',
            action: 'Calculate insulin dose if on insulin therapy'
        });
    }

    // ============================================
    // FAT + SUGAR COMBINATION (Worst for diabetics)
    // ============================================

    if (n.fat > 20 && n.sugar > 10) {
        warnings.push({
            ...DIABETIC_SEVERITY.CRITICAL,
            type: 'combination_danger',
            title: 'DANGEROUS COMBINATION',
            message: 'High fat + high sugar detected',
            detail: 'This combination delays glucose absorption and causes prolonged elevated blood sugar.',
            impact: 'Extended blood glucose elevation (4-6 hours)',
            action: 'Avoid completely - Very high risk for diabetics'
        });
    }

    // ============================================
    // CALORIE DENSITY (Affects insulin sensitivity)
    // ============================================

    if (n.calories > 500) {
        warnings.push({
            ...DIABETIC_SEVERITY.MODERATE,
            type: 'calorie_high',
            title: 'Very High Calorie Density',
            message: `${n.calories} kcal per 100g - Ultra-processed food`,
            detail: 'High calorie density may affect insulin sensitivity.',
            action: 'Consume very small portions if at all'
        });
    }

    // ============================================
    // SALT WARNING (Diabetics at higher risk for hypertension)
    // ============================================

    if (n.salt > 1.5) {
        warnings.push({
            ...DIABETIC_SEVERITY.MODERATE,
            type: 'salt_high',
            title: 'High Salt Content',
            message: `Salt: ${n.salt.toFixed(2)}g per 100g`,
            detail: 'Diabetics have higher risk of hypertension. High salt intake increases cardiovascular risk.',
            action: 'Choose low-sodium alternatives'
        });
    }

    // ============================================
    // POSITIVE INDICATORS (Encourage good choices)
    // ============================================

    // High fiber (helps control blood sugar)
    if (n.fiber >= 8 && n.sugar < 5) {
        warnings.push({
            ...DIABETIC_SEVERITY.SAFE,
            type: 'fiber_good',
            title: '✨ High Fiber Benefit',
            message: `Excellent fiber content: ${n.fiber.toFixed(1)}g per 100g`,
            detail: 'Fiber helps slow glucose absorption and improve blood sugar control.',
            action: 'Great choice for diabetic diet!'
        });
    }

    // Good protein (helps stabilize blood sugar)
    if (n.protein >= 15 && n.sugar < 5) {
        warnings.push({
            ...DIABETIC_SEVERITY.SAFE,
            type: 'protein_good',
            title: '✨ High Protein Benefit',
            message: `Good protein content: ${n.protein.toFixed(1)}g per 100g`,
            detail: 'Protein helps stabilize blood sugar levels.',
            action: 'Excellent choice for blood sugar management'
        });
    }

    // Ideal diabetic food
    if (n.sugar < 3 && n.calories < 200 && n.fiber >= 5) {
        warnings.push({
            ...DIABETIC_SEVERITY.SAFE,
            type: 'ideal_diabetic',
            title: '🌟 IDEAL DIABETIC FOOD',
            message: 'Perfect nutritional profile for diabetes management',
            detail: 'Low sugar, moderate calories, good fiber content.',
            action: 'Highly recommended for regular consumption'
        });
    }

    // ============================================
    // TYPE-SPECIFIC WARNINGS
    // ============================================

    if (diabeticType === 'type1' && n.sugar > 10) {
        warnings.push({
            ...DIABETIC_SEVERITY.HIGH,
            type: 'type1_specific',
            title: 'Type 1 Diabetes Alert',
            message: 'Requires precise insulin calculation',
            detail: `Estimated carbs: ${n.carbs.toFixed(0)}g - Consult carb counting guide`,
            action: 'Calculate bolus insulin dose before consuming'
        });
    }

    // Sort warnings by priority (most critical first)
    warnings.sort((a, b) => a.priority - b.priority);

    return warnings;
}

/**
 * Generate quick diabetic risk assessment
 * @param {Object} nutrition - Nutrition data
 * @param {boolean} isDiabetic - User is diabetic
 * @returns {Object} Risk assessment
 */
function assessDiabeticRisk(nutrition, isDiabetic = false) {
    if (!isDiabetic) {
        return { risk: 'not_applicable', score: 0 };
    }

    const sugar = nutrition.sugar || 0;
    const fat = nutrition.fat || 0;
    let riskScore = 0;

    // Calculate risk score (0-100)
    if (sugar > 20) riskScore += 50;
    else if (sugar > 15) riskScore += 35;
    else if (sugar > 10) riskScore += 20;
    else if (sugar > 5) riskScore += 10;

    if (fat > 30) riskScore += 20;
    else if (fat > 20) riskScore += 10;

    if (sugar > 10 && fat > 20) riskScore += 20; // Combination penalty

    // Determine risk level
    let risk, recommendation;
    
    if (riskScore >= 70) {
        risk = 'critical';
        recommendation = 'Avoid completely - High risk of severe glucose spike';
    } else if (riskScore >= 40) {
        risk = 'high';
        recommendation = 'Not recommended - Significant glucose impact expected';
    } else if (riskScore >= 20) {
        risk = 'moderate';
        recommendation = 'Consume cautiously - Monitor glucose closely';
    } else if (riskScore >= 10) {
        risk = 'low';
        recommendation = 'Acceptable in small portions';
    } else {
        risk = 'safe';
        recommendation = 'Safe for diabetic consumption';
    }

    return {
        risk,
        score: riskScore,
        recommendation,
        severity: DIABETIC_SEVERITY[risk.toUpperCase()] || DIABETIC_SEVERITY.LOW
    };
}

/**
 * Format warning for display
 * @param {Object} warning - Warning object
 * @returns {string} HTML formatted warning
 */
function formatWarningHTML(warning) {
    return `
        <div class="diabetic-warning" 
             style="
                 background-color: ${warning.bgColor};
                 border-left: 4px solid ${warning.color};
                 padding: 12px 16px;
                 margin: 8px 0;
                 border-radius: 8px;
             ">
            <div style="display: flex; align-items: flex-start; gap: 10px;">
                <span style="font-size: 24px; line-height: 1;">${warning.icon}</span>
                <div style="flex: 1;">
                    <div style="
                        font-weight: 700;
                        color: ${warning.color};
                        margin-bottom: 4px;
                        font-size: 0.95rem;
                    ">
                        ${warning.title}
                    </div>
                    <div style="
                        color: #374151;
                        margin-bottom: 6px;
                        font-size: 0.9rem;
                        font-weight: 500;
                    ">
                        ${warning.message}
                    </div>
                    ${warning.detail ? `
                        <div style="
                            color: #6b7280;
                            font-size: 0.85rem;
                            margin-bottom: 6px;
                        ">
                            ${warning.detail}
                        </div>
                    ` : ''}
                    ${warning.impact ? `
                        <div style="
                            background-color: rgba(0,0,0,0.05);
                            padding: 6px 10px;
                            border-radius: 6px;
                            font-size: 0.8rem;
                            color: #1f2937;
                            margin-bottom: 6px;
                        ">
                            <strong>Impact:</strong> ${warning.impact}
                        </div>
                    ` : ''}
                    ${warning.action ? `
                        <div style="
                            color: ${warning.color};
                            font-size: 0.85rem;
                            font-weight: 600;
                            margin-top: 6px;
                        ">
                            ➤ ${warning.action}
                        </div>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
}

/**
 * Calculate estimated glucose impact
 * @param {Object} nutrition - Nutrition data
 * @returns {Object} Glucose impact estimation
 */
function estimateGlucoseImpact(nutrition) {
    const sugar = nutrition.sugar || 0;
    const carbs = nutrition.carbs || sugar;
    const fiber = nutrition.fiber || 0;
    const protein = nutrition.protein || 0;
    const fat = nutrition.fat || 0;

    // Net carbs (carbs - fiber)
    const netCarbs = Math.max(0, carbs - fiber);

    // Estimate blood glucose rise (mg/dL) per 100g
    // Formula based on glycemic load calculation
    let glucoseRise = netCarbs * 4; // Base calculation

    // Fat slows absorption but prolongs elevation
    if (fat > 10) {
        glucoseRise *= 0.8; // Slower rise
    }

    // Protein moderate impact
    if (protein > 20) {
        glucoseRise *= 0.9;
    }

    // Fiber protective effect
    if (fiber > 5) {
        glucoseRise *= 0.85;
    }

    return {
        estimatedRise: Math.round(glucoseRise),
        netCarbs: Math.round(netCarbs * 10) / 10,
        absorptionSpeed: fat > 10 ? 'slow' : sugar > 10 ? 'fast' : 'moderate',
        duration: fat > 10 ? '4-6 hours' : sugar > 10 ? '1-2 hours' : '2-3 hours'
    };
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        generateDiabeticWarnings,
        assessDiabeticRisk,
        formatWarningHTML,
        estimateGlucoseImpact,
        DIABETIC_SEVERITY,
        GLYCEMIC_IMPACT
    };
}

console.log('✅ Diabetic Warning System loaded successfully');
