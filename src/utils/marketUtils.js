// ============================================
// SHARED MARKET UTILITIES
// ============================================

/**
 * Retourne la date actuelle en UTC pour comparaison avec les dates API
 */
export function getNowUTC() {
  return new Date();
}

/**
 * Parse une date de l'API et la compare en UTC
 * Retourne true si la date est dans le futur
 */
export function isDateInFuture(dateString) {
  if (!dateString) return true;

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return false;

    const safetyMargin = 60 * 60 * 1000; // 1 heure
    return date.getTime() > (getNowUTC().getTime() - safetyMargin);
  } catch {
    return false;
  }
}

/**
 * Encode un slug pour une URL sécurisée
 */
export function encodeSlug(slug) {
  if (!slug || typeof slug !== 'string') return '';
  return encodeURIComponent(slug);
}

/**
 * Parse sécurisé des prix - retourne null si invalide
 */
export function safeParsePrices(outcomePrices) {
  if (!outcomePrices || typeof outcomePrices !== 'string') return null;

  try {
    const prices = JSON.parse(outcomePrices);
    if (!Array.isArray(prices) || prices.length < 2) return null;

    const parsed = prices.map(p => {
      const num = parseFloat(p);
      if (isNaN(num) || num < 0 || num > 1) return null;
      return num;
    });

    if (parsed.includes(null)) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Retourne le premier marché actif et ouvert d'un event.
 */
export function getActiveMarket(event) {
  const markets = event?.markets;
  if (!markets || !Array.isArray(markets) || markets.length === 0) return null;

  for (const m of markets) {
    if (m.closed === true || m.active === false) continue;
    const prices = safeParsePrices(m.outcomePrices);
    if (prices) return m;
  }

  for (const m of markets) {
    const prices = safeParsePrices(m.outcomePrices);
    if (prices) return m;
  }

  return markets[0];
}

/**
 * Calcule les jours restants avant la fin
 */
export function getDaysUntilEnd(endDate) {
  if (!endDate) return null;

  try {
    const end = new Date(endDate);
    if (isNaN(end.getTime())) return null;

    const days = (end - new Date()) / (1000 * 60 * 60 * 24);
    return Math.max(0, days);
  } catch {
    return null;
  }
}
