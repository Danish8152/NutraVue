// ============================================
// 🤰👶 POPULATION NUTRITION RULES
// ============================================
// Safety thresholds for vulnerable populations
// Based on WHO, FDA, NHS, and pediatric guidelines
// Version: 1.0

/**
 * Nutrition safety limits for pregnant women (per 100g)
 * Sources: WHO pregnancy guidelines, NHS, ACOG
 */
const PREGNANT_LIMITS = {
    // Critical limits
    sugar: {
        safe: 3,           // g - Very low sugar preferred
        moderate: 5,       // g - Acceptable occasionally
        avoid: 10,         // g - Too high, avoid
        reason: 'Excess sugar increases gestational diabetes risk'
    },
    salt: {
        safe: 0.2,         // g - Low sodium preferred
        moderate: 0.3,     // g - Acceptable
        avoid: 0.5,        // g - High sodium (hypertension risk)
        reason: 'High salt can cause swelling and high blood pressure'
    },
    caffeine: {
        safe: 0,           // mg - Caffeine-free ideal
        moderate: 20,      // mg - Very low caffeine OK
        avoid: 50,         // mg - Exceeds safe limits per serving
        reason: 'Caffeine crosses placenta, limit to 200mg/day total'
    },
    saturatedFat: {
        safe: 3,           // g - Low sat fat
        moderate: 5,       // g - Acceptable
        avoid: 8,          // g - Too high
        reason: 'High saturated fat affects cardiovascular health'
    },
    
    // Nutrient requirements (minimums for "Good" rating)
    requiredNutrients: {
        protein: 5,        // g - Good protein source
        fiber: 3,          // g - Digestive health
        iron: 0.002,       // g (2mg) - Critical for pregnancy
        calcium: 0.1,      // g (100mg) - Bone health
        folate: 0.0001     // g (100mcg) - Neural development
    },

    // Dangerous ingredients (ingredient text scanning)
    avoidIngredients: [
        // Artificial sweeteners
        'aspartame', 'sucralose', 'saccharin', 'acesulfame',
        // High-risk additives
        'msg', 'monosodium glutamate', 'sodium benzoate',
        // Raw/unpasteurized indicators
        'raw milk', 'unpasteurized', 'raw egg',
        // High vitamin A (teratogenic)
        'retinol', 'retinyl palmitate', 'liver',
        // Alcohol
        'alcohol', 'ethanol', 'wine', 'beer',
        // High mercury fish
        'shark', 'swordfish', 'king mackerel', 'tilefish'
    ],

    // Warning triggers
    warnings: {
        highlyProcessed: {
            trigger: (product) => {
                const nova = product.nova || 0;
                return nova >= 4; // NOVA 4 = ultra-processed
            },
            message: 'Ultra-processed foods may lack essential nutrients'
        },
        lowProtein: {
            trigger: (nutrition) => nutrition.protein < 2,
            message: 'Low protein content - ensure adequate protein from other sources'
        },
        highCalories: {
            trigger: (nutrition) => nutrition.calories > 400,
            message: 'Very high calorie density - monitor portion sizes'
        },
        artificialAdditives: {
            trigger: (ingredients) => {
                if (!ingredients) return false;
                const artificial = ['e102', 'e110', 'e122', 'e129', 'e951', 'e952'];
                return artificial.some(code => ingredients.toLowerCase().includes(code));
            },
            message: 'Contains artificial additives - choose natural alternatives when possible'
        }
    }
};

/**
 * Nutrition safety limits for children under 6 (per 100g)
 * Sources: AAP, WHO, NHS childhood nutrition guidelines
 */
