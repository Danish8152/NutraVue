// ============================================
// 🎨 UI INTEGRATION MODULE
// ============================================
// Seamless integration with existing UI without HTML/CSS modifications
// Updates DOM elements dynamically using JavaScript only

/**
 * Main UI Integration Class
 */
class HealthUIIntegration {
    constructor() {
        this.elements = this.cacheElements();
        this.animations = {
            duration: 600,
            easing: 'cubic-bezier(0.4, 0.0, 0.2, 1)'
        };
    }

    /**
     * Cache all DOM elements (fail-safe)
     */
    cacheElements() {
        const ids = [
            'scoreCircle', 'scoreNumber', 'scoreLabel', 'scoreEmoji',
            'scoreRecommendation', 'nutritionGrid', 'warningsList',
            'warningsCard', 'warningCount', 'productName', 'productBrand',
            'productImage', 'productBarcode', 'insightsList'
        ];

        const elements = {};
        ids.forEach(id => {
            elements[id] = document.getElementById(id);
        });

        // Query selector elements
        elements.scoreGrade = document.querySelector('.grade-value');
        elements.percentileValue = document.getElementById('percentileValue');

        return elements;
    }

    /**
     * Main display function - updates entire UI with health data
     * @param {Object} product - Enriched product data
     * @param {Object} options - Display options
     */
    displayHealthAnalysis(product, options = {}) {
        if (!product || !product.nutrition) {
            console.warn('Invalid product data');
            return;
        }

        const { healthScore, dailyValues, diabeticWarnings, nutrition } = product;

        // 1. Update health score display
        this.updateHealthScore(healthScore);

        // 2. Update nutrition grid with daily values
        this.updateNutritionGrid(nutrition, dailyValues, options);

        // 3. Display warnings (including diabetic warnings)
        this.updateWarnings(diabeticWarnings);

        // 4. Update AI insights
        this.updateInsights(healthScore, nutrition, options);

        // 5. Apply dynamic visual feedback
        this.applyVisualFeedback(healthScore);

        // 6. Animate entry
        if (options.animate !== false) {
            this.animateEntry();
        }
    }

    /**
     * Update health score display
     */
    updateHealthScore(healthScore) {
        const { score, grade, label, emoji, color, recommendation } = healthScore;

        // Update score number with animation
        if (this.elements.scoreNumber) {
            this.animateNumber(this.elements.scoreNumber, 0, score, 1000);
            this.elements.scoreNumber.style.color = color;
        }

        // Update score label
        if (this.elements.scoreLabel) {
            this.elements.scoreLabel.textContent = label;
            this.elements.scoreLabel.style.color = color;
        }

        // Update emoji
        if (this.elements.scoreEmoji) {
            this.elements.scoreEmoji.textContent = emoji;
            this.elements.scoreEmoji.style.transform = 'scale(0)';
            setTimeout(() => {
                this.elements.scoreEmoji.style.transform = 'scale(1)';
                this.elements.scoreEmoji.style.transition = 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
            }, 300);
        }

        // Update grade
        if (this.elements.scoreGrade) {
            this.elements.scoreGrade.textContent = grade;
            this.elements.scoreGrade.style.backgroundColor = color;
            this.elements.scoreGrade.style.color = '#fff';
            this.elements.scoreGrade.style.boxShadow = `0 4px 12px ${color}40`;
        }

        // Update recommendation
        if (this.elements.scoreRecommendation) {
            this.elements.scoreRecommendation.textContent = recommendation;
            this.elements.scoreRecommendation.style.color = '#374151';
        }

        // Update circle border
        if (this.elements.scoreCircle) {
            this.elements.scoreCircle.style.borderColor = color;
            this.elements.scoreCircle.style.boxShadow = `0 0 30px ${color}30, 0 0 60px ${color}15`;
            this.elements.scoreCircle.style.transition = 'all 0.6s ease';
        }

        // Calculate and update percentile (mock for now)
        if (this.elements.percentileValue) {
            const percentile = Math.min(99, Math.floor(score * 0.95));
            this.elements.percentileValue.textContent = `${percentile}th`;
        }
    }

