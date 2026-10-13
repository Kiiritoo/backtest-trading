import { TF_TO_YAHOO } from './symbols'

export interface OHLCVBar {
  time: number  // Unix timestamp seconds
  open: number
  high: number
  low: number
  close: number
  volume: number
}

// Cache to avoid hitting Yahoo too often
const barCache: Record<string, { bars: OHLCVBar[], fetchedAt: number }> = {}
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export async function fetchOHLCV(
  yahooTicker: string,
  timeframe: string,
  limit: number = 300
): Promise<OHLCVBar[]> {
  const cacheKey = `${yahooTicker}_${timeframe}`
  const cached = barCache[cacheKey]
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
    return cached.bars
  }

  try {
    const res = await fetch(`/api/market/ohlcv?ticker=${encodeURIComponent(yahooTicker)}&tf=${timeframe}&limit=${limit}`)
    if (!res.ok) throw new Error('API error')
    const data = await res.json()
    const bars: OHLCVBar[] = data.bars || []
    barCache[cacheKey] = { bars, fetchedAt: Date.now() }
    return bars
  } catch (err) {
    console.warn('Failed to fetch OHLCV, using mock data', err)
    return generateMockBars(yahooTicker, timeframe, limit)
  }
}

// Generate realistic mock data as fallback
export function generateMockBars(
  ticker: string,
  timeframe: string,
  count: number = 300
): OHLCVBar[] {
  const tfMinutes: Record<string, number> = {
    '1m': 1, '5m': 5, '15m': 15, '30m': 30,
    '60m': 60, '1h': 60, '4h': 240, '1d': 1440, '1wk': 10080,
  }
  const intervalMs = (tfMinutes[TF_TO_YAHOO[timeframe] || timeframe] || 60) * 60 * 1000

  // Base prices for different instruments
  const basePrices: Record<string, number> = {
    'GC=F': 2350,
    'EURUSD=X': 1.0850,
    'GBPUSD=X': 1.2650,
    'GBPJPY=X': 195.50,
    'JPY=X': 149.50,
    'AUDUSD=X': 0.6580,
    'CAD=X': 1.3620,
    'SI=F': 27.50,
    'NQ=F': 19500,
  }

  const volatilities: Record<string, number> = {
    'GC=F': 0.003,
    'EURUSD=X': 0.0004,
    'GBPUSD=X': 0.0005,
    'GBPJPY=X': 0.006,
    'JPY=X': 0.004,
    'AUDUSD=X': 0.0005,
    'CAD=X': 0.0003,
    'SI=F': 0.008,
    'NQ=F': 0.005,
  }

  const basePrice = basePrices[ticker] || 1.0
  const vol = volatilities[ticker] || 0.001
  const now = Math.floor(Date.now() / 1000)
  const startTime = now - count * (intervalMs / 1000)

  const bars: OHLCVBar[] = []
  let price = basePrice

  for (let i = 0; i < count; i++) {
    const time = startTime + i * (intervalMs / 1000)
    // Brownian motion + trend
    const trend = Math.sin(i / 50) * vol * 0.5
    const change = (Math.random() - 0.5) * vol * 2 + trend
    const open = price
    const closeP = open + open * change
    const high = Math.max(open, closeP) + open * Math.random() * vol * 0.5
    const low = Math.min(open, closeP) - open * Math.random() * vol * 0.5
    const volume = Math.floor(Math.random() * 5000 + 1000)

    bars.push({ time, open, high, low, close: closeP, volume })
    price = closeP
  }

  return bars
}

// Get current price (latest close)
export function getCurrentPrice(bars: OHLCVBar[]): number {
  if (bars.length === 0) return 0
  return bars[bars.length - 1].close
}