const CHILD_LIMITS = {
    // Critical limits - stricter than adults
    sugar: {
        safe: 2,           // g - Very low sugar
        moderate: 3,       // g - Occasional treats only
        avoid: 5,          // g - Too high for regular consumption
        reason: 'Excess sugar causes tooth decay and unhealthy eating habits'
    },
    salt: {
        safe: 0.1,         // g - Very low sodium
        moderate: 0.2,     // g - Acceptable
        avoid: 0.3,        // g - Too high (kidney development)
        reason: 'Young kidneys cannot process excess sodium'
    },
    fat: {
        safe: 8,           // g - Moderate healthy fats
        moderate: 10,      // g - Acceptable
        avoid: 15,         // g - Too high
        reason: 'Excess fat can lead to childhood obesity'
    },
    saturatedFat: {
        safe: 2,           // g - Low sat fat
        moderate: 3,       // g - Acceptable
        avoid: 5,          // g - Too high
        reason: 'High saturated fat affects heart health development'
    },
    fiber: {
        minimum: 2,        // g - Digestive health
        optimal: 3,        // g - Good source
        reason: 'Fiber prevents constipation and supports gut health'
    },

    // Absolutely forbidden for children
    strictlyAvoided: [
        'caffeine', 'coffee', 'tea', 'energy drink',
        'artificial sweetener', 'diet', 'zero sugar',
        'alcohol', 'raw honey', // Botulism risk <1 year
        'whole nuts', 'popcorn', // Choking hazard
        'high fructose corn syrup'
    ],

    // Warning ingredients
    cautionIngredients: [
        'chocolate', 'cocoa', // Contains some caffeine
        'artificial color', 'artificial flavour',
        'preservative', 'e-number',
        'hydrogenated', 'partially hydrogenated', // Trans fats
        'palm oil', 'corn syrup'
    ],

    // Age-specific restrictions
    ageRestrictions: {
        under1Year: [
            'honey', 'raw honey', // Botulism
            'cow milk', 'whole milk', // Digestive issues
            'egg white', // Allergy risk
            'shellfish', 'peanut' // Allergy risk
        ],
        under3Years: [
            'whole nuts', 'popcorn', 'hard candy', // Choking
            'raw vegetables', 'cherry tomatoes' // Choking
        ]
    },

    // Nutrient requirements
    essentialNutrients: {
        protein: 3,        // g - Growth and development
        calcium: 0.15,     // g (150mg) - Bone development
        iron: 0.001,       // g (1mg) - Cognitive development
        vitaminD: 0.000010 // g (10mcg) - Bone health
    },

    // Warning triggers
    warnings: {
        choking: {
            trigger: (product) => {
                const name = (product.name || '').toLowerCase();
                const chokingRisk = ['whole nut', 'popcorn', 'hard candy', 'gum', 'marshmallow'];
                return chokingRisk.some(item => name.includes(item));
            },
            message: '⚠️ CHOKING HAZARD - Not safe for children under 4 years'
        },
        allergen: {
            trigger: (allergens) => {
                const highRisk = ['peanuts', 'tree nuts', 'shellfish', 'fish'];
                return allergens && allergens.some(a => highRisk.includes(a));
            },
            message: 'Contains common allergens - introduce carefully and monitor for reactions'
        },
        lowNutrients: {
            trigger: (nutrition) => {
                return nutrition.protein < 2 && nutrition.fiber < 1;
            },
            message: 'Low nutritional value - not ideal for growing children'
        },
        ultraProcessed: {
            trigger: (product) => (product.nova || 0) >= 4,
            message: 'Ultra-processed food - choose whole foods when possible'
        }
    }
};

/**
 * General population rules metadata
 */
const POPULATION_METADATA = {
    pregnant: {
        displayName: '🤰 Pregnant Women',
        description: 'Nutritional guidance for pregnancy',
        disclaimer: 'This information is for awareness only, not medical advice. Consult your healthcare provider for personalized dietary guidance during pregnancy.',
        keyFocus: ['Low sugar', 'Low sodium', 'No caffeine', 'No alcohol', 'Nutrient-dense'],
        dataSource: 'WHO, NHS, ACOG Guidelines 2024'
    },
    child: {
        displayName: '👶 Children Under 6',
        description: 'Child-safe nutrition evaluation',
        disclaimer: 'This information is for awareness only, not medical advice. Consult your pediatrician for specific dietary advice for your child.',
        keyFocus: ['Very low sugar', 'Very low salt', 'No caffeine', 'No choking hazards', 'Age-appropriate'],
        dataSource: 'AAP, WHO, NHS Pediatric Guidelines 2024'
    }
};

/**
 * Suitability categories with visual indicators
 */
const SUITABILITY_CATEGORIES = {
    good: {
        label: 'Good Choice',
        emoji: '✅',
        color: '#10b981',
        description: 'Safe and nutritious for this population'
    },
    moderate: {
        label: 'Moderate',
        emoji: '⚠️',
        color: '#f59e0b',
        description: 'Acceptable occasionally, but monitor intake'
    },
    avoid: {
        label: 'Avoid',
        emoji: '🚫',
        color: '#ef4444',
        description: 'Not recommended for this population'
    },
    unknown: {
        label: 'Insufficient Data',
        emoji: '❓',
        color: '#9ca3af',
        description: 'Not enough information to evaluate safety'
    }
};

// Export all rules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        PREGNANT_LIMITS,
        CHILD_LIMITS,
        POPULATION_METADATA,
        SUITABILITY_CATEGORIES
    };
}

// Make available globally for browser usage
if (typeof window !== 'undefined') {
    window.PREGNANT_LIMITS = PREGNANT_LIMITS;
    window.CHILD_LIMITS = CHILD_LIMITS;
    window.POPULATION_METADATA = POPULATION_METADATA;
    window.SUITABILITY_CATEGORIES = SUITABILITY_CATEGORIES;
}

console.log('✅ Population Nutrition Rules loaded successfully');