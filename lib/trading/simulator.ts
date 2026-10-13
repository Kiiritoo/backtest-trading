import type { SymbolConfig } from '../market/symbols'

export interface TradeCalculation {
  pipValue: number        // per pip per lot in account currency
  marginRequired: number  // in account currency
  fees: number            // commission in account currency
  lotPnL: number          // P&L per pip
  maxLots: number         // max affordable lots
}

export interface PnLResult {
  pips: number
  pnlUSD: number
  pnlIDR: number
  percentOfBalance: number
}

const USD_TO_IDR = 16000

export function calcPnL(
  direction: 'BUY' | 'SELL',
  entryPrice: number,
  currentPrice: number,
  lotSize: number,
  symbol: SymbolConfig,
  accountCurrency: 'IDR' | 'USD' | 'EUR' = 'IDR'
): PnLResult {
  const priceDiff = direction === 'BUY'
    ? currentPrice - entryPrice
    : entryPrice - currentPrice

  const pips = priceDiff / symbol.pipSize
  const pnlUSD = pips * symbol.pipValue * lotSize

  return {
    pips,
    pnlUSD,
    pnlIDR: pnlUSD * USD_TO_IDR,
    percentOfBalance: 0, // calculated externally with balance
  }
}

export function calcMarginRequired(
  price: number,
  lotSize: number,
  leverage: number,
  symbol: SymbolConfig
): number {
  const notional = price * symbol.contractSize * lotSize
  const marginUSD = notional / leverage
  return marginUSD * USD_TO_IDR // convert to IDR
}

export function calcLotFromRisk(
  riskPercent: number,
  balance: number,
  slPips: number,
  symbol: SymbolConfig,
  accountCurrency: 'IDR' | 'USD' | 'EUR' = 'IDR'
): number {
  if (slPips <= 0) return symbol.minLot
  const riskAmount = (riskPercent / 100) * balance
  const riskAmountUSD = accountCurrency === 'IDR' ? riskAmount / USD_TO_IDR : riskAmount
  const lotSize = riskAmountUSD / (slPips * symbol.pipValue)
  // Round to lot step
  const rounded = Math.round(lotSize / symbol.lotStep) * symbol.lotStep
  return Math.max(symbol.minLot, Math.min(symbol.maxLot, parseFloat(rounded.toFixed(2))))
}

export function formatPrice(price: number, decimals: number): string {
  return price.toFixed(decimals)
}

export function formatPips(pips: number): string {
  return (pips >= 0 ? '+' : '') + pips.toFixed(1)
}

export function formatPnL(pnl: number, currency: string = 'IDR'): string {
  const sign = pnl >= 0 ? '+' : ''
  if (currency === 'IDR') {
    return sign + new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(pnl)
  }
  return sign + new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
  }).format(pnl)
}

// Check if SL or TP is hit
export function checkSLTP(
  direction: 'BUY' | 'SELL',
  currentBar: { high: number; low: number; close: number },
  sl: number | null,
  tp: number | null
): 'SL' | 'TP' | null {
  if (direction === 'BUY') {
    if (sl !== null && currentBar.low <= sl) return 'SL'
    if (tp !== null && currentBar.high >= tp) return 'TP'
  } else {
    if (sl !== null && currentBar.high >= sl) return 'SL'
    if (tp !== null && currentBar.low <= tp) return 'TP'
  }
  return null
}

export function getExitPrice(
  trigger: 'SL' | 'TP',
  direction: 'BUY' | 'SELL',
  sl: number | null,
  tp: number | null,
  closePrice: number
): number {
  if (trigger === 'SL') return sl ?? closePrice
  if (trigger === 'TP') return tp ?? closePrice
  return closePrice
}
