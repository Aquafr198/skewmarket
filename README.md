# SkewMarket

Real-time prediction market scanner that finds mispriced odds on [Polymarket](https://polymarket.com).

I got tired of manually scrolling through hundreds of markets trying to find edges. So I built something that does it for me, 24/7.

**[Live Demo](https://skew-market.vercel.app)** | React + Vite + Tailwind CSS v4

---

## What it does

SkewMarket scans 200+ live prediction markets and highlights the ones where the odds don't add up. When prices are off, there's an opportunity — and this tool finds it before you do.

- **Edge Detection** — spots when market prices deviate from where they should be, and tells you which side to look at
- **Multi-Outcome Support** — markets with 3+ choices (elections, timelines, etc.) display all outcomes ranked by probability
- **CEX Lag Detector** — catches moments where crypto prices moved on Binance but prediction markets haven't reacted yet
- **Trust Score** — each opportunity gets a reliability score so you don't waste money on noise
- **Proof of Alpha** — every edge is logged and tracked. When the market resolves, you see if it was right or not

---

## How the algorithm works

### 1. Edge Detection (Mispricing Scanner)

The core idea is simple: in a correctly priced market, **all outcome probabilities should sum to exactly 100%**. When they don't, someone is wrong — and that's where the edge is.

**Binary markets** (Yes/No):

```javascript
// A binary market has two outcomes: Yes and No
// If Yes = 52¢ and No = 51¢, that's 103% total — 3% edge exists
const total = yesPrice + noPrice;
const edge = Math.abs(1 - total) * 100;
// edge = 3.0% → someone is overpaying
```

If `total > 100%`, the No side is overpriced (sell pressure). If `total < 100%`, the Yes side is underpriced (buy opportunity).

**Multi-outcome markets** (e.g. "Who wins the election?"):

Each candidate is a separate binary market on Polymarket. Their Yes prices should sum to ~100%:

```javascript
// Trump: 45¢, Biden: 30¢, DeSantis: 15¢, Others: 8¢
// Total = 98¢ → 2% is "missing" → underpriced somewhere
const yesPrices = markets.map(m => parseYesPrice(m));
const total = yesPrices.reduce((a, b) => a + b, 0);
const deviation = Math.abs(1 - total) * 100;

// Only flag as mispricing if deviation ≤ 15%
// (huge deviations mean independent markets, not mispricing)
if (deviation <= 15) {
  edge = deviation;
}
```

The 15% cap is critical — some events group independent binary markets (e.g., "Bitcoin hits $X by date Y") where the sum naturally exceeds 100%. Without this filter, you'd see fake 400%+ edges.

### 2. Edge Direction (Which side to take)

Once an edge is detected, the algorithm determines which specific outcome is mispriced:

```javascript
// Multi-outcome: if total > 100%, the top-priced choice is likely overvalued
// If total < 100%, the cheapest choice is likely undervalued
if (total > 1.0) → highest-priced outcome is overpriced
if (total < 1.0) → lowest-priced outcome is underpriced
```

For binary markets:
- `Yes + No > 100%` → **No side** is overpriced
- `Yes + No < 100%` → **Yes side** is underpriced

### 3. Trust Score (Confidence Filter)

Not every edge is worth trading. A 5% edge on a $500 liquidity market is noise. The trust score filters out garbage:

```
Starting score: 100%

Deductions:
- Volume < $50K       → -15%
- Liquidity < $25K    → -20%
- Ending in < 1 hour  → -30%
- Price spread > 10%  → -10%

Final score bucketed:
- ≥ 80%  → High confidence (green)
- ≥ 50%  → Medium (orange)
- < 50%  → Low (red) — filtered out by default
```

Markets below 50% trust are excluded entirely. The "Verified Only" filter raises this to 80%.

### 4. Hot Deal Scoring

Separately from mispricing, events are scored on trading potential:

| Factor | Points | Condition |
|---|---|---|
| Volume | +30 | > $1M traded |
| Liquidity | +25 | > $100K available |
| Uncertainty | +20 | Price near 50/50 (maximum uncertainty) |
| Timing | +25 | 1-7 days until resolution |

Events scoring 70+ with good data quality get a "Hot Deal" badge.

### 5. CEX Lag Detection

Crypto prediction markets often lag behind centralized exchange (CEX) prices. This module:

1. Connects to **Binance WebSocket** for real-time BTC/ETH/SOL prices
2. Maps crypto-related Polymarket events to their corresponding Binance pairs
3. Detects when a significant price move on Binance hasn't been reflected in the prediction market odds yet
4. Flags the lag with direction and magnitude

### 6. Real-time Price Updates

All market prices update live via **Polymarket WebSocket (CLOB API)**:

- On page load, token IDs are extracted from all visible markets
- A WebSocket connection subscribes to price changes for those tokens
- Price changes trigger green/red flash animations on the affected outcome
- Edge calculations are re-evaluated with every price tick

---

## Architecture

```
src/
├── pages/
│   └── Deals.jsx           # Main market scanner page
│                            # - Fetches 200 events from Polymarket Gamma API
│                            # - Scores each event (edge, trust, hot deal)
│                            # - Renders MarketCard grid with live prices
│
├── hooks/
│   ├── usePolymarketWS.js   # WebSocket for live Polymarket prices
│   ├── useBinanceWS.js      # WebSocket for live Binance prices
│   ├── useAlphaTracker.js   # Tracks edge signals over time
│   └── useNews.js           # Fetches matched news articles
│
├── components/
│   ├── Header.jsx           # Fixed nav bar
│   ├── Hero.jsx             # Landing page hero
│   ├── About.jsx            # Feature explanation cards
│   ├── CexLagDetector.jsx   # Binance vs Polymarket lag monitor
│   ├── ProofOfAlpha.jsx     # Historical edge tracking dashboard
│   ├── NewsFeed.jsx         # News matched to active markets
│   └── ...
│
└── utils/
    ├── marketUtils.js       # Price parsing, date utils, market helpers
    └── tokenMapping.js      # Maps events → CLOB token IDs for WebSocket
```

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 18, Vite 7 |
| Styling | Tailwind CSS v4 (CSS-based config) |
| Animations | Framer Motion |
| Data | Polymarket Gamma API + CLOB WebSocket |
| CEX Prices | Binance WebSocket |
| Font | Cabin (Google Fonts) |
| Hosting | Vercel (with API rewrites as proxy) |

---

## API Proxying

In production, API calls are proxied through Vercel rewrites to avoid CORS issues:

```json
{
  "rewrites": [
    { "source": "/api/polymarket/:path*", "destination": "https://gamma-api.polymarket.com/:path*" },
    { "source": "/api/news/:path*", "destination": "https://news.google.com/rss/:path*" }
  ]
}
```

In development, Vite's proxy serves the same purpose.

---

## Disclaimer

This is an analysis tool, not financial advice. Prediction markets involve real money and real risk. Always do your own research.
