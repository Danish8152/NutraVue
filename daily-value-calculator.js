// ============================================
// 📊 DAILY VALUE CALCULATOR - Male/Female Logic
// ============================================
// Gender-specific daily value percentage calculations
// Based on FDA and WHO recommendations

/**
 * Daily Value Reference Intake (per 100g)
 * Source: FDA, WHO, EFSA guidelines
 */
const DAILY_VALUES = {
    male: {
        calories: 2500,      // kcal
        sugar: 36,           // g (max added sugars - WHO: 9 tsp)
        fat: 78,             // g (~30% of 2500 kcal)
        saturatedFat: 24,    // g (<10% of energy)
        salt: 6,             // g (WHO recommendation)
        sodium: 2400,        // mg (salt equivalent)
        protein: 56,         // g (RDA)
        fiber: 38,           // g (AI - Adequate Intake)
        carbs: 340,          // g (~55% of energy)
        cholesterol: 300     // mg (upper limit)
    },
    female: {
        calories: 2000,      // kcal
        sugar: 25,           // g (max added sugars - WHO: 6 tsp)
        fat: 70,             // g (~30% of 2000 kcal)
        saturatedFat: 20,    // g (<10% of energy)
        salt: 6,             // g (WHO recommendation)
        sodium: 2400,        // mg (salt equivalent)
        protein: 46,         // g (RDA)
        fiber: 25,           // g (AI - Adequate Intake)
        carbs: 275,          // g (~55% of energy)
        cholesterol: 300     // mg (upper limit)
    },
    pregnant: {
        calories: 2200,
        sugar: 25,
        fat: 73,
        saturatedFat: 22,
        salt: 6,
        sodium: 2400,
        protein: 71,         // Increased during pregnancy
        fiber: 28,
        carbs: 302,
        cholesterol: 300
    },
    athlete: {
        male: {
            calories: 3500,
            sugar: 50,
            fat: 117,
            saturatedFat: 35,
            salt: 8,
            sodium: 3200,
            protein: 140,    // Higher for muscle recovery
            fiber: 45,
            carbs: 480,
            cholesterol: 300
        },
        female: {
            calories: 2800,
            sugar: 40,
            fat: 93,
            saturatedFat: 28,
            salt: 7,
            sodium: 2800,
            protein: 112,
            fiber: 35,
            carbs: 385,
            cholesterol: 300
        }
    }
};

/**
 * Calculate daily value percentage for a nutrient
 * @param {number} value - Nutrient value per 100g
 * @param {string} nutrient - Nutrient name
 * @param {Object} options - Calculation options
 * @returns {Object} Daily value data
 */
function calculateDailyValue(value, nutrient, options = {}) {
    const {
        gender = 'male',
        profile = 'standard', // standard, pregnant, athlete
        servingSize = 100     // Default per 100g
    } = options;

    // Get appropriate daily value reference
    let dvReference;
    
    if (profile === 'athlete') {
        dvReference = DAILY_VALUES.athlete[gender] || DAILY_VALUES.athlete.male;
    } else if (profile === 'pregnant') {
        dvReference = DAILY_VALUES.pregnant;
    } else {
        dvReference = DAILY_VALUES[gender] || DAILY_VALUES.male;
    }

    // Get target value for nutrient
    const targetDV = dvReference[nutrient] || 100;

    // Calculate percentage based on serving size
    const percentage = Math.round((value / targetDV) * 100);

    // Determine color coding and category
    const category = categorizeDailyValue(percentage, nutrient);

    return {
        value,
        percentage,
        target: targetDV,
        category: category.name,
        color: category.color,
        icon: category.icon,
        description: category.description,
        recommendation: generateDVRecommendation(percentage, nutrient, category.name)
    };
}

/**
 * Categorize daily value percentage
 * @param {number} percentage - DV percentage
 * @param {string} nutrient - Nutrient type
 * @returns {Object} Category information
 */
function categorizeDailyValue(percentage, nutrient) {
    // Positive nutrients (higher is better): protein, fiber
    const positiveNutrients = ['protein', 'fiber'];
    const isPositive = positiveNutrients.includes(nutrient);

    if (isPositive) {
        // For positive nutrients
        if (percentage >= 40) {
            return {
                name: 'Excellent',
                color: '#10b981',
                icon: '⭐',
                description: 'Outstanding source'
            };
        } else if (percentage >= 20) {
            return {
                name: 'High',
                color: '#22c55e',
                icon: '✅',
                description: 'Good source'
            };
        } else if (percentage >= 10) {
            return {
                name: 'Moderate',
                color: '#84cc16',
                icon: '👍',
                description: 'Contains some'
            };
        } else {
            return {
                name: 'Low',
                color: '#f59e0b',
                icon: '⚡',
                description: 'Low source'
            };
        }
    } else {
        // For negative nutrients (lower is better): sugar, fat, salt, calories
        if (percentage >= 50) {
            return {
                name: 'Very High',
                color: '#ef4444',
                icon: '🚫',
                description: 'Excessive amount'
            };
        } else if (percentage >= 30) {
            return {
                name: 'High',
                color: '#f97316',
                icon: '⚠️',
                description: 'High amount'
            };
        } else if (percentage >= 15) {
            return {
                name: 'Moderate',
                color: '#f59e0b',
                icon: '⚡',
                description: 'Moderate amount'
            };
        } else if (percentage >= 5) {
            return {
                name: 'Low',
                color: '#84cc16',
                icon: '👍',
                description: 'Low amount'
            };
        } else {
            return {
                name: 'Very Low',
                color: '#10b981',
                icon: '✅',
                description: 'Minimal amount'
            };
        }
    }
}

