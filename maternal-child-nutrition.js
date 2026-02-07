/* ============================================================
   Maternal & Child Nutrition Safety Engine
   Extension-only feature (NO UI / CSS / core JS changes)
   ============================================================ */

/* ---------- Safe DOM helpers ---------- */
const _el = (id) => document.getElementById(id) || null;
const _txt = (el, v) => el && (el.textContent = v);
const _style = (el, s) => el && Object.assign(el.style, s);

/* ---------- Constants ---------- */
const BABY_SUGAR_LIMIT = 2;     // g / 100g
const BABY_SALT_LIMIT = 0.2;    // g / 100g
const PREG_SUGAR_LIMIT = 5;
const PREG_SALT_LIMIT = 0.3;

/* ---------- Ingredient keyword checks ---------- */
const containsAny = (text = '', words = []) =>
  words.some(w => text.toLowerCase().includes(w));

/* ---------- Core evaluator ---------- */
function evaluateFoodSuitability(nutrition = {}, context = 'pregnant', meta = {}) {
  const n = {
    calories: +nutrition.calories || 0,
    sugar: +nutrition.sugar || 0,
    fat: +nutrition.fat || 0,
    salt: +nutrition.salt || 0,
    protein: +nutrition.protein || 0,
    fiber: +nutrition.fiber || 0,
    caffeine: +nutrition.caffeine || 0,
    vitaminA: +nutrition.vitaminA || 0,
    calcium: +nutrition.calcium || 0,
    iron: +nutrition.iron || 0
  };

  const ingredients = meta.ingredients || '';
  let score = 100;
  const warnings = [];

  /* ---------- BABY / CHILD UNDER 6 ---------- */
  if (context === 'baby_under_6') {
    if (n.sugar > BABY_SUGAR_LIMIT) {
      score -= 40;
      warnings.push('High sugar is not suitable for young children.');
    }
    if (n.salt > BABY_SALT_LIMIT) {
      score -= 40;
      warnings.push('Salt content exceeds safe levels for children.');
    }
    if (n.caffeine > 0 || containsAny(ingredients, ['caffeine', 'coffee', 'cola'])) {
      score = 0;
      warnings.push('Caffeine is unsafe for children.');
    }
    if (containsAny(ingredients, ['aspartame', 'sucralose', 'acesulfame'])) {
      score = 0;
      warnings.push('Artificial sweeteners are not recommended for children.');
    }

    if (n.protein >= 5) score += 5;
    if (n.calcium > 0) score += 5;
    if (n.iron > 0) score += 5;
  }

  /* ---------- PREGNANT WOMEN ---------- */
  if (context === 'pregnant') {
    if (n.vitaminA > 800) {
      score -= 40;
      warnings.push('High vitamin A may be unsafe during pregnancy.');
    }
    if (n.caffeine > 0 || containsAny(ingredients, ['caffeine', 'coffee'])) {
      score -= 30;
      warnings.push('Caffeine intake should be limited during pregnancy.');
    }
    if (n.sugar > PREG_SUGAR_LIMIT) {
      score -= 15;
      warnings.push('High sugar content — moderation advised.');
    }
    if (n.salt > PREG_SALT_LIMIT) {
      score -= 15;
      warnings.push('High sodium may not be ideal during pregnancy.');
    }

    if (n.iron > 0) score += 10;
    if (n.calcium > 0) score += 10;
    if (n.protein >= 8) score += 10;
    if (n.fiber >= 5) score += 5;
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  /* ---------- Status mapping ---------- */
  let status, emoji, color, label;

  if (score >= 80) {
    status = 'Safe';
    emoji = '✅';
    color = '#16a34a';
    label = 'Generally suitable';
  } else if (score >= 50) {
    status = 'Caution';
    emoji = '⚠️';
    color = '#f59e0b';
    label = 'Consume with caution';
  } else {
    status = 'Avoid';
    emoji = '❌';
    color = '#dc2626';
    label = 'Not recommended';
  }

  return {
    score,
    status,
    label,
    explanation:
      context === 'pregnant'
        ? 'Assessment based on common pregnancy nutrition safety guidelines.'
        : 'Assessment based on early childhood nutrition safety guidelines.',
    emoji,
    color,
    warnings
  };
}

/* ---------- UI Injection (reuse existing elements only) ---------- */
function applyMaternalChildResult(result, context) {
  const container = _el('resultsContainer');
  if (!container) return;

  container.setAttribute('data-' + context, result.status);

  _style(container, {
    border: `2px solid ${result.color}`
  });

  const info = _el('scoreRecommendation');
  _txt(
    info,
    `${result.emoji} ${context === 'pregnant' ? 'Pregnancy' : 'Child'}: ${result.label}`
  );
}

/* ---------- Non-invasive hook ---------- */
(function hookMaternalChildAnalysis() {
  if (!window.displayProduct) return;

  const original = window.displayProduct;

  window.displayProduct = function (product) {
    original(product);

    const nutrition = product?.nutrition || {};
    const meta = {
      ingredients: product?.ingredients_text || ''
    };

    const preg = evaluateFoodSuitability(nutrition, 'pregnant', meta);
    const baby = evaluateFoodSuitability(nutrition, 'baby_under_6', meta);

    applyMaternalChildResult(preg, 'pregnant');
    applyMaternalChildResult(baby, 'baby');
  };
})();
