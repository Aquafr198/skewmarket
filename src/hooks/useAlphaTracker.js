import { useState, useCallback, useMemo } from 'react';

const STORAGE_KEY = 'skewmarket_alpha_log';
const MAX_ENTRIES = 50;
const MAX_AGE_DAYS = 30;

function loadEntries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const cutoff = Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
    return parsed.filter(e => e && e.detectedAt && new Date(e.detectedAt).getTime() > cutoff);
  } catch {
    return [];
  }
}

function saveEntries(entries) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // localStorage plein ou indisponible — on continue en mémoire
  }
}

/**
 * Hook pour tracker les edges détectés et suivre leur résolution.
 *
 * @returns {{
 *   alphaEntries: Array,
 *   stats: { totalEdges: number, resolvedCount: number, winRate: string, avgResolutionDays: string, totalTheoreticalProfit: string },
 *   trackEdge: (event: object, mispricing: object) => void,
 *   updatePrices: (events: Array) => void
 * }}
 */
export default function useAlphaTracker() {
  const [entries, setEntries] = useState(loadEntries);

  const trackEdge = useCallback((event, mispricing) => {
    if (!event || !mispricing || mispricing.edge <= 0.5) return;

    const id = event.id || event.slug;
    if (!id) return;

    setEntries(prev => {
      // Pas de doublon
      if (prev.some(e => e.id === id)) return prev;

      const market = event.markets?.[0];
      let yesPrice = 0.5;
      let noPrice = 0.5;

      if (market?.outcomePrices) {
        try {
          const prices = typeof market.outcomePrices === 'string'
            ? JSON.parse(market.outcomePrices)
            : market.outcomePrices;
          if (Array.isArray(prices) && prices.length >= 2) {
            yesPrice = parseFloat(prices[0]) || 0.5;
            noPrice = parseFloat(prices[1]) || 0.5;
          }
        } catch {}
      }

      const entry = {
        id,
        eventTitle: event.title || market?.question || 'Unknown',
        detectedAt: new Date().toISOString(),
        edgePercent: mispricing.edge,
        edgeType: mispricing.type,
        mode: mispricing.mode,
        yesPrice,
        noPrice,
        currentYesPrice: yesPrice,
        lastUpdated: new Date().toISOString(),
        resolved: false,
        resolvedAt: null,
        profit: null,
        slug: event.slug || '',
      };

      let next = [entry, ...prev];

      // Limiter à MAX_ENTRIES
      if (next.length > MAX_ENTRIES) {
        // Supprimer le plus ancien résolu d'abord, sinon le plus ancien non-résolu
        const oldestResolvedIdx = [...next].reverse().findIndex(e => e.resolved);
        if (oldestResolvedIdx !== -1) {
          next.splice(next.length - 1 - oldestResolvedIdx, 1);
        } else {
          next.pop();
        }
      }

      saveEntries(next);
      return next;
    });
  }, []);

  const updatePrices = useCallback((activeEvents) => {
    setEntries(prev => {
      const activeMap = new Map();
      for (const event of activeEvents) {
        const id = event.id || event.slug;
        if (id) activeMap.set(id, event);
      }

      let changed = false;
      const next = prev.map(entry => {
        if (entry.resolved) return entry;

        const event = activeMap.get(entry.id);

        // Si l'event n'est plus dans les events actifs → résolu
        if (!event) {
          changed = true;
          const profit = computeProfit(entry);
          return {
            ...entry,
            resolved: true,
            resolvedAt: new Date().toISOString(),
            profit,
          };
        }

        // Mettre à jour le prix courant
        const market = event.markets?.[0];
        if (market?.outcomePrices) {
          try {
            const prices = typeof market.outcomePrices === 'string'
              ? JSON.parse(market.outcomePrices)
              : market.outcomePrices;
            if (Array.isArray(prices) && prices.length >= 1) {
              const currentYes = parseFloat(prices[0]);
              if (!isNaN(currentYes) && currentYes !== entry.currentYesPrice) {
                changed = true;
                return {
                  ...entry,
                  currentYesPrice: currentYes,
                  lastUpdated: new Date().toISOString(),
                };
              }
            }
          } catch {}
        }

        return entry;
      });

      if (changed) {
        saveEntries(next);
        return next;
      }
      return prev;
    });
  }, []);

  const stats = useMemo(() => {
    const resolved = entries.filter(e => e.resolved);
    const wins = resolved.filter(e => e.profit !== null && e.profit > 0);
    const totalProfit = resolved.reduce((sum, e) => sum + (e.profit || 0), 0);

    let avgDays = 0;
    if (resolved.length > 0) {
      const totalDays = resolved.reduce((sum, e) => {
        if (!e.resolvedAt || !e.detectedAt) return sum;
        return sum + (new Date(e.resolvedAt) - new Date(e.detectedAt)) / (1000 * 60 * 60 * 24);
      }, 0);
      avgDays = totalDays / resolved.length;
    }

    return {
      totalEdges: entries.length,
      resolvedCount: resolved.length,
      winRate: resolved.length > 0 ? (wins.length / resolved.length * 100).toFixed(1) : '0',
      avgResolutionDays: avgDays.toFixed(1),
      totalTheoreticalProfit: totalProfit.toFixed(1),
    };
  }, [entries]);

  return { alphaEntries: entries, stats, trackEdge, updatePrices };
}

/**
 * Calcule le profit théorique basé sur le prix de détection.
 * Si le marché a résolu vers YES (currentYesPrice >= 0.95) → profit = (1 - yesPrice) * 100
 * Si le marché a résolu vers NO (currentYesPrice <= 0.05) → profit = (1 - noPrice) * 100
 * Sinon → delta de prix * 100
 */
function computeProfit(entry) {
  const { yesPrice, noPrice, currentYesPrice } = entry;

  if (currentYesPrice >= 0.95) {
    // Résolu YES — le bon pari était YES
    return parseFloat(((1 - yesPrice) * 100).toFixed(1));
  }
  if (currentYesPrice <= 0.05) {
    // Résolu NO — le bon pari était NO
    return parseFloat(((1 - noPrice) * 100).toFixed(1));
  }

  // Non résolu clairement — utiliser le delta de prix
  const delta = Math.abs(currentYesPrice - yesPrice) * 100;
  return parseFloat(delta.toFixed(1));
}
