'use client'

import { useState, useEffect } from 'react'
import { SYMBOLS } from '@/lib/market/symbols'
import type { OHLCVBar } from '@/lib/market/yahoo'

interface Props {
  activeSymbol: string
  onSelectSymbol: (s: string) => void
  currentPrice: number
  bars: OHLCVBar[]
}

// Fake bid/ask spread simulation
function getBidAsk(price: number, spreadPips: number, pipSize: number) {
  const half = (spreadPips / 2) * pipSize
  return { bid: price - half, ask: price + half }
}

export default function InstrumentSidebar({ activeSymbol, onSelectSymbol, currentPrice, bars }: Props) {
  const [search, setSearch] = useState('')
  const [prices, setPrices] = useState<Record<string, number>>({})

  // Simulate price ticking for all symbols
  useEffect(() => {
    const baseMap: Record<string, number> = {
      XAUUSD: 2350, EURUSD: 1.0850, GBPUSD: 1.2650, GBPJPY: 195.50,
      USDJPY: 149.50, AUDUSD: 0.6580, USDCAD: 1.3620, XAGUSD: 27.50, NAS100: 19500,
    }
    setPrices(baseMap)

    const interval = setInterval(() => {
      setPrices(prev => {
        const next = { ...prev }
        SYMBOLS.forEach(s => {
          const vol = s.symbol === 'NAS100' ? 5 : s.pipSize * 3
          next[s.symbol] = (next[s.symbol] || baseMap[s.symbol] || 1) + (Math.random() - 0.5) * vol
        })
        return next
      })
    }, 2000)

    return () => clearInterval(interval)
  }, [])

  // Override active symbol price with chart price
  useEffect(() => {
    if (currentPrice > 0) {
      setPrices(prev => ({ ...prev, [activeSymbol]: currentPrice }))
    }
  }, [currentPrice, activeSymbol])

  const filtered = SYMBOLS.filter(s =>
    s.symbol.toLowerCase().includes(search.toLowerCase()) ||
    s.name.toLowerCase().includes(search.toLowerCase())
  )

  const categories = ['forex', 'metals', 'indices', 'crypto'] as const
  const grouped: Record<string, typeof SYMBOLS> = {}
  filtered.forEach(s => {
    if (!grouped[s.category]) grouped[s.category] = []
    grouped[s.category].push(s)
  })

  return (
    <div className="instrument-sidebar">
      <div className="sidebar-header">
        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
          Instruments
        </div>
        <div className="search-input-wrap">
          <svg className="search-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            id="instrument-search"
            placeholder="Cari symbol..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="instruments-table">
        <div className="instruments-table-header">
          <span>Symbol</span>
          <span>Bid</span>
          <span>Ask</span>
        </div>

        {categories.map(cat => {
          const syms = grouped[cat]
          if (!syms?.length) return null

          return (
            <div key={cat}>
              <div style={{
                padding: '5px 12px',
                fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)',
                textTransform: 'uppercase', letterSpacing: '0.8px',
                background: 'var(--bg-primary)',
                borderBottom: '1px solid var(--border-subtle)',
              }}>
                {cat}
              </div>
              {syms.map(sym => {
                const price = prices[sym.symbol] || sym.decimals
                const { bid, ask } = getBidAsk(price, sym.spreadPips, sym.pipSize)
                const isActive = sym.symbol === activeSymbol

                return (
                  <div
                    key={sym.symbol}
                    className={`instrument-row ${isActive ? 'active' : ''}`}
                    onClick={() => onSelectSymbol(sym.symbol)}
                    id={`instrument-${sym.symbol}`}
                  >
                    <div className="symbol-info">
                      <div className="symbol-icon" style={{ background: sym.color + '22', color: sym.color }}>
                        {sym.icon}
                      </div>
                      <div>
                        <div className="symbol-name">{sym.displayName}</div>
                      </div>
                    </div>
                    <div className="symbol-bid-ask bid-price" style={{ fontSize: '11px' }}>
                      {bid.toFixed(sym.decimals)}
                    </div>
                    <div className="symbol-bid-ask ask-price" style={{ fontSize: '11px' }}>
                      {ask.toFixed(sym.decimals)}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
