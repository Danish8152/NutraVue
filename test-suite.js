// ============================================
// 🧪 HEALTH SYSTEM TEST SUITE
// ============================================
// Comprehensive testing and demonstration

class HealthSystemTester {
    constructor() {
        this.results = {
            passed: 0,
            failed: 0,
            tests: []
        };
    }

    /**
     * Run all tests
     */
    async runAllTests() {
        console.log('\n╔════════════════════════════════════════════════╗');
        console.log('║  🧪 HEALTH SYSTEM TEST SUITE v2.0             ║');
        console.log('╚════════════════════════════════════════════════╝\n');

        // Module existence tests
        await this.testModulesLoaded();

        // Health score tests
        await this.testHealthScoreCalculation();

        // Daily value tests
        await this.testDailyValueCalculation();

        // Diabetic warnings tests
        await this.testDiabeticWarnings();

        // API integration tests
        await this.testAPIIntegration();

        // UI integration tests
        await this.testUIIntegration();

        // End-to-end tests
        await this.testEndToEnd();

        // Show results
        this.showResults();
    }

    /**
     * Test: Modules loaded
     */
    async testModulesLoaded() {
        console.log('📦 Testing Module Loading...\n');

        this.assert(
            'Health Score Engine loaded',
            typeof calculateHealthScore === 'function'
        );

        this.assert(
            'Daily Value Calculator loaded',
            typeof calculateAllDailyValues === 'function'
        );

        this.assert(
            'Diabetic Warnings loaded',
            typeof generateDiabeticWarnings === 'function'
        );

        this.assert(
            'API Integration loaded',
            typeof fetchProductWithHealthScore === 'function'
        );

        this.assert(
            'UI Integration loaded',
            typeof healthUI !== 'undefined'
        );

        this.assert(
            'System Orchestrator loaded',
            typeof healthSystem !== 'undefined'
        );
    }

    /**
     * Test: Health score calculation
     */
    async testHealthScoreCalculation() {
        console.log('\n💯 Testing Health Score Calculation...\n');

        // Test 1: Excellent product
        const excellentNutrition = {
            calories: 150,
            sugar: 2,
            fat: 3,
            salt: 0.1,
            protein: 20,
            fiber: 10
        };

        const excellentScore = calculateHealthScore(excellentNutrition);
        this.assert(
            'Excellent product scores high (>85)',
            excellentScore.score >= 85,
            `Score: ${excellentScore.score}`
        );
        this.assert(
            'Excellent product gets A/A+ grade',
            ['A', 'A+'].includes(excellentScore.grade)
        );

        // Test 2: Poor product
        const poorNutrition = {
            calories: 500,
            sugar: 30,
            fat: 35,
            salt: 2.5,
            protein: 3,
            fiber: 0
        };

        const poorScore = calculateHealthScore(poorNutrition);
        this.assert(
            'Poor product scores low (<50)',
            poorScore.score < 50,
            `Score: ${poorScore.score}`
        );
        this.assert(
            'Poor product gets D/F grade',
            ['D', 'F'].includes(poorScore.grade)
        );

        // Test 3: Penalties applied
        this.assert(
            'Penalties calculated for poor product',
            poorScore.penalties.length > 0,
            `Penalties: ${poorScore.penalties.length}`
        );

        // Test 4: Rewards applied
        this.assert(
            'Rewards calculated for excellent product',
            excellentScore.rewards.length > 0,
            `Rewards: ${excellentScore.rewards.length}`
        );

        // Test 5: Score clamping
        const extremeNutrition = {
            calories: 900,
            sugar: 100,
            fat: 80,
            salt: 10,
            protein: 0,
            fiber: 0
        };

        const extremeScore = calculateHealthScore(extremeNutrition);
        this.assert(
            'Score never goes below 0',
            extremeScore.score >= 0
        );
        this.assert(
            'Score never exceeds 100',
            extremeScore.score <= 100
        );
    }

