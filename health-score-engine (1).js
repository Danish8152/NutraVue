// ============================================
// 🧠 HEALTH SCORE ENGINE - Core Algorithm
// ============================================
// Production-ready health scoring system
// Version: 2.0
// Author: FoodScan Pro Team

/**
 * Calculate comprehensive health score with advanced algorithm
 * @param {Object} nutrition - Nutrition data per 100g
 * @param {Object} options - Scoring options
 * @returns {Object} Complete health score data
 */
function calculateHealthScore(nutrition, options = {}) {
    // Normalize nutrition values
    const n = {
        calories: Math.max(0, nutrition.calories || 0),
        sugar: Math.max(0, nutrition.sugar || 0),
        fat: Math.max(0, nutrition.fat || 0),
        salt: Math.max(0, nutrition.salt || 0),
        protein: Math.max(0, nutrition.protein || 0),
        fiber: Math.max(0, nutrition.fiber || 0)
    };

    // Extract options
    const gender = options.gender || 'male';
    const isDiabetic = options.isDiabetic || false;
    const activityLevel = options.activityLevel || 'moderate'; // sedentary, moderate, active
    
    // Start with perfect score
    let score = 100;
    let penalties = [];
    let rewards = [];

    // ============================================
    // PENALTY SYSTEM - Advanced Multi-Factor
    // ============================================

    // 1. CALORIE PENALTY (0-25 points)
    if (n.calories > 200) {
        const calorieExcess = n.calories - 200;
        let caloriePenalty = 0;
        
        if (calorieExcess <= 100) {
            caloriePenalty = calorieExcess * 0.05; // 5 points max
        } else if (calorieExcess <= 200) {
            caloriePenalty = 5 + (calorieExcess - 100) * 0.08; // +8 points
        } else {
            caloriePenalty = 13 + (calorieExcess - 200) * 0.06; // +12 points max
        }
        
        caloriePenalty = Math.min(25, caloriePenalty);
        score -= caloriePenalty;
        penalties.push({
            type: 'calories',
            value: n.calories,
            penalty: caloriePenalty,
            message: `High calorie density: ${n.calories} kcal/100g`
        });
    }

    // 2. SUGAR PENALTY (0-30 points) - Most critical
    if (n.sugar > 5) {
        const sugarExcess = n.sugar - 5;
        let sugarPenalty = 0;
        
        // Progressive penalty system
        if (sugarExcess <= 5) {
            sugarPenalty = sugarExcess * 1.5; // 7.5 points max
        } else if (sugarExcess <= 15) {
            sugarPenalty = 7.5 + (sugarExcess - 5) * 1.0; // +10 points
        } else {
            sugarPenalty = 17.5 + (sugarExcess - 15) * 0.8; // +12.5 points
        }
        
        // Extra penalty for diabetics
        if (isDiabetic) {
            sugarPenalty *= 1.5;
        }
        
        sugarPenalty = Math.min(30, sugarPenalty);
        score -= sugarPenalty;
        penalties.push({
            type: 'sugar',
            value: n.sugar,
            penalty: sugarPenalty,
            message: `Sugar content: ${n.sugar.toFixed(1)}g/100g`
        });
    }

    // 3. FAT PENALTY (0-20 points)
    if (n.fat > 10) {
        const fatExcess = n.fat - 10;
        let fatPenalty = 0;
        
        if (fatExcess <= 10) {
            fatPenalty = fatExcess * 0.5; // 5 points max
        } else if (fatExcess <= 20) {
            fatPenalty = 5 + (fatExcess - 10) * 0.6; // +6 points
        } else {
            fatPenalty = 11 + (fatExcess - 20) * 0.45; // +9 points max
        }
        
        fatPenalty = Math.min(20, fatPenalty);
        score -= fatPenalty;
        penalties.push({
            type: 'fat',
            value: n.fat,
            penalty: fatPenalty,
            message: `Fat content: ${n.fat.toFixed(1)}g/100g`
        });
    }

    // 4. SALT PENALTY (0-15 points)
    if (n.salt > 0.3) {
        const saltExcess = n.salt - 0.3;
        let saltPenalty = 0;
        
        if (saltExcess <= 0.5) {
            saltPenalty = saltExcess * 8; // 4 points max
        } else if (saltExcess <= 1.5) {
            saltPenalty = 4 + (saltExcess - 0.5) * 6; // +6 points
        } else {
            saltPenalty = 10 + (saltExcess - 1.5) * 3.3; // +5 points
        }
        
        saltPenalty = Math.min(15, saltPenalty);
        score -= saltPenalty;
        penalties.push({
            type: 'salt',
            value: n.salt,
            penalty: saltPenalty,
            message: `Salt content: ${n.salt.toFixed(2)}g/100g`
        });
    }

    // 5. DANGEROUS COMBINATIONS
    // High sugar + high fat = extra penalty
    if (n.sugar > 10 && n.fat > 20) {
        const comboPenalty = 5;
        score -= comboPenalty;
        penalties.push({
            type: 'combination',
            value: 'sugar+fat',
            penalty: comboPenalty,
            message: 'High sugar & fat combination'
        });
    }

    // Very high calorie + high sugar = metabolic risk
    if (n.calories > 400 && n.sugar > 15) {
        const metabolicPenalty = 5;
        score -= metabolicPenalty;
        penalties.push({
            type: 'metabolic',
            value: 'calories+sugar',
            penalty: metabolicPenalty,
            message: 'High metabolic impact'
        });
    }

    // ============================================
    // REWARD SYSTEM - Positive Reinforcement
    // ============================================

    // 1. PROTEIN REWARD (0-10 points)
    if (n.protein >= 8) {
        let proteinBonus = 0;
        
        if (n.protein >= 20) {
            proteinBonus = 10; // Excellent protein
        } else if (n.protein >= 15) {
            proteinBonus = 8; // Very good protein
        } else if (n.protein >= 10) {
            proteinBonus = 5; // Good protein
        } else {
            proteinBonus = 3; // Moderate protein
        }
        
        score += proteinBonus;
        rewards.push({
            type: 'protein',
            value: n.protein,
            bonus: proteinBonus,
            message: `Good protein: ${n.protein.toFixed(1)}g/100g`
        });
    }

    // 2. FIBER REWARD (0-10 points)
    if (n.fiber >= 5) {
        let fiberBonus = 0;
        
        if (n.fiber >= 15) {
            fiberBonus = 10; // Excellent fiber
        } else if (n.fiber >= 10) {
            fiberBonus = 8; // Very good fiber
        } else if (n.fiber >= 7) {
            fiberBonus = 5; // Good fiber
        } else {
            fiberBonus = 3; // Moderate fiber
        }
        
        score += fiberBonus;
        rewards.push({
            type: 'fiber',
            value: n.fiber,
            bonus: fiberBonus,
            message: `High fiber: ${n.fiber.toFixed(1)}g/100g`
        });
    }

    // 3. LOW CALORIE BONUS
    if (n.calories < 100 && n.protein >= 5) {
        const lowCalBonus = 5;
        score += lowCalBonus;
        rewards.push({
            type: 'lowcal',
            value: n.calories,
            bonus: lowCalBonus,
            message: 'Low calorie, good protein balance'
        });
    }

    // 4. OPTIMAL NUTRIENT PROFILE BONUS
    const optimalProfile = n.sugar < 5 && n.fat < 10 && n.salt < 0.5 && n.protein >= 10 && n.fiber >= 5;
    if (optimalProfile) {
        const perfectBonus = 5;
        score += perfectBonus;
        rewards.push({
            type: 'optimal',
            value: 'perfect',
            bonus: perfectBonus,
            message: 'Optimal nutrient balance!'
        });
    }

    // ============================================
    // SCORE CLAMPING & GRADING
    // ============================================
    
    score = Math.max(0, Math.min(100, Math.round(score)));

    // Determine grade
    let grade, label, emoji, color;
    
    if (score >= 90) {
        grade = 'A+';
        label = 'Excellent';
        emoji = '🌟';
        color = '#10b981';
    } else if (score >= 80) {
        grade = 'A';
        label = 'Very Good';
        emoji = '✅';
        color = '#22c55e';
    } else if (score >= 70) {
        grade = 'B';
        label = 'Good';
        emoji = '👍';
        color = '#84cc16';
    } else if (score >= 60) {
        grade = 'C';
        label = 'Fair';
        emoji = '⚠️';
        color = '#f59e0b';
    } else if (score >= 50) {
        grade = 'D';
        label = 'Poor';
        emoji = '⚠️';
        color = '#f97316';
    } else {
        grade = 'F';
        label = 'Very Poor';
        emoji = '❌';
        color = '#ef4444';
    }

    // ============================================
    // RECOMMENDATIONS
    // ============================================
    
    const recommendation = generateRecommendation(score, n, penalties, rewards, isDiabetic);
    const diabeticWarning = generateDiabeticWarning(n, isDiabetic);

    // ============================================
    // RETURN COMPLETE HEALTH DATA
    // ============================================
    
    return {
        score,
        grade,
        label,
        emoji,
        color,
        recommendation,
        diabeticWarning,
        penalties,
        rewards,
        nutritionProfile: {
            calories: n.calories,
            sugar: n.sugar,
            fat: n.fat,
            salt: n.salt,
            protein: n.protein,
            fiber: n.fiber
        },
        metadata: {
            totalPenalties: penalties.reduce((sum, p) => sum + p.penalty, 0),
            totalRewards: rewards.reduce((sum, r) => sum + r.bonus, 0),
            version: '2.0',
            timestamp: new Date().toISOString()
        }
    };
}

