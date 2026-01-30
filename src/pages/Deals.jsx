import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ProofOfAlpha from '../components/ProofOfAlpha';
import CexLagDetector from '../components/CexLagDetector';
import NewsFeed from '../components/NewsFeed';
import usePolymarketWS from '../hooks/usePolymarketWS';
import useBinanceWS from '../hooks/useBinanceWS';
import useAlphaTracker from '../hooks/useAlphaTracker';
import { buildTokenMap } from '../utils/tokenMapping';
import { safeParsePrices, getActiveMarket, getDaysUntilEnd, isDateInFuture, encodeSlug } from '../utils/marketUtils';
import { HiViewGrid, HiShieldCheck, HiLightningBolt, HiTrendingUp, HiClock, HiExternalLink, HiRefresh, HiSearch, HiExclamationCircle, HiTag, HiNewspaper } from 'react-icons/hi';

const GAMMA_API = '/api/polymarket';

// ============================================
// VALIDATION
// ============================================

function validateEvent(event) {
  const issues = [];

  if (!event) return { isValid: false, issues: ['Event is null'] };
  if (!event.slug || typeof event.slug !== 'string') issues.push('Missing or invalid slug');
  if (!event.markets || !Array.isArray(event.markets) || event.markets.length === 0) issues.push('No markets available');
  if (event.closed === true) issues.push('Event is closed');
  if (event.active === false) issues.push('Event is not active');

  if (event.endDate) {
    if (!isDateInFuture(event.endDate)) issues.push('Event has ended');
  }

  const market = getActiveMarket(event);
  if (!market) {
    issues.push('No valid market found');
  } else {
    const prices = safeParsePrices(market.outcomePrices);
    if (!prices) issues.push('Invalid outcome prices');
    if (market.closed === true) issues.push('All markets are closed');
  }

  return { isValid: issues.length === 0, issues };
}

// ============================================
// SCORING ALGORITHMS
// ============================================

function calculateMispricingScore(event) {
  const markets = event?.markets;
  if (!markets || !Array.isArray(markets) || markets.length === 0) {
    return { score: 0, edge: 0, type: null, confidence: 0, mode: null };
  }

  let edge = 0;
  let mode = null;

  if (markets.length >= 2) {
    const yesPrices = [];
    for (const m of markets) {
      const prices = safeParsePrices(m?.outcomePrices);
      if (!prices) continue;
      yesPrices.push(prices[0]);
    }
    if (yesPrices.length >= 2) {
      const total = yesPrices.reduce((a, b) => a + b, 0);
      // For multi-outcome markets the expected total is 1.0 (all outcomes should sum to 100%)
      // But only if the total is reasonably close — huge deviations mean independent markets, not mispricing
      const deviation = Math.abs(1 - total) * 100;
      if (deviation <= 15) {
        edge = deviation;
        mode = 'multi';
      }
      // If total is way off (e.g. 5.0 for 10 outcomes), these are independent markets — skip multi mode
    }
  }

  if (mode === null || (mode === 'multi' && edge < 0.5)) {
    const market = getActiveMarket(event);
    const prices = safeParsePrices(market?.outcomePrices);
    if (prices) {
      const total = prices.reduce((a, b) => a + b, 0);
      const binaryEdge = Math.abs(1 - total) * 100;
      if (binaryEdge > edge) {
        edge = binaryEdge;
        mode = 'binary';
      }
    }
  }

  if (edge === 0 || !mode) {
    return { score: 0, edge: 0, type: null, confidence: 0, mode: null };
  }

  let score = 0;
  let type = null;
  let confidence = 100;

  if (edge > 5) {
    score = 100; type = 'extreme';
    confidence = mode === 'multi' ? 85 : 60;
  } else if (edge > 2) {
    score = 75; type = 'high';
    confidence = mode === 'multi' ? 90 : 80;
  } else if (edge > 1) {
    score = 50; type = 'medium';
    confidence = 95;
  } else if (edge > 0.5) {
    score = 25; type = 'low';
    confidence = 100;
  }

  return { score, edge, type, confidence, mode };
}