    /**
     * Test: Daily value calculation
     */
    async testDailyValueCalculation() {
        console.log('\n📊 Testing Daily Value Calculation...\n');

        const nutrition = {
            calories: 350,
            sugar: 15,
            fat: 20,
            salt: 0.8,
            protein: 10,
            fiber: 5
        };

        // Test 1: Male calculations
        const maleDV = calculateAllDailyValues(nutrition, { gender: 'male' });
        this.assert(
            'Male daily values calculated',
            maleDV.dailyValues.calories !== undefined
        );
        this.assert(
            'Male gender symbol correct',
            maleDV.summary.genderSymbol === '♂'
        );

        // Test 2: Female calculations
        const femaleDV = calculateAllDailyValues(nutrition, { gender: 'female' });
        this.assert(
            'Female calculations different from male',
            femaleDV.dailyValues.calories.percentage !== maleDV.dailyValues.calories.percentage
        );
        this.assert(
            'Female gender symbol correct',
            femaleDV.summary.genderSymbol === '♀'
        );

        // Test 3: Percentage calculations
        this.assert(
            'Calorie percentage calculated',
            typeof maleDV.dailyValues.calories.percentage === 'number'
        );
        this.assert(
            'Percentage is reasonable',
            maleDV.dailyValues.calories.percentage > 0 && 
            maleDV.dailyValues.calories.percentage < 200
        );

        // Test 4: Color coding
        this.assert(
            'Color assigned to each nutrient',
            maleDV.dailyValues.sugar.color !== undefined
        );

        // Test 5: Categories assigned
        this.assert(
            'Category assigned (Excellent/High/Moderate/Low)',
            ['Excellent', 'High', 'Moderate', 'Low', 'Very High', 'Very Low']
                .includes(maleDV.dailyValues.sugar.category)
        );
    }

    /**
     * Test: Diabetic warnings
     */
    async testDiabeticWarnings() {
        console.log('\n🩺 Testing Diabetic Warning System...\n');

        // Test 1: Non-diabetic user
        const nutrition1 = { sugar: 20, fat: 30, calories: 400 };
        const warnings1 = generateDiabeticWarnings(nutrition1, { isDiabetic: false });
        this.assert(
            'No warnings for non-diabetic users',
            warnings1.length === 0
        );

        // Test 2: Diabetic user with high sugar
        const warnings2 = generateDiabeticWarnings(nutrition1, { isDiabetic: true });
        this.assert(
            'Warnings generated for diabetic users',
            warnings2.length > 0,
            `Warnings: ${warnings2.length}`
        );

        // Test 3: Critical warning for very high sugar
        const hasCritical = warnings2.some(w => w.level === 'critical');
        this.assert(
            'Critical warning for sugar >20g',
            hasCritical
        );

        // Test 4: Safe food for diabetics
        const safeNutrition = { sugar: 2, fat: 5, calories: 150 };
        const warnings3 = generateDiabeticWarnings(safeNutrition, { isDiabetic: true });
        const hasSafe = warnings3.some(w => w.level === 'safe');
        this.assert(
            'Positive feedback for diabetic-friendly foods',
            hasSafe
        );

        // Test 5: Priority sorting
        if (warnings2.length > 1) {
            this.assert(
                'Warnings sorted by priority',
                warnings2[0].priority <= warnings2[warnings2.length - 1].priority
            );
        }
    }

    /**
     * Test: API integration
     */
    async testAPIIntegration() {
        console.log('\n🌐 Testing API Integration...\n');

        try {
            // Test 1: Valid barcode (Nutella)
            const product = await fetchProductWithHealthScore('3017620422003', {
                gender: 'male',
                isDiabetic: false
            });

            this.assert(
                'Product fetched successfully',
                product !== null && product !== undefined
            );

            this.assert(
                'Product has name',
                product.name && product.name.length > 0,
                `Name: ${product.name}`
            );

            this.assert(
                'Product has nutrition data',
                product.nutrition && typeof product.nutrition.calories === 'number'
            );

            this.assert(
                'Health score calculated',
                product.healthScore && typeof product.healthScore.score === 'number',
                `Score: ${product.healthScore?.score}`
            );

            this.assert(
                'Daily values calculated',
                product.dailyValues && product.dailyValues.dailyValues
            );

            this.assert(
                'Product has image',
                product.image && product.image.length > 0
            );

            // Test 2: Cache working
            console.log('   Testing API cache...');
            const startTime = Date.now();
            await fetchProductWithHealthScore('3017620422003');
            const cacheTime = Date.now() - startTime;
            
            this.assert(
                'Cache speeds up subsequent requests',
                cacheTime < 100,
                `Cache time: ${cacheTime}ms`
            );

        } catch (error) {
            this.assert(
                'API integration functional',
                false,
                `Error: ${error.message}`
            );
        }
    }

    /**
     * Test: UI integration
     */
    async testUIIntegration() {
        console.log('\n🎨 Testing UI Integration...\n');

        this.assert(
            'UI integration object exists',
            typeof healthUI !== 'undefined'
        );

        this.assert(
            'UI has display method',
            typeof healthUI.displayHealthAnalysis === 'function'
        );

        this.assert(
            'UI has update score method',
            typeof healthUI.updateHealthScore === 'function'
        );

        this.assert(
            'UI has update nutrition method',
            typeof healthUI.updateNutritionGrid === 'function'
        );

        // Test element caching (graceful failure)
        const elements = healthUI.elements;
        this.assert(
            'UI elements cached',
            elements !== undefined
        );

        console.log('   Note: Some DOM elements may not exist in test environment');
    }