/**
 * Generate personalized recommendation
 */
function generateRecommendation(score, nutrition, penalties, rewards, isDiabetic) {
    if (score >= 85) {
        return "Excellent choice! This food has an outstanding nutritional profile. Perfect for a healthy diet.";
    } else if (score >= 70) {
        return "Good choice! A nutritious option that fits well in a balanced diet. Enjoy in moderation.";
    } else if (score >= 55) {
        const mainIssues = penalties
            .sort((a, b) => b.penalty - a.penalty)
            .slice(0, 2)
            .map(p => p.type)
            .join(' and ');
        return `Fair choice. Watch out for ${mainIssues} content. Consider healthier alternatives when possible.`;
    } else {
        const criticalIssues = penalties
            .filter(p => p.penalty > 10)
            .map(p => p.type)
            .join(', ');
        return `⚠️ Not recommended for regular consumption. High in ${criticalIssues}. ${isDiabetic ? 'Not suitable for diabetic diet.' : 'Choose healthier alternatives.'}`;
    }
}

/**
 * Generate diabetic-specific warnings
 */
function generateDiabeticWarning(nutrition, isDiabetic) {
    if (!isDiabetic) return null;

    const sugar = nutrition.sugar;
    
    if (sugar > 15) {
        return "🚫 CRITICAL: Very high sugar content. May cause severe blood glucose spike. Avoid completely.";
    } else if (sugar > 10) {
        return "⚠️ WARNING: High sugar content. Will significantly raise blood glucose levels. Not recommended.";
    } else if (sugar > 5) {
        return "⚡ CAUTION: Moderate sugar content. Monitor blood glucose if consumed. Limit portion size.";
    } else if (sugar < 3 && nutrition.calories < 200) {
        return "✅ SAFE: Diabetic-friendly option. Low sugar and moderate calories.";
    }
    
    return null;
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { calculateHealthScore };
}

console.log('✅ Health Score Engine v2.0 loaded successfully');
