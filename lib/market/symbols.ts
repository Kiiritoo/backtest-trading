// Supported trading instruments
export interface SymbolConfig {
  symbol: string
  name: string
  displayName: string
  category: 'forex' | 'metals' | 'indices' | 'crypto'
  icon: string
  color: string
  pipSize: number         // 1 pip in price units
  pipValue: number        // 1 pip value per lot in USD
  contractSize: number    // units per lot
  minLot: number
  maxLot: number
  lotStep: number
  spreadPips: number
  yahooTicker: string     // Yahoo Finance ticker
  decimals: number
}

export const SYMBOLS: SymbolConfig[] = [
  {
    symbol: 'XAUUSD',
    name: 'Gold vs US Dollar',
    displayName: 'XAU/USD',
    category: 'metals',
    icon: '🥇',
    color: '#f59e0b',
    pipSize: 0.01,
    pipValue: 1.0,
    contractSize: 100,
    minLot: 0.01,
    maxLot: 100,
    lotStep: 0.01,
    spreadPips: 20,
    yahooTicker: 'GC=F',
    decimals: 2,
  },
  {
    symbol: 'EURUSD',
    name: 'Euro vs US Dollar',
    displayName: 'EUR/USD',
    category: 'forex',
    icon: '🇪🇺',
    color: '#3b82f6',
    pipSize: 0.0001,
    pipValue: 10.0,
    contractSize: 100000,
    minLot: 0.01,
    maxLot: 100,
    lotStep: 0.01,
    spreadPips: 1.5,
    yahooTicker: 'EURUSD=X',
    decimals: 5,
  },
  {
    symbol: 'GBPUSD',
    name: 'British Pound vs US Dollar',
    displayName: 'GBP/USD',
    category: 'forex',
    icon: '🇬🇧',
    color: '#8b5cf6',
    pipSize: 0.0001,
    pipValue: 10.0,
    contractSize: 100000,
    minLot: 0.01,
    maxLot: 100,
    lotStep: 0.01,
    spreadPips: 2,
    yahooTicker: 'GBPUSD=X',
    decimals: 5,
  },
  {
    symbol: 'GBPJPY',
    name: 'British Pound vs Japanese Yen',
    displayName: 'GBP/JPY',
    category: 'forex',
    icon: '🇯🇵',
    color: '#ef4444',
    pipSize: 0.01,
    pipValue: 0.0667,
    contractSize: 100000,
    minLot: 0.01,
    maxLot: 100,
    lotStep: 0.01,
    spreadPips: 3,
    yahooTicker: 'GBPJPY=X',
    decimals: 3,
  },
  {
    symbol: 'USDJPY',
    name: 'US Dollar vs Japanese Yen',
    displayName: 'USD/JPY',
    category: 'forex',
    icon: '💴',
    color: '#06b6d4',
    pipSize: 0.01,
    pipValue: 0.0667,
    contractSize: 100000,
    minLot: 0.01,
    maxLot: 100,
    lotStep: 0.01,
    spreadPips: 1.5,
    yahooTicker: 'JPY=X',
    decimals: 3,
  },
  {
    symbol: 'AUDUSD',
    name: 'Australian Dollar vs US Dollar',
    displayName: 'AUD/USD',
    category: 'forex',
    icon: '🦘',
    color: '#10b981',
    pipSize: 0.0001,
    pipValue: 10.0,
    contractSize: 100000,
    minLot: 0.01,
    maxLot: 100,
    lotStep: 0.01,
    spreadPips: 2,
    yahooTicker: 'AUDUSD=X',
    decimals: 5,
  },
  {
    symbol: 'USDCAD',
    name: 'US Dollar vs Canadian Dollar',
    displayName: 'USD/CAD',
    category: 'forex',
    icon: '🍁',
    color: '#f97316',
    pipSize: 0.0001,
    pipValue: 7.5,
    contractSize: 100000,
    minLot: 0.01,
    maxLot: 100,
    lotStep: 0.01,
    spreadPips: 2,
    yahooTicker: 'CAD=X',
    decimals: 5,
  },
  {
    symbol: 'XAGUSD',
    name: 'Silver vs US Dollar',
    displayName: 'XAG/USD',
    category: 'metals',
    icon: '🥈',
    color: '#94a3b8',
    pipSize: 0.001,
    pipValue: 50.0,
    contractSize: 5000,
    minLot: 0.01,
    maxLot: 100,
    lotStep: 0.01,
    spreadPips: 3,
    yahooTicker: 'SI=F',
    decimals: 3,
  },
  {
    symbol: 'NAS100',
    name: 'NASDAQ 100 Index',
    displayName: 'NAS100',
    category: 'indices',
    icon: '📊',
    color: '#60a5fa',
    pipSize: 0.01,
    pipValue: 1.0,
    contractSize: 1,
    minLot: 0.01,
    maxLot: 100,
    lotStep: 0.01,
    spreadPips: 50,
    yahooTicker: 'NQ=F',
    decimals: 2,
  },
]

export const SYMBOL_MAP = Object.fromEntries(SYMBOLS.map(s => [s.symbol, s]))

export function getSymbol(symbol: string): SymbolConfig | undefined {
  return SYMBOL_MAP[symbol]
}

// Timeframes
export const TIMEFRAMES = [
  { label: '1m', value: '1m', minutes: 1 },
  { label: '5m', value: '5m', minutes: 5 },
  { label: '15m', value: '15m', minutes: 15 },
  { label: '30m', value: '30m', minutes: 30 },
  { label: '1h', value: '1h', minutes: 60 },
  { label: '4h', value: '4h', minutes: 240 },
  { label: 'D', value: '1d', minutes: 1440 },
  { label: 'W', value: '1wk', minutes: 10080 },
]

export const TF_TO_YAHOO: Record<string, string> = {
  '1m': '1m',
  '5m': '5m',
  '15m': '15m',
  '30m': '30m',
  '1h': '60m',
  '4h': '1h',
  '1d': '1d',
  '1wk': '1wk',
}

// Currency formatting
export function formatCurrency(amount: number, currency: string = 'IDR'): string {
  if (currency === 'IDR') {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

// IDR conversion (approximate)
export const USD_TO_IDR = 16000

export function toIDR(usd: number): number {
  return usd * USD_TO_IDR
}