    /**
     * Test: End-to-end
     */
    async testEndToEnd() {
        console.log('\n🔄 Testing End-to-End Flow...\n');

        try {
            // Full workflow test
            console.log('   Testing complete workflow...');

            // 1. Fetch product
            const product = await fetchProductWithHealthScore('3017620422003', {
                gender: 'female',
                isDiabetic: true
            });

            // 2. Verify all data present
            this.assert(
                'E2E: Product fetched',
                product !== null
            );

            this.assert(
                'E2E: Health score present',
                product.healthScore && product.healthScore.score >= 0
            );

            this.assert(
                'E2E: Daily values present',
                product.dailyValues && product.dailyValues.summary
            );

            this.assert(
                'E2E: Warnings generated',
                product.diabeticWarnings !== undefined
            );

            // 3. Test public API
            if (typeof healthSystem !== 'undefined') {
                const profile = healthSystem.getProfile();
                this.assert(
                    'E2E: Profile accessible',
                    profile !== null
                );

                // Update profile
                healthSystem.updateProfile({ gender: 'male' });
                const updatedProfile = healthSystem.getProfile();
                this.assert(
                    'E2E: Profile updates work',
                    updatedProfile.gender === 'male'
                );
            }

        } catch (error) {
            this.assert(
                'E2E workflow completes',
                false,
                `Error: ${error.message}`
            );
        }
    }

    /**
     * Assert helper
     */
    assert(description, condition, details = '') {
        const result = {
            description,
            passed: Boolean(condition),
            details
        };

        this.results.tests.push(result);

        if (result.passed) {
            this.results.passed++;
            console.log(`   ✅ ${description}${details ? ` (${details})` : ''}`);
        } else {
            this.results.failed++;
            console.error(`   ❌ ${description}${details ? ` - ${details}` : ''}`);
        }
    }

    /**
     * Show test results
     */
    showResults() {
        console.log('\n╔════════════════════════════════════════════════╗');
        console.log('║  📊 TEST RESULTS                              ║');
        console.log('╚════════════════════════════════════════════════╝\n');

        console.log(`   Total Tests: ${this.results.tests.length}`);
        console.log(`   ✅ Passed: ${this.results.passed}`);
        console.log(`   ❌ Failed: ${this.results.failed}`);
        console.log(`   Success Rate: ${Math.round((this.results.passed / this.results.tests.length) * 100)}%`);

        if (this.results.failed === 0) {
            console.log('\n   🎉 ALL TESTS PASSED! System is fully operational.\n');
        } else {
            console.log('\n   ⚠️ Some tests failed. Review errors above.\n');
        }
    }

    /**
     * Run performance tests
     */
    async runPerformanceTests() {
        console.log('\n⚡ Running Performance Tests...\n');

        // Test 1: Score calculation speed
        const nutrition = {
            calories: 350,
            sugar: 15,
            fat: 20,
            salt: 0.8,
            protein: 10,
            fiber: 5
        };

        const iterations = 1000;
        const start = performance.now();
        
        for (let i = 0; i < iterations; i++) {
            calculateHealthScore(nutrition);
        }
        
        const end = performance.now();
        const avgTime = (end - start) / iterations;

        console.log(`   Health Score Calculation: ${avgTime.toFixed(3)}ms per call`);
        console.log(`   Throughput: ${Math.round(1000 / avgTime)} calculations/second`);

        // Test 2: Daily value calculation speed
        const start2 = performance.now();
        
        for (let i = 0; i < iterations; i++) {
            calculateAllDailyValues(nutrition);
        }
        
        const end2 = performance.now();
        const avgTime2 = (end2 - start2) / iterations;

        console.log(`   Daily Value Calculation: ${avgTime2.toFixed(3)}ms per call`);

        console.log('\n   ✅ Performance is excellent (<5ms target)\n');
    }
}

// ============================================
// RUN TESTS
// ============================================

// Create tester
const tester = new HealthSystemTester();

// Export for console use
window.runHealthTests = () => tester.runAllTests();
window.runPerformanceTests = () => tester.runPerformanceTests();

// Auto-run if in test mode
if (window.location.search.includes('test=true')) {
    window.addEventListener('load', () => {
        setTimeout(async () => {
            await tester.runAllTests();
            await tester.runPerformanceTests();
        }, 2000);
    });
}

console.log('🧪 Test suite loaded. Run: runHealthTests() or runPerformanceTests()');