/**
 * Generate recommendation based on DV percentage
 */
function generateDVRecommendation(percentage, nutrient, category) {
    const positiveNutrients = ['protein', 'fiber'];
    const isPositive = positiveNutrients.includes(nutrient);

    if (isPositive) {
        if (percentage >= 40) {
            return `Excellent ${nutrient} content! Great for daily intake.`;
        } else if (percentage >= 20) {
            return `Good source of ${nutrient}. Contributes well to daily needs.`;
        } else if (percentage >= 10) {
            return `Provides some ${nutrient}. Consider supplementing from other sources.`;
        } else {
            return `Low in ${nutrient}. Look for additional sources throughout the day.`;
        }
    } else {
        if (percentage >= 50) {
            return `Very high in ${nutrient}. Consume sparingly or avoid.`;
        } else if (percentage >= 30) {
            return `High in ${nutrient}. Limit consumption and balance with other foods.`;
        } else if (percentage >= 15) {
            return `Moderate ${nutrient} content. Monitor total daily intake.`;
        } else {
            return `Low in ${nutrient}. Good for frequent consumption.`;
        }
    }
}

/**
 * Calculate all daily values for nutrition profile
 * @param {Object} nutrition - Nutrition data per 100g
 * @param {Object} options - Calculation options
 * @returns {Object} Complete daily value analysis
 */
function calculateAllDailyValues(nutrition, options = {}) {
    const nutrients = ['calories', 'sugar', 'fat', 'salt', 'protein', 'fiber'];
    const results = {};

    nutrients.forEach(nutrient => {
        const value = nutrition[nutrient] || 0;
        results[nutrient] = calculateDailyValue(value, nutrient, options);
    });

    // Calculate summary statistics
    const averagePercentage = Math.round(
        Object.values(results).reduce((sum, dv) => sum + dv.percentage, 0) / nutrients.length
    );

    const highNutrients = Object.entries(results)
        .filter(([_, dv]) => dv.percentage >= 30)
        .map(([name, _]) => name);

    const lowNutrients = Object.entries(results)
        .filter(([name, dv]) => ['protein', 'fiber'].includes(name) && dv.percentage < 10)
        .map(([name, _]) => name);

    return {
        dailyValues: results,
        summary: {
            averagePercentage,
            highNutrients,
            lowNutrients,
            profile: options.profile || 'standard',
            gender: options.gender || 'male',
            genderSymbol: (options.gender || 'male') === 'male' ? '♂' : '♀'
        }
    };
}

/**
 * Auto-detect gender from user settings
 * @param {Object} settings - User settings object
 * @returns {string} 'male' or 'female'
 */
function autoDetectGender(settings = {}) {
    // Explicit gender setting
    if (settings.gender) {
        return settings.gender;
    }

    // Auto-detect from calorie goal
    if (settings.calorieGoal) {
        if (settings.calorieGoal <= 2000) {
            return 'female';
        } else if (settings.calorieGoal >= 2800) {
            return settings.gender || 'male'; // Could be athlete
        }
    }

    // Default to male
    return 'male';
}

/**
 * Auto-detect profile from user settings
 * @param {Object} settings - User settings object
 * @returns {string} 'standard', 'pregnant', or 'athlete'
 */
function autoDetectProfile(settings = {}) {
    if (settings.profile) {
        return settings.profile;
    }

    if (settings.dietaryPreferences) {
        if (settings.dietaryPreferences.includes('pregnant')) {
            return 'pregnant';
        }
        if (settings.dietaryPreferences.includes('athlete') || settings.dietaryPreferences.includes('high-protein')) {
            return 'athlete';
        }
    }

    return 'standard';
}

/**
 * Get display text for DV percentage
 * @param {number} percentage - DV percentage
 * @param {string} nutrient - Nutrient name
 * @returns {string} Display text
 */
function getDVDisplayText(percentage, nutrient) {
    const positiveNutrients = ['protein', 'fiber'];
    const isPositive = positiveNutrients.includes(nutrient);

    if (percentage >= 100) {
        return isPositive ? 'Exceeds daily needs' : 'More than daily limit';
    } else if (percentage >= 50) {
        return isPositive ? 'Half of daily needs' : 'Half of daily limit';
    } else if (percentage >= 25) {
        return isPositive ? 'Quarter of daily needs' : 'Quarter of daily limit';
    } else if (percentage >= 10) {
        return `${percentage}% of daily value`;
    } else {
        return 'Minimal contribution';
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        calculateDailyValue,
        calculateAllDailyValues,
        autoDetectGender,
        autoDetectProfile,
        getDVDisplayText,
        DAILY_VALUES
    };
}

console.log('✅ Daily Value Calculator loaded successfully');