function calculateHotDealScore(event) {
  let score = 0;
  const factors = [];
  let dataQuality = 100;

  const volume = Number(event.volume) || 0;
  if (volume > 1000000) { score += 30; factors.push('Very High Volume'); }
  else if (volume > 500000) { score += 25; factors.push('High Volume'); }
  else if (volume > 100000) { score += 15; factors.push('Good Volume'); }
  else if (volume < 10000) { dataQuality -= 10; }

  const liquidity = Number(event.liquidity) || 0;
  if (liquidity > 100000) { score += 25; factors.push('High Liquidity'); }
  else if (liquidity > 50000) { score += 15; factors.push('Good Liquidity'); }
  else if (liquidity < 10000) { dataQuality -= 15; }

  const market = getActiveMarket(event);
  const prices = safeParsePrices(market?.outcomePrices);
  if (prices && prices.length >= 2) {
    const yesPrice = prices[0];
    const uncertainty = 1 - Math.abs(0.5 - yesPrice) * 2;
    score += Math.round(uncertainty * 20);
    if (uncertainty > 0.8) factors.push('High Uncertainty');
  }

  const daysLeft = getDaysUntilEnd(event.endDate);
  if (daysLeft !== null) {
    if (daysLeft > 1 && daysLeft < 7) { score += 25; factors.push('Ending Soon'); }
    else if (daysLeft >= 7 && daysLeft < 30) { score += 15; factors.push('Active Market'); }
    else if (daysLeft < 1) { dataQuality -= 20; }
  }

  return { score, factors, dataQuality };
}

function calculateConfidenceScore(event) {
  let confidence = 100;
  const warnings = [];

  const market = getActiveMarket(event);
  const volume = Number(event.volume) || 0;
  const liquidity = Number(event.liquidity) || 0;
  const daysLeft = getDaysUntilEnd(event.endDate);

  if (volume < 50000) { confidence -= 15; warnings.push('Low volume'); }
  if (liquidity < 25000) { confidence -= 20; warnings.push('Low liquidity'); }
  if (daysLeft !== null && daysLeft < 1) { confidence -= 30; warnings.push('Ending very soon'); }

  const prices = safeParsePrices(market?.outcomePrices);
  if (prices) {
    const total = prices.reduce((a, b) => a + b, 0);
    if (total < 0.9 || total > 1.1) { confidence -= 10; warnings.push('Price spread unusual'); }
  }

  return {
    confidence: Math.max(0, confidence),
    warnings,
    level: confidence >= 80 ? 'high' : confidence >= 50 ? 'medium' : 'low'
  };
}

// ============================================
// MARKET CARD
// ============================================

