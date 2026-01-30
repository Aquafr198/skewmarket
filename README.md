# SkewMarket

Real-time prediction market scanner that finds mispriced odds on Polymarket.

I got tired of manually scrolling through hundreds of markets trying to find edges. So I built something that does it for me, 24/7.

## What it does

SkewMarket scans 200+ live prediction markets and highlights the ones where the odds don't add up. When prices are off, there's an opportunity — and this tool finds it before you do.

- **Edge Detection** — spots when market prices deviate from where they should be, and tells you which side to look at
- **CEX Lag Detector** — catches moments where crypto prices moved on exchanges but prediction markets haven't reacted yet
- **Trust Score** — not every signal is worth your time. Each opportunity gets a reliability score so you don't waste money on noise
- **Proof of Alpha** — every edge is logged and tracked. When the market resolves, you see if it was right or not. Full transparency, no cherry-picking

## Features

- Live WebSocket price feeds with real-time updates
- Smart filters by category (Politics, Crypto, Sports, Finance...) and market type (Mispricing, Hot Deals, Ending Soon...)
- Click any market to see the full edge breakdown — which side, why, and how confident the signal is
- News feed with articles matched to active markets
- Works on desktop and mobile

## Live

[skew-market.vercel.app](https://skew-market.vercel.app)

## Disclaimer

This is an analysis tool, not financial advice. Prediction markets involve real money and real risk. Always do your own research.
