import { NextResponse } from 'next/server'
import type { OHLCVBar } from '@/lib/market/yahoo'

const TF_TO_YAHOO_INTERVAL: Record<string, string> = {
  '1m': '1m', '5m': '5m', '15m': '15m', '30m': '30m',
  '1h': '60m', '4h': '1h', '1d': '1d', '1wk': '1wk',
}
const TF_TO_RANGE: Record<string, string> = {
  '1m': '1d', '5m': '5d', '15m': '7d', '30m': '14d',
  '1h': '60d', '4h': '60d', '1d': '2y', '1wk': '5y',
}

const BASE_PRICES: Record<string, number> = {
  'GC=F': 2685, 'EURUSD=X': 1.0875, 'GBPUSD=X': 1.2980,
  'GBPJPY=X': 196.50, 'JPY=X': 149.80, 'USDJPY=X': 149.80,
  'AUDUSD=X': 0.6520, 'CAD=X': 1.3750, 'SI=F': 31.50,
  'NQ=F': 19800, 'XAGUSD=X': 31.50,
}
const VOLATILITIES: Record<string, number> = {
  'GC=F': 0.0025, 'EURUSD=X': 0.00035, 'GBPUSD=X': 0.00045,
  'GBPJPY=X': 0.005, 'JPY=X': 0.003, 'USDJPY=X': 0.003,
  'AUDUSD=X': 0.00045, 'CAD=X': 0.00025, 'SI=F': 0.006,
  'NQ=F': 0.004, 'XAGUSD=X': 0.006,
}

function generateMockBars(ticker: string, tf: string, count: number): OHLCVBar[] {
  const tfMinutes: Record<string, number> = {
    '1m': 1, '5m': 5, '15m': 15, '30m': 30,
    '60m': 60, '1h': 60, '4h': 240, '1d': 1440, '1wk': 10080,
  }
  const interval = TF_TO_YAHOO_INTERVAL[tf] || '15m'
  const minutes = tfMinutes[interval] ?? 15
  const intervalSec = minutes * 60

  const basePrice = BASE_PRICES[ticker] ?? 1.1
  const vol = VOLATILITIES[ticker] ?? 0.001
  const now = Math.floor(Date.now() / 1000)
  // Align to bar boundaries
  const alignedNow = Math.floor(now / intervalSec) * intervalSec
  const startTime = alignedNow - (count - 1) * intervalSec

  const bars: OHLCVBar[] = []
  let price = basePrice * (0.97 + Math.random() * 0.06)

  for (let i = 0; i < count; i++) {
    const time = startTime + i * intervalSec
    // Brownian motion with multiple frequency trends
    const fastTrend = Math.sin(i / 12) * vol * 0.8
    const slowTrend = Math.sin(i / 80) * vol * 1.2
    const noise = (Math.random() - 0.498) * vol * 2.5
    const change = noise + fastTrend + slowTrend

    const open = price
    const closeP = Math.max(open * 0.8, open * (1 + change))
    const wicks = vol * open * (0.3 + Math.random() * 0.5)
    const high = Math.max(open, closeP) + wicks
    const low = Math.min(open, closeP) - wicks
    const volume = Math.floor(1000 + Math.random() * 8000)

    bars.push({ time, open, high, low, close: closeP, volume })
    price = closeP
  }
  return bars
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const ticker = searchParams.get('ticker')
  const tf = searchParams.get('tf') || '15m'
  const limit = parseInt(searchParams.get('limit') || '300')

  if (!ticker) {
    return NextResponse.json({ error: 'ticker required' }, { status: 400 })
  }

  const interval = TF_TO_YAHOO_INTERVAL[tf] || '15m'
  const range = TF_TO_RANGE[tf] || '7d'

  // Try multiple Yahoo endpoints with a short timeout
  const ENDPOINTS = [
    `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=${interval}&range=${range}&includePrePost=false`,
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=${interval}&range=${range}&includePrePost=false`,
  ]

  for (const url of ENDPOINTS) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 5000) // 5s timeout

      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://finance.yahoo.com',
        },
      })
      clearTimeout(timeout)

      if (!res.ok) continue

      const json = await res.json()
      const result = json?.chart?.result?.[0]
      if (!result) continue

      const timestamps: number[] = result.timestamp || []
      const quotes = result.indicators?.quote?.[0] || {}

      const bars: OHLCVBar[] = []
      for (let i = 0; i < timestamps.length; i++) {
        const o = quotes.open?.[i]
        const h = quotes.high?.[i]
        const l = quotes.low?.[i]
        const c = quotes.close?.[i]
        const v = quotes.volume?.[i] ?? 0
        if (o == null || h == null || l == null || c == null) continue
        bars.push({ time: timestamps[i], open: o, high: h, low: l, close: c, volume: v })
      }

      if (bars.length < 10) continue // too little data, use mock

      const sliced = bars.slice(-limit)
      return NextResponse.json({ bars: sliced, count: sliced.length, source: 'yahoo' })

    } catch {
      // Try next endpoint
      continue
    }
  }

  // Fallback: return realistic mock data (always 200)
  console.log(`[OHLCV] Using mock data for ${ticker}`)
  const mockBars = generateMockBars(ticker, tf, limit)
  return NextResponse.json({ bars: mockBars, count: mockBars.length, source: 'mock' })
}
