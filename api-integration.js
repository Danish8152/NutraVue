// ============================================
// 🌐 REAL API INTEGRATION - Open Food Facts
// ============================================
// Production-ready API integration with caching, retry logic, and error handling

const API_CONFIG = {
    baseURL: 'https://world.openfoodfacts.org/api/v2',
    userAgent: 'FoodScanPro/2.0 (Enhanced Health Analysis)',
    timeout: 10000,
    maxRetries: 3,
    retryDelay: 1000
};

// In-memory cache for API responses
const apiCache = new Map();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Fetch product from Open Food Facts API with retry logic
 * @param {string} barcode - Product barcode
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} Product data with health score
 */
async function fetchProductWithHealthScore(barcode, options = {}) {
    // Check cache first
    const cacheKey = `product_${barcode}`;
    const cached = getCachedData(cacheKey);
    if (cached && !options.forceRefresh) {
        console.log('✅ Returning cached product data');
        return cached;
    }

    let lastError;
    
    // Retry logic
    for (let attempt = 1; attempt <= API_CONFIG.maxRetries; attempt++) {
        try {
            console.log(`🔄 Fetching product ${barcode} (attempt ${attempt}/${API_CONFIG.maxRetries})`);
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);

            const response = await fetch(
                `${API_CONFIG.baseURL}/product/${barcode}`,
                {
                    headers: {
                        'User-Agent': API_CONFIG.userAgent,
                        'Accept': 'application/json'
                    },
                    signal: controller.signal
                }
            );

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.status === 0 || !data.product) {
                throw new Error('PRODUCT_NOT_FOUND');
            }

            // Parse and enrich product data
            const enrichedProduct = await enrichProductData(data.product, barcode, options);

            // Cache the result
            setCachedData(cacheKey, enrichedProduct);

            console.log('✅ Product fetched and enriched successfully');
            return enrichedProduct;

        } catch (error) {
            lastError = error;
            console.warn(`⚠️ Attempt ${attempt} failed:`, error.message);

            // Don't retry on specific errors
            if (error.message === 'PRODUCT_NOT_FOUND' || error.name === 'AbortError') {
                break;
            }

            // Wait before retrying
            if (attempt < API_CONFIG.maxRetries) {
                await sleep(API_CONFIG.retryDelay * attempt);
            }
        }
    }

    // All retries failed
    throw new Error(`Failed to fetch product after ${API_CONFIG.maxRetries} attempts: ${lastError?.message || 'Unknown error'}`);
}

/**
 * Enrich product data with health scores and analysis
 * @param {Object} apiProduct - Raw API product data
 * @param {string} barcode - Product barcode
 * @param {Object} options - Enrichment options
 * @returns {Object} Enriched product data
 */
async function enrichProductData(apiProduct, barcode, options = {}) {
    // Extract and normalize nutrition data per 100g
    const nutrition = extractNutritionData(apiProduct);

    // Calculate health score (using the health-score-engine.js function)
    const healthScore = calculateHealthScore(nutrition, {
        gender: options.gender || 'male',
        isDiabetic: options.isDiabetic || false,
        activityLevel: options.activityLevel || 'moderate'
    });

    // Calculate daily values (using daily-value-calculator.js)
    const dailyValues = calculateAllDailyValues(nutrition, {
        gender: options.gender || 'male',
        profile: options.profile || 'standard'
    });

    // Generate diabetic warnings (using diabetic-warnings.js)
    const diabeticWarnings = generateDiabeticWarnings(nutrition, {
        isDiabetic: options.isDiabetic || false,
        diabeticType: options.diabeticType || 'type2'
    });

    // Extract allergens
    const allergens = extractAllergens(apiProduct);

    // Get product image
    const productImage = extractProductImage(apiProduct);

    // Build enriched product object
    return {
        // Basic product info
        name: apiProduct.product_name || apiProduct.product_name_en || 'Unknown Product',
        brand: apiProduct.brands || 'Unknown Brand',
        barcode: barcode,
        image: productImage,
        
        // Nutrition per 100g
        nutrition: nutrition,
        
        // Health analysis
        healthScore: healthScore,
        dailyValues: dailyValues,
        diabeticWarnings: diabeticWarnings,
        
        // Additional info
        allergens: allergens,
        ingredients: apiProduct.ingredients_text || apiProduct.ingredients_text_en || 'Not available',
        categories: apiProduct.categories || '',
        
        // Quality scores from API
        nutriscore: apiProduct.nutriscore_grade || null,
        nova: apiProduct.nova_group || null,
        ecoscore: apiProduct.ecoscore_grade || null,
        
        // Metadata
        metadata: {
            lastUpdated: apiProduct.last_modified_t ? new Date(apiProduct.last_modified_t * 1000) : new Date(),
            completeness: calculateCompleteness(apiProduct),
            dataQuality: assessDataQuality(nutrition),
            source: 'Open Food Facts',
            apiVersion: 'v2'
        }
    };
}

