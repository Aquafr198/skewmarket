import { useMemo } from 'react';
import { HiLightningBolt, HiExternalLink, HiSearch } from 'react-icons/hi';
import { safeParsePrices, getActiveMarket, getDaysUntilEnd, encodeSlug } from '../utils/marketUtils';

// ============================================
// CRYPTO EVENT IDENTIFICATION
// ============================================

// Patterns pour identifier les events crypto avec un threshold de prix
const CRYPTO_PATTERNS = [
  {
    regex: /\b(?:bitcoin|btc)\b.*?\$?([\d,]+(?:\.\d+)?)\s*(k)?\b/i,
    symbol: 'BTC',
    minPrice: 10000,
    maxPrice: 1000000,
  },
  {
    regex: /\b(?:ethereum|eth|ether)\b.*?\$?([\d,]+(?:\.\d+)?)\s*(k)?\b/i,
    symbol: 'ETH',
    minPrice: 100,
    maxPrice: 50000,
  },
  {
    regex: /\b(?:solana|sol)\b.*?\$?([\d,]+(?:\.\d+)?)\s*(k)?\b/i,
    symbol: 'SOL',
    minPrice: 5,
    maxPrice: 5000,
  },
];

// Direction keywords
const ABOVE_KEYWORDS = /\b(above|over|exceed|reach|hit|close above|close over)\b/i;
const BELOW_KEYWORDS = /\b(below|under|drop|fall|less than|close below|close under)\b/i;

// Titres à exclure : multi-threshold, non-prix, comparatifs
const EXCLUDE_PATTERNS = [
  /\bor\b.*\$[\d,]+/i,
  /\bfirst\b/i,
  /\bhold\b.*\bof\b/i,
  /\bmarket\s*cap\b/i,
  /\breserves?\b/i,
  /\bflip\b/i,
  /\bwin\b|\belection\b/i,
];

const MAX_DAYS_FOR_LAG = 30;

function normalizePrice(rawMatch, kSuffix) {
  let val = parseFloat(rawMatch.replace(/,/g, ''));
  if (isNaN(val)) return null;
  if (kSuffix) val *= 1000;
  return val;
}

function parseCryptoEvent(event) {
  const title = event.title || event.markets?.[0]?.question || '';

  for (const excludePattern of EXCLUDE_PATTERNS) {
    if (excludePattern.test(title)) return null;
  }

  const hasAbove = ABOVE_KEYWORDS.test(title);
  const hasBelow = BELOW_KEYWORDS.test(title);
  if (!hasAbove && !hasBelow) return null;

  for (const pattern of CRYPTO_PATTERNS) {
    const match = title.match(pattern.regex);
    if (!match) continue;

    const threshold = normalizePrice(match[1], match[2]);
    if (!threshold || threshold <= 0) continue;

    if (threshold < pattern.minPrice || threshold > pattern.maxPrice) continue;

    const direction = hasBelow ? 'below' : 'above';

    return { symbol: pattern.symbol, threshold, direction };
  }
  return null;
}

// ============================================
// LAG DETECTION ALGORITHM
// ============================================

function computeLagSignal(binancePrice, threshold, direction, yesPrice, daysLeft) {
  if (!binancePrice || !threshold) return null;

  const priceDeltaPct = ((binancePrice - threshold) / threshold) * 100;

  let impliedYes;
  if (direction === 'above') {
    if (priceDeltaPct > 5) impliedYes = 0.97;
    else if (priceDeltaPct > 2) impliedYes = 0.92;
    else if (priceDeltaPct > 0.5) impliedYes = 0.80;
    else if (priceDeltaPct > -0.5) impliedYes = 0.55;
    else if (priceDeltaPct > -2) impliedYes = 0.30;
    else if (priceDeltaPct > -5) impliedYes = 0.10;
    else impliedYes = 0.03;
  } else {
    if (priceDeltaPct < -5) impliedYes = 0.97;
    else if (priceDeltaPct < -2) impliedYes = 0.92;
    else if (priceDeltaPct < -0.5) impliedYes = 0.80;
    else if (priceDeltaPct < 0.5) impliedYes = 0.55;
    else if (priceDeltaPct < 2) impliedYes = 0.30;
    else if (priceDeltaPct < 5) impliedYes = 0.10;
    else impliedYes = 0.03;
  }

  if (daysLeft !== null && daysLeft > 0.5) {
    const timeBlend = Math.min(daysLeft / 7, 1);
    const blendStrength = timeBlend * 0.6;
    impliedYes = impliedYes * (1 - blendStrength) + 0.5 * blendStrength;
  }

  const lagAmount = impliedYes - yesPrice;
  const lagPct = Math.abs(lagAmount) * 100;
  const isLagging = lagPct >= 10;
  const signal = lagAmount > 0.05 ? 'BUY YES' : lagAmount < -0.05 ? 'BUY NO' : null;

  let confidence = 'low';
  if (lagPct >= 25 && Math.abs(priceDeltaPct) > 3) confidence = 'high';
  else if (lagPct >= 15 && Math.abs(priceDeltaPct) > 1) confidence = 'medium';

  return {
    isLagging,
    lagPct,
    lagAmount,
    impliedYes,
    actualYes: yesPrice,
    signal,
    confidence,
    priceDeltaPct,
    binancePrice,
    threshold,
    direction,
  };
}