function MarketCard({ event, index, priceDirections }) {
  const [expanded, setExpanded] = useState(false);
  const market = getActiveMarket(event) || {};

  // Detect multi-outcome: multiple open markets each representing a choice
  const activeMarkets = (event.markets || []).filter(m => {
    if (m.closed === true || m.active === false) return false;
    return safeParsePrices(m.outcomePrices) !== null;
  });
  const isMultiOutcome = activeMarkets.length >= 3;

  // Build choices list for multi-outcome events (sorted by Yes price desc)
  const choices = isMultiOutcome
    ? activeMarkets
        .map(m => {
          const p = safeParsePrices(m.outcomePrices);
          return {
            label: m.groupItemTitle || m.question || 'Option',
            yesPrice: p ? p[0] : 0,
            market: m,
          };
        })
        .sort((a, b) => b.yesPrice - a.yesPrice)
    : [];

  // Binary fallback
  let outcomes = ['Yes', 'No'];
  let prices = [0.5, 0.5];
  try { if (market.outcomes) outcomes = JSON.parse(market.outcomes); } catch {}
  const parsedPrices = safeParsePrices(market.outcomePrices);
  if (parsedPrices) prices = parsedPrices;

  const getFlashClass = (tokenIds, outcomeIndex) => {
    if (!Array.isArray(tokenIds) || !tokenIds[outcomeIndex] || !priceDirections) return '';
    const dir = priceDirections.get(tokenIds[outcomeIndex]);
    if (dir === 'up') return 'animate-flash-green';
    if (dir === 'down') return 'animate-flash-red';
    return '';
  };

  const { mispricing, hotDeal, confidence, daysLeft } = event._scores;
  const polymarketUrl = event.slug ? `https://polymarket.com/event/${encodeSlug(event.slug)}` : '#';
  const hasEdge = mispricing.edge > 0.5;

  // Determine which side the edge favors
  const getEdgeSide = () => {
    if (!hasEdge) return null;

    if (isMultiOutcome && mispricing.mode === 'multi') {
      const total = choices.reduce((s, c) => s + c.yesPrice, 0);
      if (total > 1.005) {
        const top = choices[0];
        return { side: top.label, reason: `Prices sum to ${(total * 100).toFixed(1)}% (> 100%) \u2014 "${top.label}" may be overpriced at ${(top.yesPrice * 100).toFixed(1)}\u00A2` };
      }
      if (total < 0.995) {
        const best = choices[choices.length - 1];
        return { side: best.label, reason: `Prices sum to ${(total * 100).toFixed(1)}% (< 100%) \u2014 "${best.label}" may be underpriced at ${(best.yesPrice * 100).toFixed(1)}\u00A2` };
      }
      return { side: choices[0].label, reason: `Slight mispricing detected across ${choices.length} outcomes` };
    }

    // Binary
    if (prices.length < 2) return null;
    const yesPrice = parseFloat(prices[0]);
    const noPrice = parseFloat(prices[1]);
    const total = yesPrice + noPrice;
    if (total > 1.005) return { side: 'No', reason: 'Prices sum > 100% \u2014 No side is overpriced' };
    if (total < 0.995) return { side: 'Yes', reason: 'Prices sum < 100% \u2014 Yes side is underpriced' };
    if (yesPrice > noPrice) return { side: 'No', reason: `Yes is priced high (${(yesPrice * 100).toFixed(1)}\u00A2) \u2014 edge on No` };
    return { side: 'Yes', reason: `No is priced high (${(noPrice * 100).toFixed(1)}\u00A2) \u2014 edge on Yes` };
  };

  const edgeSide = getEdgeSide();

  // How many choices to show collapsed vs expanded
  const COLLAPSED_CHOICES = 4;
  const visibleChoices = expanded ? choices : choices.slice(0, COLLAPSED_CHOICES);
  const hiddenCount = choices.length - COLLAPSED_CHOICES;

  return (
    <div
      className="bg-white rounded-xl border border-skew-border hover:border-skew-text-tertiary transition-all group cursor-pointer"
      onClick={() => setExpanded(!expanded)}
    >
      {/* Edge banner — hero element */}
      {hasEdge ? (
        <div className="px-4 py-2.5 bg-emerald-50 border-b border-emerald-100 rounded-t-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HiLightningBolt className="w-4 h-4 text-emerald-500" />
            <span className="text-emerald-700 font-bold text-lg">{mispricing.edge.toFixed(1)}%</span>
            <span className="text-emerald-600 text-xs font-medium">Edge</span>
          </div>
          {edgeSide && (
            <span className="text-emerald-600 text-xs font-semibold bg-emerald-100 px-2 py-0.5 rounded-full truncate max-w-[140px]">
              {edgeSide.side}
            </span>
          )}
        </div>
      ) : hotDeal.score >= 70 && hotDeal.dataQuality >= 70 ? (
        <div className="px-4 py-2 bg-orange-50 border-b border-orange-100 rounded-t-xl flex items-center gap-2">
          <HiTrendingUp className="w-4 h-4 text-orange-500" />
          <span className="text-orange-600 text-xs font-semibold">Hot Deal</span>
        </div>
      ) : null}

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            {event.image ? (
              <img
                src={event.image}
                alt=""
                className="w-10 h-10 rounded-lg object-cover bg-skew-bg-secondary flex-shrink-0"
                onError={(e) => e.target.style.display = 'none'}
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-skew-bg-secondary flex items-center justify-center flex-shrink-0">
                <HiViewGrid className="w-4 h-4 text-skew-text-tertiary" />
              </div>
            )}
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-xs text-skew-text-tertiary font-medium truncate">{event.category || 'Market'}</span>
              {daysLeft !== null && daysLeft < 3 && daysLeft > 0 && (
                <span className="text-[10px] text-skew-orange font-medium">{Math.ceil(daysLeft)}d left</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {isMultiOutcome && (
              <span className="text-[10px] text-skew-accent font-semibold bg-skew-accent-light px-2 py-0.5 rounded-full">
                {activeMarkets.length} choices
              </span>
            )}
            <a
              href={polymarketUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-1.5 rounded-lg hover:bg-skew-bg-secondary transition-colors opacity-0 group-hover:opacity-100"
            >
              <HiExternalLink className="w-4 h-4 text-skew-text-tertiary" />
            </a>
          </div>
        </div>

        {/* Title */}
        <h3 className="font-medium text-sm mb-4 line-clamp-2 leading-snug text-skew-text-primary">{event.title || market.question}</h3>

        {/* === MULTI-OUTCOME: show all choices === */}
        {isMultiOutcome ? (
          <div className="mb-4 space-y-1.5">
            {visibleChoices.map((choice, i) => {
              const pct = (choice.yesPrice * 100).toFixed(1);
              const isTop = i === 0;
              const isEdgeTarget = edgeSide && edgeSide.side === choice.label;
              const flash = getFlashClass(choice.market?.clobTokenIds, 0);
              return (
                <div
                  key={choice.label}
                  className={`flex items-center justify-between rounded-lg px-3 py-2 relative ${
                    isEdgeTarget && hasEdge
                      ? 'bg-emerald-50 border border-emerald-200 ring-1 ring-emerald-300'
                      : isTop
                        ? 'bg-skew-bg-secondary border border-skew-border'
                        : 'bg-skew-bg-tertiary/50 border border-transparent'
                  } ${flash}`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {isEdgeTarget && hasEdge && (
                      <span className="bg-emerald-500 text-white text-[7px] font-bold px-1.5 py-0.5 rounded-full leading-none flex-shrink-0">
                        EDGE
                      </span>
                    )}
                    <span className={`text-xs font-medium truncate ${isEdgeTarget && hasEdge ? 'text-emerald-700' : 'text-skew-text-primary'}`}>
                      {choice.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    <div className="w-16 h-1.5 rounded-full bg-skew-border overflow-hidden">
                      <div
                        className={`h-full rounded-full ${isEdgeTarget && hasEdge ? 'bg-emerald-400' : isTop ? 'bg-skew-accent' : 'bg-skew-text-tertiary'}`}
                        style={{ width: `${Math.min(choice.yesPrice * 100, 100)}%` }}
                      />
                    </div>
                    <span className={`text-sm font-bold tabular-nums w-12 text-right ${
                      isEdgeTarget && hasEdge ? 'text-emerald-600' : isTop ? 'text-skew-accent' : 'text-skew-text-primary'
                    }`}>
                      {pct}¢
                    </span>
                  </div>
                </div>
              );
            })}
            {!expanded && hiddenCount > 0 && (
              <div className="text-center pt-1">
                <span className="text-[11px] text-skew-accent font-medium">
                  +{hiddenCount} more outcome{hiddenCount > 1 ? 's' : ''} — click to expand
                </span>
              </div>
            )}
          </div>
        ) : (
          /* === BINARY: side-by-side Yes/No boxes === */
          <div className="flex gap-2 mb-4">
            {outcomes.slice(0, 2).map((outcome, i) => {
              const pct = (parseFloat(prices[i]) * 100).toFixed(1);
              const isYes = i === 0;
              const isEdgeSide = edgeSide && edgeSide.side === outcome;
              return (
                <div
                  key={outcome}
                  className={`flex-1 rounded-lg px-3 py-2.5 text-center relative ${
                    isYes ? 'bg-emerald-50 border border-emerald-100' : 'bg-red-50 border border-red-100'
                  } ${isEdgeSide && hasEdge ? 'ring-2 ring-emerald-300' : ''} ${getFlashClass(market?.clobTokenIds, i)}`}
                >
                  {isEdgeSide && hasEdge && (
                    <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                      EDGE
                    </div>
                  )}
                  <div className={`text-lg font-bold ${isYes ? 'text-emerald-600' : 'text-red-500'}`}>
                    {pct}¢
                  </div>
                  <div className="text-[11px] text-skew-text-secondary font-medium mt-0.5">{outcome}</div>
                </div>
              );
            })}
          </div>
        )}

        {/* Stats row */}
        <div className="flex items-center justify-between pt-3 border-t border-skew-border-light text-[11px] text-skew-text-tertiary">
          <span>Vol ${event.volume ? (event.volume / 1000).toFixed(0) + 'K' : '0'}</span>
          <span>Liq ${event.liquidity ? (event.liquidity / 1000).toFixed(0) + 'K' : '0'}</span>
          {daysLeft !== null && (
            <span className={daysLeft < 3 ? 'text-skew-orange font-medium' : ''}>
              {daysLeft < 1 ? 'Ends today' : `${Math.ceil(daysLeft)}d left`}
            </span>
          )}
          <span className={`font-medium ${
            confidence.level === 'high' ? 'text-emerald-500' :
            confidence.level === 'medium' ? 'text-skew-orange' : 'text-skew-red'
          }`}>
            {confidence.confidence}% trust
          </span>
        </div>

        {/* Expanded details panel */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-3 pt-3 border-t border-skew-border-light space-y-2">
                {/* Edge details */}
                {hasEdge && (
                  <div className="bg-emerald-50 rounded-lg p-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-emerald-700">Edge Analysis</span>
                      <span className="text-xs font-bold text-emerald-600">{mispricing.edge.toFixed(2)}%</span>
                    </div>
                    {edgeSide && (
                      <p className="text-[11px] text-emerald-600 leading-relaxed">{edgeSide.reason}</p>
                    )}
                    <div className="flex gap-3 text-[10px] text-emerald-500">
                      <span>Mode: {mispricing.mode === 'multi' ? `Multi-outcome (${activeMarkets.length} choices)` : 'Binary'}</span>
                      <span>Signal: {mispricing.type}</span>
                    </div>
                  </div>
                )}

                {/* Confidence breakdown */}
                <div className="bg-skew-bg-secondary rounded-lg p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-skew-text-primary">Trust Score</span>
                    <span className={`text-xs font-bold ${
                      confidence.level === 'high' ? 'text-emerald-600' :
                      confidence.level === 'medium' ? 'text-skew-orange' : 'text-skew-red'
                    }`}>{confidence.confidence}%</span>
                  </div>
                  <p className="text-[11px] text-skew-text-secondary leading-relaxed">
                    Based on volume, liquidity, time remaining and price coherence.
                  </p>
                  {confidence.warnings.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {confidence.warnings.map((w) => (
                        <span key={w} className="text-[9px] bg-skew-orange/10 text-skew-orange px-1.5 py-0.5 rounded-full font-medium">{w}</span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Trade on Polymarket link */}
                <a
                  href={polymarketUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center justify-center gap-2 w-full py-2 bg-skew-accent text-white rounded-lg text-xs font-medium hover:bg-skew-accent-hover transition-colors"
                >
                  Trade on Polymarket
                  <HiExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ============================================
// FILTERS & TABS
// ============================================

const marketFilters = [
  { key: 'all', label: 'All Live', icon: HiViewGrid },
  { key: 'verified', label: 'Verified Only', icon: HiShieldCheck },
  { key: 'mispricing', label: 'Mispricing', icon: HiLightningBolt },
  { key: 'hot', label: 'Hot Deals', icon: HiTrendingUp },
  { key: 'highvolume', label: 'High Volume', icon: HiTrendingUp },
  { key: 'ending', label: 'Ending Soon', icon: HiClock },
];

// Categories — broad tags shown as filter pills, ordered by relevance
const CATEGORY_ORDER = [
  'Politics', 'Crypto', 'Sports', 'Culture', 'Finance',
  'Tech', 'Business', 'World', 'Economy', 'Science',
];

// Map granular Polymarket tags → parent category so events without a broad tag still appear
const TAG_TO_CATEGORY = {
  // Politics
  'Trump': 'Politics', 'Trump Presidency': 'Politics', 'U.S. Politics': 'Politics',
  'Congress': 'Politics', 'Cabinet': 'Politics', 'house': 'Politics',
  'us government': 'Politics', 'Immigration': 'Politics', 'Immigration/Border': 'Politics',
  'Courts': 'Politics', 'DOGE': 'Politics', 'Global Elections': 'Politics',
  'abortion': 'Politics',
  // Geopolitics → World
  'Geopolitics': 'World', 'nato': 'World', 'Trade War': 'World',
  'Ukraine': 'World', 'Foreign Policy': 'World', 'russia': 'World',
  'China': 'World', 'India': 'World', 'Brazil': 'World', 'France': 'World',
  'eu': 'World', 'uk': 'World', 'Starmer': 'World', 'Macron': 'World',
  'putin': 'World', 'zelensky': 'World', 'Trump-Zelenskyy': 'World',
  'Trump-Putin': 'World', 'Security Guarantee': 'World',
  // Sports
  'NFL': 'Sports', 'NFL Playoffs': 'Sports', 'Super Bowl': 'Sports',
  'Super Bowl LX': 'Sports', 'Soccer': 'Sports',
  // Culture
  'Music': 'Culture', 'Celebrities': 'Culture', 'Taylor Swift': 'Culture',
  'Creators': 'Culture', 'video games': 'Culture', 'GTA VI': 'Culture',
  'All-In': 'Culture', 'Epstein': 'Culture',
  // Finance / Economy
  'Stocks': 'Finance', 'IPOs': 'Finance', 'MicroStrategy': 'Finance',
  'Macro Indicators': 'Economy', 'GDP': 'Economy', 'deficit': 'Economy',
  'budget': 'Economy',
  // Crypto
  'exchange': 'Crypto', 'balance': 'Crypto', 'bitboy': 'Crypto',
};

function getEventCategories(event) {
  const tags = event.tags;
  if (!Array.isArray(tags)) return [];
  const cats = new Set();
  for (const t of tags) {
    const label = t?.label;
    if (!label) continue;
    if (CATEGORY_ORDER.includes(label)) {
      cats.add(label);
    } else if (TAG_TO_CATEGORY[label]) {
      cats.add(TAG_TO_CATEGORY[label]);
    }
  }
  return [...cats];
}

function extractCategories(events) {
  const counts = {};
  for (const event of events) {
    for (const cat of getEventCategories(event)) {
      counts[cat] = (counts[cat] || 0) + 1;
    }
  }
  return CATEGORY_ORDER.filter(c => (counts[c] || 0) >= 2);
}

const MIN_CONFIDENCE_THRESHOLD = 50;
const VERIFIED_CONFIDENCE_THRESHOLD = 80;

const pageTabs = [
  { key: 'markets', label: 'All Markets', icon: HiViewGrid },
  { key: 'news', label: 'News', icon: HiNewspaper },
  { key: 'cex-lag', label: 'CEX Lag Detector', icon: HiLightningBolt },
  { key: 'alpha', label: 'Proof of Alpha', icon: HiShieldCheck },
];

// ============================================
// MAIN COMPONENT
// ============================================

export default function Deals() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('markets');
  const [filter, setFilter] = useState('verified');
  const [categoryFilter, setCategoryFilter] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [lastUpdate, setLastUpdate] = useState(null);

  // Hooks
  const { alphaEntries, stats: alphaStats, trackEdge, updatePrices } = useAlphaTracker();
  const { prices: binancePrices, connectionStatus: binanceStatus } = useBinanceWS();

  const trackEdgeRef = useRef(trackEdge);
  const updatePricesRef = useRef(updatePrices);
  trackEdgeRef.current = trackEdge;
  updatePricesRef.current = updatePrices;

  const { tokenIds } = useMemo(() => buildTokenMap(events), [events]);
  const { prices: wsPrices, priceDirections, connectionStatus } = usePolymarketWS(tokenIds);

  const categories = useMemo(() => extractCategories(events), [events]);

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const now = new Date().toISOString();
      const response = await fetch(`${GAMMA_API}/events?active=true&closed=false&archived=false&end_date_min=${now}&limit=200`);
      if (!response.ok) throw new Error('Failed to fetch events');
      const data = await response.json();

      const liveEvents = [];
      for (const event of data) {
        const validation = validateEvent(event);
        if (!validation.isValid) continue;

        const _confidence = calculateConfidenceScore(event);
        if (_confidence.confidence < MIN_CONFIDENCE_THRESHOLD) continue;

        const _mispricing = calculateMispricingScore(event);
        const _hotDeal = calculateHotDealScore(event);
        const _daysLeft = getDaysUntilEnd(event.endDate);
        const _combinedScore = (_confidence.confidence * 2) + (_mispricing.score * 1.5) + _hotDeal.score;

        event._scores = { mispricing: _mispricing, hotDeal: _hotDeal, confidence: _confidence, daysLeft: _daysLeft, combined: _combinedScore };
        liveEvents.push(event);
      }

      liveEvents.sort((a, b) => b._scores.combined - a._scores.combined);

      for (const event of liveEvents) {
        if (event._scores.mispricing.edge > 0.5) {
          trackEdgeRef.current(event, event._scores.mispricing);
        }
      }

      setEvents(liveEvents);
      setLastUpdate(new Date());
      updatePricesRef.current(liveEvents);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, 60000);
    return () => clearInterval(interval);
  }, [fetchEvents]);

  const filteredEvents = useMemo(() => {
    let result = events.filter(event => {
      const searchText = event.title || event.markets?.[0]?.question || '';
      if (searchQuery && !searchText.toLowerCase().includes(searchQuery.toLowerCase())) return false;

      // Category filter — uses resolved parent categories
      if (categoryFilter) {
        if (!getEventCategories(event).includes(categoryFilter)) return false;
      }

      const { mispricing, hotDeal, confidence, daysLeft } = event._scores;

      switch (filter) {
        case 'verified': return confidence.confidence >= VERIFIED_CONFIDENCE_THRESHOLD;
        case 'mispricing': return mispricing.score >= 25 && confidence.confidence >= 70;
        case 'hot': return hotDeal.score >= 50 && confidence.confidence >= 70;
        case 'highvolume': return event.volume > 100000;
        case 'ending': return daysLeft !== null && daysLeft > 0 && daysLeft < 7;
        default: return true;
      }
    });

    result.sort((a, b) => b._scores.combined - a._scores.combined);
    return result;
  }, [events, filter, searchQuery, categoryFilter]);

  const eventsWithLivePrices = useMemo(() => {
    if (wsPrices.size === 0) return filteredEvents;

    return filteredEvents.map(event => {
      const markets = event.markets;
      if (!markets || !Array.isArray(markets)) return event;

      let changed = false;
      const updatedMarkets = markets.map((market) => {
        const ids = market?.clobTokenIds;
        if (!Array.isArray(ids)) return market;

        const prices = safeParsePrices(market.outcomePrices);
        if (!prices) return market;

        const newPrices = [...prices];
        for (let oi = 0; oi < ids.length; oi++) {
          const wsPrice = wsPrices.get(ids[oi]);
          if (wsPrice !== undefined && oi < newPrices.length) {
            newPrices[oi] = wsPrice;
            changed = true;
          }
        }

        if (!changed) return market;
        return { ...market, outcomePrices: JSON.stringify(newPrices) };
      });

      if (!changed) return event;
      return { ...event, markets: updatedMarkets };
    });
  }, [filteredEvents, wsPrices]);

  return (
    <div className="min-h-screen bg-skew-bg">
      <Header />

      {/* Hero — compact white */}
      <section className="pt-20 lg:pt-24 pb-6 lg:pb-8 px-4 lg:px-6 border-b border-skew-border">
        <div className="max-w-[1200px] mx-auto">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold text-skew-text-primary tracking-tight mb-1">
                Markets
              </h1>
              <p className="text-skew-text-secondary text-sm">
                Real-time prediction market intelligence
              </p>
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              {connectionStatus === 'connected' && (
                <span className="inline-flex items-center gap-1.5 text-skew-green text-xs font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-skew-green animate-pulse" />
                  Polymarket
                </span>
              )}
              {connectionStatus === 'connecting' && (
                <span className="inline-flex items-center gap-1.5 text-skew-orange text-xs font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-skew-orange animate-pulse" />
                  Connecting
                </span>
              )}
              {lastUpdate && (
                <span className="text-skew-text-tertiary text-xs">
                  {lastUpdate.toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Sticky Navigation */}
      <section className="bg-white border-b border-skew-border sticky top-14 z-40">
        <div className="max-w-[1200px] mx-auto px-4 lg:px-6">
          {/* Tabs */}
          <div className="flex items-center justify-between py-2.5">
            <div className="flex gap-1 overflow-x-auto pb-1 -mb-1">
              {pageTabs.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 ${
                    activeTab === key
                      ? 'bg-skew-accent text-white'
                      : 'text-skew-text-secondary hover:bg-skew-bg-secondary'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>

            <button
              onClick={fetchEvents}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium text-skew-text-secondary hover:bg-skew-bg-secondary transition-all disabled:opacity-50 flex-shrink-0"
            >
              <HiRefresh className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>

          {/* Market Filters — only on markets tab */}
          <AnimatePresence>
            {activeTab === 'markets' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="pb-3 flex flex-col gap-3 border-t border-skew-border-light pt-3">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="relative w-full lg:w-80">
                      <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-skew-text-tertiary" />
                      <input
                        type="text"
                        placeholder="Search markets..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-skew-bg-tertiary rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-skew-accent/20 transition-all border border-transparent focus:border-skew-accent/30"
                      />
                    </div>
                    <div className="flex gap-1.5 flex-wrap overflow-x-auto pb-1 -mb-1">
                      {marketFilters.map(({ key, label, icon: Icon }) => (
                        <button
                          key={key}
                          onClick={() => setFilter(key)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap flex-shrink-0 ${
                            filter === key
                              ? 'bg-skew-accent text-white'
                              : 'bg-skew-bg-secondary text-skew-text-secondary hover:bg-skew-bg-tertiary'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Category filters */}
                  {categories.length > 0 && (
                    <div className="flex gap-1.5 flex-wrap overflow-x-auto pb-1 -mb-1">
                      <span className="inline-flex items-center gap-1 text-xs text-skew-text-tertiary font-medium px-1 flex-shrink-0">
                        <HiTag className="w-3 h-3" />
                        Category
                      </span>
                      <button
                        onClick={() => setCategoryFilter(null)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap flex-shrink-0 ${
                          categoryFilter === null
                            ? 'bg-skew-accent text-white'
                            : 'bg-skew-bg-secondary text-skew-text-secondary hover:bg-skew-bg-tertiary'
                        }`}
                      >
                        All
                      </button>
                      {categories.map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setCategoryFilter(categoryFilter === cat ? null : cat)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap flex-shrink-0 ${
                            categoryFilter === cat
                              ? 'bg-skew-accent text-white'
                              : 'bg-skew-bg-secondary text-skew-text-secondary hover:bg-skew-bg-tertiary'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* Main Content */}
      <main className="py-6 lg:py-8 px-4 lg:px-6 bg-skew-bg-secondary min-h-[60vh]">
        <div className="max-w-[1200px] mx-auto">
          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-10 h-10 border-2 border-skew-accent border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-skew-text-secondary text-sm">Loading markets...</p>
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div className="bg-white border border-skew-border rounded-xl p-8 text-center max-w-md mx-auto">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
                <HiExclamationCircle className="w-6 h-6 text-skew-red" />
              </div>
              <h3 className="font-semibold text-base mb-2 text-skew-text-primary">Unable to load markets</h3>
              <p className="text-skew-text-secondary text-sm mb-6">{error}</p>
              <button
                onClick={fetchEvents}
                className="btn-primary"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Tab Content */}
          {!loading && !error && (
            <>
              {/* All Markets */}
              {activeTab === 'markets' && (
                <>
                  <div className="flex items-center justify-between mb-4 lg:mb-6">
                    <p className="text-xs text-skew-text-tertiary">
                      Showing <span className="font-medium text-skew-text-primary">{eventsWithLivePrices.length}</span> markets
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
                    {eventsWithLivePrices.map((event, index) => (
                      <MarketCard key={event.id || event.slug || index} event={event} index={index} priceDirections={priceDirections} />
                    ))}
                  </div>

                  {eventsWithLivePrices.length === 0 && (
                    <div className="text-center py-20">
                      <div className="w-14 h-14 rounded-full bg-skew-bg-tertiary flex items-center justify-center mx-auto mb-4">
                        <HiSearch className="w-6 h-6 text-skew-text-tertiary" />
                      </div>
                      <h3 className="font-semibold text-base mb-2 text-skew-text-primary">No markets found</h3>
                      <p className="text-skew-text-secondary text-sm">Try adjusting your search or filters.</p>
                    </div>
                  )}
                </>
              )}

              {/* News */}
              {activeTab === 'news' && (
                <NewsFeed events={events} />
              )}

              {/* CEX Lag Detector */}
              {activeTab === 'cex-lag' && (
                <CexLagDetector
                  events={events}
                  binancePrices={binancePrices}
                  binanceStatus={binanceStatus}
                  priceDirections={priceDirections}
                />
              )}

              {/* Proof of Alpha */}
              {activeTab === 'alpha' && (
                <ProofOfAlpha entries={alphaEntries} stats={alphaStats} fullPage={true} />
              )}
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