/**
 * Extract normalized nutrition data per 100g
 * @param {Object} apiProduct - API product data
 * @returns {Object} Normalized nutrition data
 */
function extractNutritionData(apiProduct) {
    const nutriments = apiProduct.nutriments || {};

    return {
        // Energy
        calories: nutriments['energy-kcal_100g'] || nutriments['energy-kcal'] || 0,
        
        // Macronutrients
        carbs: nutriments.carbohydrates_100g || nutriments.carbohydrates || 0,
        sugar: nutriments.sugars_100g || nutriments.sugars || 0,
        fat: nutriments.fat_100g || nutriments.fat || 0,
        saturatedFat: nutriments['saturated-fat_100g'] || nutriments['saturated-fat'] || 0,
        protein: nutriments.proteins_100g || nutriments.proteins || 0,
        fiber: nutriments.fiber_100g || nutriments.fiber || 0,
        
        // Minerals
        salt: nutriments.salt_100g || nutriments.salt || 0,
        sodium: nutriments.sodium_100g || nutriments.sodium || 0,
        
        // Additional nutrients
        cholesterol: nutriments.cholesterol_100g || nutriments.cholesterol || 0,
        vitamins: extractVitamins(nutriments),
        minerals: extractMinerals(nutriments)
    };
}

/**
 * Extract vitamin data
 */
function extractVitamins(nutriments) {
    return {
        a: nutriments['vitamin-a_100g'] || 0,
        c: nutriments['vitamin-c_100g'] || 0,
        d: nutriments['vitamin-d_100g'] || 0,
        e: nutriments['vitamin-e_100g'] || 0,
        b12: nutriments['vitamin-b12_100g'] || 0
    };
}

/**
 * Extract mineral data
 */
function extractMinerals(nutriments) {
    return {
        calcium: nutriments['calcium_100g'] || 0,
        iron: nutriments['iron_100g'] || 0,
        magnesium: nutriments['magnesium_100g'] || 0,
        potassium: nutriments['potassium_100g'] || 0,
        zinc: nutriments['zinc_100g'] || 0
    };
}

/**
 * Extract allergen information
 */
function extractAllergens(apiProduct) {
    const allergens = [];
    const allergenTags = apiProduct.allergens_tags || [];
    
    const allergenMap = {
        'nuts': ['nuts', 'peanuts', 'tree-nuts'],
        'dairy': ['milk', 'dairy'],
        'gluten': ['gluten', 'wheat'],
        'soy': ['soy', 'soybeans'],
        'eggs': ['eggs'],
        'fish': ['fish'],
        'shellfish': ['crustaceans', 'shellfish'],
        'sesame': ['sesame']
    };

    Object.entries(allergenMap).forEach(([allergen, tags]) => {
        if (allergenTags.some(tag => tags.some(t => tag.includes(t)))) {
            allergens.push(allergen);
        }
    });

    return allergens;
}

/**
 * Extract product image URL
 */
function extractProductImage(apiProduct) {
    // Try multiple image sources
    let imageUrl = apiProduct.image_url || apiProduct.image_front_url;
    
    if (!imageUrl && apiProduct.images && apiProduct.images.front) {
        const front = apiProduct.images.front;
        imageUrl = front.display?.en || front.display?.fr || front.small?.en || front.small?.fr;
    }

    if (!imageUrl && apiProduct.selected_images && apiProduct.selected_images.front) {
        imageUrl = apiProduct.selected_images.front.display?.en || apiProduct.selected_images.front.display?.fr;
    }

    return imageUrl || 'https://via.placeholder.com/400/6366f1/ffffff?text=No+Image';
}

/**
 * Calculate product data completeness score
 */
function calculateCompleteness(apiProduct) {
    let score = 0;
    const checks = [
        apiProduct.product_name,
        apiProduct.brands,
        apiProduct.ingredients_text,
        apiProduct.image_url,
        apiProduct.nutriments?.['energy-kcal_100g'],
        apiProduct.nutriments?.sugars_100g,
        apiProduct.nutriments?.fat_100g,
        apiProduct.nutriments?.proteins_100g,
        apiProduct.categories,
        apiProduct.nutriscore_grade
    ];

    checks.forEach(check => {
        if (check !== null && check !== undefined && check !== '') {
            score += 10;
        }
    });

    return Math.min(100, score);
}