    /**
     * Update nutrition grid with daily values
     */
    updateNutritionGrid(nutrition, dailyValues, options = {}) {
        if (!this.elements.nutritionGrid) return;

        const gender = options.gender || 'male';
        const genderSymbol = gender === 'male' ? '♂' : '♀';

        const items = [
            { key: 'calories', label: 'Calories', icon: '🔥', unit: 'kcal', max: 500 },
            { key: 'sugar', label: 'Sugar', icon: '�', unit: 'g', max: 25 },
            { key: 'fat', label: 'Fat', icon: '🧈', unit: 'g', max: 30 },
            { key: 'salt', label: 'Salt', icon: '🧂', unit: 'g', max: 2 },
            { key: 'protein', label: 'Protein', icon: '💪', unit: 'g', max: 20, positive: true },
            { key: 'fiber', label: 'Fiber', icon: '🌾', unit: 'g', max: 10, positive: true }
        ];

        this.elements.nutritionGrid.innerHTML = items.map(item => {
            const value = nutrition[item.key] || 0;
            const dv = dailyValues.dailyValues[item.key];
            
            // Calculate bar percentage
            const barPercentage = Math.min(100, (value / item.max) * 100);
            const barClass = item.positive 
                ? 'positive' 
                : (barPercentage > 80 ? 'danger' : barPercentage > 50 ? 'warning' : 'good');

            return `
                <div class="nutrition-item" style="transition: all 0.3s ease;">
                    <div class="nutrition-header">
                        <span class="nutrition-icon">${item.icon}</span>
                        <span class="nutrition-label">${item.label}</span>
                        <span class="nutrition-value">${value.toFixed(1)}${item.unit}</span>
                    </div>
                    <div class="nutrition-bar">
                        <div class="nutrition-fill ${barClass}" 
                             style="width: ${barPercentage}%; transition: width 0.8s ease;"></div>
                    </div>
                    ${dv ? `
                        <div style="
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                            margin-top: 8px;
                            padding-top: 6px;
                            border-top: 1px solid #e5e7eb;
                        ">
                            <span style="
                                color: ${dv.color};
                                font-size: 0.75rem;
                                font-weight: 700;
                                display: flex;
                                align-items: center;
                                gap: 4px;
                            ">
                                ${dv.icon} ${dv.percentage}% DV ${genderSymbol}
                            </span>
                            <span style="
                                color: ${dv.color};
                                font-size: 0.7rem;
                                font-weight: 600;
                                opacity: 0.8;
                                text-transform: uppercase;
                                letter-spacing: 0.5px;
                            ">
                                ${dv.category}
                            </span>
                        </div>
                        <div style="
                            margin-top: 4px;
                            font-size: 0.7rem;
                            color: #6b7280;
                            font-style: italic;
                        ">
                            ${dv.recommendation}
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
    }

    /**
     * Update warnings display
     */
    updateWarnings(diabeticWarnings) {
        if (!this.elements.warningsList || !diabeticWarnings) return;

        // Clear existing warnings
        this.elements.warningsList.innerHTML = '';

        if (diabeticWarnings.length === 0) {
            if (this.elements.warningsCard) {
                this.elements.warningsCard.style.display = 'none';
            }
            return;
        }

        // Add warnings
        diabeticWarnings.forEach((warning, index) => {
            const warningEl = document.createElement('div');
            warningEl.className = 'warning-item';
            warningEl.style.cssText = `
                background-color: ${warning.bgColor};
                border-left: 4px solid ${warning.color};
                padding: 14px 16px;
                margin: 10px 0;
                border-radius: 8px;
                opacity: 0;
                transform: translateX(-20px);
                animation: slideIn 0.4s ease forwards;
                animation-delay: ${index * 0.1}s;
            `;

            warningEl.innerHTML = `
                <div style="display: flex; align-items: flex-start; gap: 12px;">
                    <span style="
                        font-size: 28px; 
                        line-height: 1;
                        filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
                    ">${warning.icon}</span>
                    <div style="flex: 1;">
                        <div style="
                            font-weight: 700;
                            color: ${warning.color};
                            margin-bottom: 6px;
                            font-size: 0.95rem;
                            letter-spacing: 0.3px;
                        ">
                            ${warning.title}
                        </div>
                        <div style="
                            color: #1f2937;
                            margin-bottom: 6px;
                            font-size: 0.9rem;
                            font-weight: 500;
                            line-height: 1.5;
                        ">
                            ${warning.message}
                        </div>
                        ${warning.detail ? `
                            <div style="
                                color: #4b5563;
                                font-size: 0.85rem;
                                margin-bottom: 8px;
                                line-height: 1.4;
                            ">
                                ${warning.detail}
                            </div>
                        ` : ''}
                        ${warning.impact ? `
                            <div style="
                                background-color: rgba(0,0,0,0.06);
                                padding: 8px 12px;
                                border-radius: 6px;
                                font-size: 0.8rem;
                                color: #111827;
                                margin-bottom: 8px;
                                font-weight: 500;
                            ">
                                <strong>Expected Impact:</strong> ${warning.impact}
                            </div>
                        ` : ''}
                        ${warning.action ? `
                            <div style="
                                color: ${warning.color};
                                font-size: 0.85rem;
                                font-weight: 700;
                                margin-top: 8px;
                                display: flex;
                                align-items: center;
                                gap: 6px;
                            ">
                                <span style="font-size: 1.1rem;">➤</span>
                                ${warning.action}
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;

            this.elements.warningsList.appendChild(warningEl);
        });

        // Update warning count
        if (this.elements.warningCount) {
            this.elements.warningCount.textContent = diabeticWarnings.length;
        }

        // Show warnings card
        if (this.elements.warningsCard) {
            this.elements.warningsCard.style.display = 'block';
        }

        // Add slide-in animation if not already present
        if (!document.getElementById('warning-animations')) {
            const style = document.createElement('style');
            style.id = 'warning-animations';
            style.textContent = `
                @keyframes slideIn {
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }

    /**
     * Update AI insights
     */
    updateInsights(healthScore, nutrition, options = {}) {
        if (!this.elements.insightsList) return;

        const insights = this.generateInsights(healthScore, nutrition, options);
        
        this.elements.insightsList.innerHTML = insights.map((insight, index) => `
            <div class="insight-item" style="
                opacity: 0;
                animation: fadeInUp 0.5s ease forwards;
                animation-delay: ${index * 0.15}s;
            ">
                <div class="insight-icon" style="font-size: 28px;">${insight.icon}</div>
                <div class="insight-content">
                    <div class="insight-title" style="font-weight: 700; color: #1f2937; margin-bottom: 4px;">
                        ${insight.title}
                    </div>
                    <div class="insight-text" style="color: #6b7280; font-size: 0.9rem; line-height: 1.5;">
                        ${insight.text}
                    </div>
                </div>
            </div>
        `).join('');

        // Add fade-in animation
        if (!document.getElementById('insight-animations')) {
            const style = document.createElement('style');
            style.id = 'insight-animations';
            style.textContent = `
                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }

    /**
     * Generate AI insights based on nutrition data
     */
    generateInsights(healthScore, nutrition, options) {
        const insights = [];
        const { score, penalties, rewards } = healthScore;

        // Positive insights
        if (score >= 85) {
            insights.push({
                icon: '🌟',
                title: 'Outstanding Choice',
                text: 'This product has an excellent nutritional profile. Perfect for daily consumption.'
            });
        }

        if (rewards && rewards.length > 0) {
            const bestReward = rewards.sort((a, b) => b.bonus - a.bonus)[0];
            insights.push({
                icon: '✨',
                title: `Rich in ${bestReward.type.charAt(0).toUpperCase() + bestReward.type.slice(1)}`,
                text: bestReward.message
            });
        }

        // Concerns
        if (penalties && penalties.length > 0) {
            const topPenalty = penalties.sort((a, b) => b.penalty - a.penalty)[0];
            if (topPenalty.penalty > 10) {
                insights.push({
                    icon: '⚠️',
                    title: `Watch ${topPenalty.type.charAt(0).toUpperCase() + topPenalty.type.slice(1)}`,
                    text: topPenalty.message
                });
            }
        }

        // Comparative insights
        if (score < 60) {
            insights.push({
                icon: '🔄',
                title: 'Consider Alternatives',
                text: 'Look for healthier options with better nutritional balance.'
            });
        }

        // Diabetic-specific
        if (options.isDiabetic && nutrition.sugar < 5) {
            insights.push({
                icon: '✅',
                title: 'Diabetic Friendly',
                text: 'Low sugar content makes this suitable for diabetic diets.'
            });
        }

        return insights.slice(0, 4); // Limit to 4 insights
    }

    /**
     * Apply visual feedback based on health score
     */
    applyVisualFeedback(healthScore) {
        const { color, score } = healthScore;

        // Update score circle glow
        if (this.elements.scoreCircle) {
            this.elements.scoreCircle.style.borderColor = color;
            this.elements.scoreCircle.style.boxShadow = `
                0 0 0 4px ${color}15,
                0 0 20px ${color}30,
                0 0 40px ${color}20,
                0 4px 20px rgba(0,0,0,0.1)
            `;
        }

        // Pulse animation for excellent scores
        if (score >= 85 && this.elements.scoreCircle) {
            this.elements.scoreCircle.style.animation = 'pulse 2s ease-in-out infinite';
            
            if (!document.getElementById('pulse-animation')) {
                const style = document.createElement('style');
                style.id = 'pulse-animation';
                style.textContent = `
                    @keyframes pulse {
                        0%, 100% { transform: scale(1); }
                        50% { transform: scale(1.02); }
                    }
                `;
                document.head.appendChild(style);
            }
        }
    }

    /**
     * Animate number counting
     */
    animateNumber(element, start, end, duration) {
        const startTime = Date.now();
        const range = end - start;

        const updateNumber = () => {
            const now = Date.now();
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function
            const easeOutQuad = progress * (2 - progress);
            const current = Math.round(start + (range * easeOutQuad));
            
            element.textContent = current;

            if (progress < 1) {
                requestAnimationFrame(updateNumber);
            }
        };

        updateNumber();
    }

    /**
     * Animate entry of results
     */
    animateEntry() {
        const elements = [
            this.elements.scoreCircle,
            this.elements.nutritionGrid,
            this.elements.warningsCard
        ].filter(el => el);

        elements.forEach((el, index) => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                el.style.transition = 'all 0.6s cubic-bezier(0.4, 0.0, 0.2, 1)';
                el.style.opacity = '1';
                el.style.transform = 'translateY(0)';
            }, index * 150);
        });
    }
}

// Create global instance
const healthUI = new HealthUIIntegration();

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { HealthUIIntegration, healthUI };
}

console.log('✅ UI Integration Module loaded successfully');
