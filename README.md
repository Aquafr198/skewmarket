# SkewMarket

Real-time prediction market scanner that finds mispriced odds on Polymarket.

Built this because I got tired of manually checking hundreds of markets looking for edges. Now it does it for me.

## What it does

SkewMarket pulls 200+ live events from Polymarket every 60 seconds and runs them through scoring algorithms to find:

- **Mispriced markets** — when outcome prices don't add up to 100%, there's an edge. The bigger the gap, the bigger the opportunity.
- **Hot deals** — high volume + high liquidity + uncertain odds = markets worth watching.
- **CEX lag** — compares Binance spot prices to Polymarket odds in real-time. When crypto prices move on Binance but Polymarket hasn't caught up yet, that's free money (in theory).

Every edge gets tracked and verified when the market resolves. No cherry-picking, no hiding the misses.

## How the scoring works

**Edge Detection:**
The algo checks if Yes + No prices sum to exactly 1.00. If they don't, someone's wrong. Works on binary markets (Yes/No) and multi-outcome markets (multiple choices). It also tells you which side the edge is on so you actually know what to trade.

**Trust Score:**
Not all signals are equal. A 5% edge on a $500 volume market is probably just low liquidity noise. The trust score factors in volume, liquidity, time remaining, and price coherence to filter out garbage signals from real opportunities.

**CEX Lag Detector:**
Connects to Binance via WebSocket and compares crypto spot prices to related Polymarket events. If BTC pumps 3% on Binance and the "Will BTC hit $X" market on Polymarket is still at yesterday's odds, that's a lag opportunity.

## Tech stack

- React 18 + Vite 7
- Tailwind CSS v4
- Framer Motion
- WebSocket connections to both Polymarket and Binance
- Google News RSS feed matched to live markets
- Hosted on Vercel

## Features

- **Live price feed** — WebSocket prices update in real-time with green/red flash indicators
- **Category filters** — Politics, Crypto, Sports, Culture, Finance, Tech, etc.
- **Market filters** — Verified Only, Mispricing, Hot Deals, High Volume, Ending Soon
- **News tab** — Google News articles matched to active Polymarket events
- **Proof of Alpha** — historical tracking of every edge detected and whether it played out
- **Click to expand** — tap any card to see full edge analysis, which side to trade, and trust breakdown

## Run it locally

```bash
git clone https://github.com/Aquafr198/skewmarket.git
cd skewmarket
npm install
npm run dev
```

Opens on `localhost:5173`. The Polymarket and Binance APIs are public so no keys needed.

## Live

[skew-market.vercel.app](https://skew-market.vercel.app)

## Disclaimer

This is a tool for analysis, not financial advice. Prediction markets involve real money and real risk. Do your own research before trading. Past edges don't guarantee future results.