/**
 * Assess nutrition data quality
 */
function assessDataQuality(nutrition) {
    let quality = 'excellent';
    let issues = [];

    // Check for missing critical data
    if (nutrition.calories === 0) {
        issues.push('Missing calorie information');
        quality = 'poor';
    }

    if (nutrition.sugar === 0 && nutrition.fat === 0 && nutrition.protein === 0) {
        issues.push('Missing all macronutrient data');
        quality = 'poor';
    }

    // Check for suspicious values
    if (nutrition.calories > 900) {
        issues.push('Unusually high calories (>900 kcal/100g)');
        quality = quality === 'excellent' ? 'good' : quality;
    }

    if (nutrition.sugar > 100) {
        issues.push('Invalid sugar value (>100g/100g)');
        quality = 'poor';
    }

    if (issues.length === 0) {
        return { quality: 'excellent', issues: [] };
    } else if (issues.length <= 2 && quality !== 'poor') {
        return { quality: 'good', issues };
    } else {
        return { quality, issues };
    }
}

/**
 * Search products by query
 * @param {string} query - Search query
 * @param {Object} options - Search options
 * @returns {Promise<Array>} Array of products
 */
async function searchProducts(query, options = {}) {
    const {
        page = 1,
        pageSize = 20,
        sortBy = 'popularity',
        categories = null,
        nutriscoreGrades = null
    } = options;

    try {
        let url = `${API_CONFIG.baseURL}/search?search_terms=${encodeURIComponent(query)}&page=${page}&page_size=${pageSize}&fields=product_name,brands,image_url,nutriscore_grade,nova_group,nutriments`;

        if (categories) {
            url += `&categories_tags=${encodeURIComponent(categories)}`;
        }

        if (nutriscoreGrades) {
            url += `&nutriscore_grade=${nutriscoreGrades}`;
        }

        const response = await fetch(url, {
            headers: {
                'User-Agent': API_CONFIG.userAgent
            }
        });

        if (!response.ok) {
            throw new Error(`Search failed: ${response.status}`);
        }

        const data = await response.json();
        return data.products || [];

    } catch (error) {
        console.error('Search error:', error);
        return [];
    }
}

/**
 * Fetch alternative healthier products
 * @param {string} category - Product category
 * @param {number} currentScore - Current product health score
 * @returns {Promise<Array>} Array of alternative products
 */
async function fetchHealthierAlternatives(category, currentScore) {
    try {
        if (!category) return [];

        const categorySearch = category.split(',')[0].trim();
        const products = await searchProducts('', {
            pageSize: 15,
            categories: categorySearch,
            nutriscoreGrades: 'a,b'
        });

        // Filter and score alternatives
        const alternatives = [];

        for (const product of products) {
            if (!product.product_name) continue;

            const nutrition = extractNutritionData(product);
            const healthScore = calculateHealthScore(nutrition).score;

            // Only include if better than current product
            if (healthScore > currentScore) {
                alternatives.push({
                    name: product.product_name,
                    brand: product.brands || '',
                    score: healthScore,
                    nutriscore: product.nutriscore_grade,
                    image: product.image_url || 'https://via.placeholder.com/60/10b981/ffffff?text=ALT',
                    improvement: healthScore - currentScore
                });
            }
        }

        // Sort by improvement and return top 5
        return alternatives
            .sort((a, b) => b.improvement - a.improvement)
            .slice(0, 5);

    } catch (error) {
        console.error('Error fetching alternatives:', error);
        return [];
    }
}

// ============================================
// CACHE MANAGEMENT
// ============================================

function getCachedData(key) {
    const cached = apiCache.get(key);
    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    if (age > CACHE_DURATION) {
        apiCache.delete(key);
        return null;
    }

    return cached.data;
}

function setCachedData(key, data) {
    apiCache.set(key, {
        data,
        timestamp: Date.now()
    });
}

function clearCache() {
    apiCache.clear();
    console.log('✅ API cache cleared');
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Validate barcode format
 * @param {string} barcode - Barcode to validate
 * @returns {boolean} Is valid
 */
function isValidBarcode(barcode) {
    if (!barcode || typeof barcode !== 'string') return false;
    
    // Remove spaces and validate
    const cleaned = barcode.replace(/\s/g, '');
    
    // Check if it's numeric and reasonable length (8-14 digits)
    return /^\d{8,14}$/.test(cleaned);
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        fetchProductWithHealthScore,
        searchProducts,
        fetchHealthierAlternatives,
        isValidBarcode,
        clearCache
    };
}

console.log('✅ Real API Integration loaded successfully');