// ============================================
// SUB-COMPONENTS
// ============================================

function BinancePriceBar({ prices, status }) {
  const symbols = [
    { key: 'BTC', label: 'Bitcoin', color: 'text-orange-500' },
    { key: 'ETH', label: 'Ethereum', color: 'text-skew-accent' },
    { key: 'SOL', label: 'Solana', color: 'text-purple-500' },
  ];

  return (
    <div className="bg-white rounded-xl p-4 border border-skew-border">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <span className="text-skew-text-secondary text-sm font-medium">Binance Live</span>
          {status === 'connected' && (
            <span className="w-1.5 h-1.5 rounded-full bg-skew-green animate-pulse" />
          )}
          {status === 'connecting' && (
            <span className="w-1.5 h-1.5 rounded-full bg-skew-orange animate-pulse" />
          )}
          {status === 'error' && (
            <span className="w-1.5 h-1.5 rounded-full bg-skew-red" />
          )}
        </div>
        <div className="flex items-center gap-6">
          {symbols.map(({ key, color }) => (
            <div key={key} className="flex items-center gap-2">
              <span className={`text-xs font-medium ${color}`}>{key}</span>
              <span className={`text-skew-text-primary font-semibold text-sm ${prices[key] ? '' : 'opacity-30'}`}>
                ${prices[key] ? prices[key].toLocaleString(undefined, { maximumFractionDigits: key === 'SOL' ? 2 : 0 }) : '---'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LagCard({ signal, index, priceDirections }) {
  const { event, market, lag, symbol, threshold, direction } = signal;
  const polymarketUrl = event.slug ? `https://polymarket.com/event/${encodeSlug(event.slug)}` : '#';

  const getFlashClass = () => {
    const tokenIds = market?.clobTokenIds;
    if (!Array.isArray(tokenIds) || !tokenIds[0] || !priceDirections) return '';
    const dir = priceDirections.get(tokenIds[0]);
    if (dir === 'up') return 'animate-flash-green';
    if (dir === 'down') return 'animate-flash-red';
    return '';
  };

  return (
    <div
      className={`bg-white rounded-xl p-4 border transition-colors group ${
        lag.isLagging
          ? 'border-skew-orange/40 hover:border-skew-orange/70'
          : 'border-skew-border hover:border-skew-text-tertiary'
      }`}
    >
      {/* Lag Badge */}
      {lag.isLagging && lag.signal && (
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold mb-3 ${
          lag.confidence === 'high' ? 'bg-red-50 text-red-600 border border-red-100' :
          lag.confidence === 'medium' ? 'bg-orange-50 text-orange-600 border border-orange-100' :
          'bg-yellow-50 text-yellow-600 border border-yellow-100'
        }`}>
          <HiLightningBolt className="w-3 h-3" />
          {lag.lagPct.toFixed(0)}% Lag — {lag.signal}
        </div>
      )}

      {/* Title */}
      <h3 className="font-medium text-sm mb-4 line-clamp-2 leading-snug text-skew-text-primary">
        {event.title || market.question}
      </h3>

      {/* Price Comparison */}
      <div className="space-y-2 mb-4 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-skew-text-tertiary">Binance {symbol}</span>
          <span className={`font-semibold text-skew-text-primary ${getFlashClass()}`}>
            ${lag.binancePrice?.toLocaleString(undefined, { maximumFractionDigits: symbol === 'SOL' ? 2 : 0 })}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-skew-text-tertiary">Threshold</span>
          <span className="font-medium text-skew-text-primary">
            {direction === 'above' ? '>' : '<'} ${threshold.toLocaleString()}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-skew-text-tertiary">CEX Delta</span>
          <span className={`font-medium ${lag.priceDeltaPct > 0 ? 'text-emerald-600' : lag.priceDeltaPct < 0 ? 'text-skew-red' : 'text-skew-text-secondary'}`}>
            {lag.priceDeltaPct > 0 ? '+' : ''}{lag.priceDeltaPct.toFixed(2)}%
          </span>
        </div>
      </div>

      {/* Odds Comparison */}
      <div className="bg-skew-bg-secondary rounded-lg p-3 mb-4 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-skew-text-tertiary">Polymarket YES</span>
          <span className="font-semibold text-sm text-skew-text-primary">{(lag.actualYes * 100).toFixed(1)}¢</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-skew-text-tertiary">Implied Fair</span>
          <span className="font-semibold text-sm text-skew-accent">{(lag.impliedYes * 100).toFixed(1)}¢</span>
        </div>
        {lag.isLagging && (
          <div className="flex items-center justify-between text-xs pt-1.5 border-t border-skew-border-light">
            <span className="text-skew-text-tertiary">Edge</span>
            <span className={`font-bold text-sm ${lag.lagAmount > 0 ? 'text-emerald-600' : 'text-skew-red'}`}>
              {lag.lagAmount > 0 ? '+' : ''}{(lag.lagAmount * 100).toFixed(1)}¢
            </span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-skew-border-light text-[11px] text-skew-text-tertiary">
        <span>Vol ${event.volume ? (event.volume / 1000).toFixed(0) + 'K' : '0'}</span>
        <a
          href={polymarketUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-skew-text-secondary hover:text-skew-accent transition-colors"
        >
          Polymarket <HiExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function CexLagDetector({ events, binancePrices, binanceStatus, priceDirections }) {
  const cryptoSignals = useMemo(() => {
    if (!events || !binancePrices) return [];

    const signals = [];
    for (const event of events) {
      const parsed = parseCryptoEvent(event);
      if (!parsed) continue;

      const { symbol, threshold, direction } = parsed;
      const binancePrice = binancePrices[symbol];
      if (!binancePrice) continue;

      const market = getActiveMarket(event);
      const prices = safeParsePrices(market?.outcomePrices);
      if (!prices) continue;

      const yesPrice = prices[0];
      const daysLeft = getDaysUntilEnd(event.endDate);

      if (daysLeft !== null && daysLeft > MAX_DAYS_FOR_LAG) continue;

      const lag = computeLagSignal(binancePrice, threshold, direction, yesPrice, daysLeft);

      if (lag) {
        signals.push({ event, market, lag, symbol, threshold, direction });
      }
    }

    signals.sort((a, b) => {
      if (a.lag.isLagging && !b.lag.isLagging) return -1;
      if (!a.lag.isLagging && b.lag.isLagging) return 1;
      return b.lag.lagPct - a.lag.lagPct;
    });

    return signals;
  }, [events, binancePrices]);

  const laggingCount = cryptoSignals.filter(s => s.lag.isLagging).length;

  return (
    <div className="space-y-6">
      {/* Binance Price Bar */}
      <BinancePriceBar prices={binancePrices} status={binanceStatus} />

      {/* Summary */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-skew-text-tertiary">
          <span className="font-medium text-skew-text-primary">{cryptoSignals.length}</span> crypto markets tracked
          {laggingCount > 0 && (
            <> · <span className="font-medium text-orange-600">{laggingCount} lag{laggingCount > 1 ? 's' : ''} detected</span></>
          )}
        </p>
      </div>

      {/* Signals Grid */}
      {cryptoSignals.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-14 h-14 rounded-full bg-skew-bg-tertiary flex items-center justify-center mx-auto mb-4">
            <HiSearch className="w-6 h-6 text-skew-text-tertiary" />
          </div>
          <h3 className="font-semibold text-base mb-2 text-skew-text-primary">No crypto markets found</h3>
          <p className="text-skew-text-secondary text-sm max-w-sm mx-auto">
            {binanceStatus !== 'connected'
              ? 'Connecting to Binance...'
              : 'No active Polymarket events match BTC, ETH, or SOL price predictions right now.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
          {cryptoSignals.map((signal, i) => (
            <LagCard
              key={signal.event.id || signal.event.slug || i}
              signal={signal}
              index={i}
              priceDirections={priceDirections}
            />
          ))}
        </div>
      )}
    </div>
  );
}
