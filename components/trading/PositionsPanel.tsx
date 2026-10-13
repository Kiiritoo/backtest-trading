'use client'

import { useState, useEffect, useRef } from 'react'
import { useTradingStore } from '@/lib/store/trading-store'
import type { Trade } from '@/lib/store/trading-store'
import { SYMBOLS, formatCurrency } from '@/lib/market/symbols'
import { calcPnL } from '@/lib/trading/simulator'

interface Props {
  openTrades: Trade[]
  currentPrice: number
  activeSymbol: string
}

type TabType = 'open' | 'closed'

export default function PositionsPanel({ openTrades, currentPrice, activeSymbol }: Props) {
  const allTrades = useTradingStore(s => s.trades)
  const closeTrade = useTradingStore(s => s.closeTrade)
  const cancelTrade = useTradingStore(s => s.cancelTrade)
  const updateTradeTP = useTradingStore(s => s.updateTradeTP)
  const updateTradeSL = useTradingStore(s => s.updateTradeSL)
  const activeAccountId = useTradingStore(s => s.activeAccountId)
  const isReplayMode = useTradingStore(s => s.isReplayMode)
  const currentBarIndex = useTradingStore(s => s.currentBarIndex)
  const bars = useTradingStore(s => s.bars)

  const [tab, setTab] = useState<TabType>('open')
  const [pnls, setPnls] = useState<Record<string, { pnlIDR: number; pips: number }>>({})
  const [editingTP, setEditingTP] = useState<string | null>(null)
  const [editingSL, setEditingSL] = useState<string | null>(null)
  const [tpVal, setTpVal] = useState('')
  const [slVal, setSlVal] = useState('')

  const closedTrades = allTrades.filter(
    t => t.status === 'CLOSED' && t.accountId === activeAccountId
  )

  // Update floating P&L
  useEffect(() => {
    const next: Record<string, { pnlIDR: number; pips: number }> = {}
    openTrades.forEach(trade => {
      const sym = SYMBOLS.find(s => s.symbol === trade.symbol)
      if (!sym) return
      // Use currentPrice for active symbol, else use last bar close
      let price = currentPrice
      if (trade.symbol !== activeSymbol && bars.length > 0) {
        price = bars[Math.min(currentBarIndex, bars.length - 1)]?.close ?? currentPrice
      }
      const result = calcPnL(trade.direction, trade.entryPrice, price, trade.lotSize, sym, 'IDR')
      next[trade.id] = { pnlIDR: result.pnlIDR, pips: result.pips }
    })
    setPnls(next)
  }, [openTrades, currentPrice, activeSymbol, currentBarIndex, bars])

  const totalPnL = Object.values(pnls).reduce((s, v) => s + v.pnlIDR, 0)

  function handleCloseAll() {
    openTrades.forEach(t => closeTrade(t.id, currentPrice, 'MANUAL'))
  }

  function handleCloseTrade(trade: Trade) {
    closeTrade(trade.id, currentPrice, 'MANUAL')
  }

  function startEditTP(trade: Trade) {
    setEditingTP(trade.id)
    setTpVal(trade.takeProfit?.toFixed(SYMBOLS.find(s => s.symbol === trade.symbol)?.decimals ?? 5) ?? '')
  }
  function startEditSL(trade: Trade) {
    setEditingSL(trade.id)
    setSlVal(trade.stopLoss?.toFixed(SYMBOLS.find(s => s.symbol === trade.symbol)?.decimals ?? 5) ?? '')
  }
  function commitTP(tradeId: string) {
    const v = parseFloat(tpVal)
    updateTradeTP(tradeId, isNaN(v) ? null : v)
    setEditingTP(null)
  }
  function commitSL(tradeId: string) {
    const v = parseFloat(slVal)
    updateTradeSL(tradeId, isNaN(v) ? null : v)
    setEditingSL(null)
  }

  return (
    <div className="positions-panel">
      {/* Header tabs */}
      <div className="positions-header">
        <div className="tabs">
          <button
            className={`tab ${tab === 'open' ? 'active' : ''}`}
            onClick={() => setTab('open')} id="pos-tab-open"
          >
            Open
            {openTrades.length > 0 && (
              <span style={{
                marginLeft: '5px', background: 'var(--accent-blue)', color: 'white',
                borderRadius: '10px', padding: '0 6px', fontSize: '10px', fontWeight: 700,
              }}>{openTrades.length}</span>
            )}
          </button>
          <button
            className={`tab ${tab === 'closed' ? 'active' : ''}`}
            onClick={() => setTab('closed')} id="pos-tab-closed"
          >
            History
            {closedTrades.length > 0 && (
              <span style={{
                marginLeft: '5px', background: 'var(--bg-hover)', color: 'var(--text-muted)',
                borderRadius: '10px', padding: '0 6px', fontSize: '10px',
              }}>{closedTrades.length}</span>
            )}
          </button>
        </div>

        {tab === 'open' && openTrades.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginLeft: 'auto' }}>
            <span style={{
              fontSize: '12px', fontWeight: 700,
              fontFamily: 'JetBrains Mono, monospace',
              color: totalPnL >= 0 ? 'var(--profit-color)' : 'var(--loss-color)',
            }}>
              Float: {totalPnL >= 0 ? '+' : ''}{formatCurrency(totalPnL)}
            </span>
            <button
              className="btn btn-ghost btn-sm"
              onClick={handleCloseAll}
              id="close-all-btn"
              style={{ fontSize: '11px', color: 'var(--sell-color)', borderColor: 'var(--sell-color)' }}
            >
              Close All
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="positions-table">
        {tab === 'open' && (
          openTrades.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📭</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                {isReplayMode
                  ? 'Replay mode active — enter a trade to start backtesting'
                  : 'No open positions'}
              </div>
            </div>
          ) : (
            <>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '85px 50px 65px 100px 110px 110px 100px 80px 80px',
                padding: '6px 12px',
                fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)',
                textTransform: 'uppercase', letterSpacing: '0.5px',
                borderBottom: '1px solid var(--border-subtle)',
                background: 'var(--bg-secondary)',
              }}>
                <span>Symbol</span><span>Dir</span><span>Lot</span>
                <span>Entry</span><span>TP ✎</span><span>SL ✎</span>
                <span>Float P&L</span><span>Pips</span><span>Action</span>
              </div>

              {openTrades.map(trade => {
                const sym = SYMBOLS.find(s => s.symbol === trade.symbol)
                const dec = sym?.decimals ?? 5
                const pl = pnls[trade.id]
                const isEditTP = editingTP === trade.id
                const isEditSL = editingSL === trade.id

                return (
                  <div key={trade.id} style={{
                    display: 'grid',
                    gridTemplateColumns: '85px 50px 65px 100px 110px 110px 100px 80px 80px',
                    padding: '8px 12px',
                    borderBottom: '1px solid var(--border-subtle)',
                    fontSize: '12px', alignItems: 'center',
                    background: pl && pl.pnlIDR > 0 ? 'rgba(16,185,129,0.02)' : pl && pl.pnlIDR < 0 ? 'rgba(239,68,68,0.02)' : undefined,
                  }}>
                    <span style={{ fontWeight: 700, fontSize: '12px' }}>
                      {sym?.icon} {sym?.displayName ?? trade.symbol}
                    </span>
                    <span>
                      <span className={`badge ${trade.direction === 'BUY' ? 'badge-buy' : 'badge-sell'}`}>
                        {trade.direction}
                      </span>
                    </span>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{trade.lotSize}</span>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px' }}>
                      {trade.entryPrice.toFixed(dec)}
                    </span>

                    {/* TP editable cell */}
                    <span>
                      {isEditTP ? (
                        <div style={{ display: 'flex', gap: '2px' }}>
                          <input
                            style={{ width: '70px', padding: '2px 4px', fontSize: '11px', fontFamily: 'JetBrains Mono, monospace', background: 'var(--bg-hover)', border: '1px solid var(--profit-color)', borderRadius: '4px', color: 'var(--text-primary)' }}
                            value={tpVal}
                            onChange={e => setTpVal(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') commitTP(trade.id); if (e.key === 'Escape') setEditingTP(null) }}
                            autoFocus
                          />
                          <button onClick={() => commitTP(trade.id)} style={{ padding: '2px 4px', fontSize: '10px', background: 'var(--profit-color)', border: 'none', borderRadius: '3px', cursor: 'pointer', color: 'white' }}>✓</button>
                        </div>
                      ) : (
                        <span
                          style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: 'var(--profit-color)', cursor: 'pointer', textDecoration: 'underline dotted' }}
                          onClick={() => startEditTP(trade)}
                          title="Click to edit TP"
                        >
                          {trade.takeProfit?.toFixed(dec) ?? '—'}
                        </span>
                      )}
                    </span>

                    {/* SL editable cell */}
                    <span>
                      {isEditSL ? (
                        <div style={{ display: 'flex', gap: '2px' }}>
                          <input
                            style={{ width: '70px', padding: '2px 4px', fontSize: '11px', fontFamily: 'JetBrains Mono, monospace', background: 'var(--bg-hover)', border: '1px solid var(--loss-color)', borderRadius: '4px', color: 'var(--text-primary)' }}
                            value={slVal}
                            onChange={e => setSlVal(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') commitSL(trade.id); if (e.key === 'Escape') setEditingSL(null) }}
                            autoFocus
                          />
                          <button onClick={() => commitSL(trade.id)} style={{ padding: '2px 4px', fontSize: '10px', background: 'var(--loss-color)', border: 'none', borderRadius: '3px', cursor: 'pointer', color: 'white' }}>✓</button>
                        </div>
                      ) : (
                        <span
                          style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: 'var(--loss-color)', cursor: 'pointer', textDecoration: 'underline dotted' }}
                          onClick={() => startEditSL(trade)}
                          title="Click to edit SL"
                        >
                          {trade.stopLoss?.toFixed(dec) ?? '—'}
                        </span>
                      )}
                    </span>

                    {/* P&L */}
                    <span className={pl && pl.pnlIDR >= 0 ? 'pnl-positive' : 'pnl-negative'} style={{ fontSize: '12px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>
                      {pl ? `${pl.pnlIDR >= 0 ? '+' : ''}${(pl.pnlIDR / 1000).toFixed(1)}K` : '—'}
                    </span>

                    {/* Pips */}
                    <span className={pl && pl.pips >= 0 ? 'pnl-positive' : 'pnl-negative'} style={{ fontSize: '11px', fontFamily: 'JetBrains Mono, monospace' }}>
                      {pl ? `${pl.pips >= 0 ? '+' : ''}${pl.pips.toFixed(1)}` : '—'}
                    </span>

                    {/* Action */}
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleCloseTrade(trade)}
                        id={`close-trade-${trade.id}`}
                        style={{ fontSize: '10px', padding: '3px 8px', color: 'var(--sell-color)', borderColor: 'var(--sell-color)', whiteSpace: 'nowrap' }}
                      >
                        Close
                      </button>
                    </div>
                  </div>
                )
              })}
            </>
          )
        )}

        {tab === 'closed' && (
          closedTrades.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📊</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>No trade history yet</div>
            </div>
          ) : (
            <>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '85px 50px 65px 95px 95px 100px 80px 60px 1fr',
                padding: '6px 12px',
                fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)',
                textTransform: 'uppercase', letterSpacing: '0.5px',
                borderBottom: '1px solid var(--border-subtle)',
                background: 'var(--bg-secondary)',
              }}>
                <span>Symbol</span><span>Dir</span><span>Lot</span>
                <span>Entry</span><span>Exit</span><span>P&L</span>
                <span>Close By</span><span>Pips</span><span>Gacha</span>
              </div>

              {closedTrades.slice().reverse().map(trade => {
                const sym = SYMBOLS.find(s => s.symbol === trade.symbol)
                const dec = sym?.decimals ?? 5
                const pnl = trade.pnlIDR ?? 0
                return (
                  <div key={trade.id} style={{
                    display: 'grid',
                    gridTemplateColumns: '85px 50px 65px 95px 95px 100px 80px 60px 1fr',
                    padding: '8px 12px',
                    borderBottom: '1px solid var(--border-subtle)',
                    fontSize: '12px', alignItems: 'center',
                    background: pnl > 0 ? 'rgba(16,185,129,0.02)' : 'rgba(239,68,68,0.02)',
                  }}>
                    <span style={{ fontWeight: 700 }}>{sym?.icon} {sym?.displayName ?? trade.symbol}</span>
                    <span><span className={`badge ${trade.direction === 'BUY' ? 'badge-buy' : 'badge-sell'}`}>{trade.direction}</span></span>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{trade.lotSize}</span>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px' }}>{trade.entryPrice.toFixed(dec)}</span>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px' }}>{trade.exitPrice?.toFixed(dec) ?? '—'}</span>
                    <span className={pnl >= 0 ? 'pnl-positive' : 'pnl-negative'} style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>
                      {pnl >= 0 ? '+' : ''}{(pnl / 1000).toFixed(1)}K
                    </span>
                    <span>
                      <span className={`badge ${trade.closeReason === 'TP' ? 'badge-buy' : trade.closeReason === 'SL' ? 'badge-sell' : 'badge-info'}`}>
                        {trade.closeReason ?? 'MANUAL'}
                      </span>
                    </span>
                    <span className={((trade.pnlPips ?? 0) >= 0) ? 'pnl-positive' : 'pnl-negative'} style={{ fontSize: '11px', fontFamily: 'JetBrains Mono, monospace' }}>
                      {((trade.pnlPips ?? 0) >= 0) ? '+' : ''}{(trade.pnlPips ?? 0).toFixed(1)}
                    </span>
                    <span style={{ fontSize: '13px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                      {trade.gachaReward?.card.icon}{' '}
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{trade.gachaReward?.card.name}</span>
                      {' '}
                      <span style={{
                        fontSize: '9px', fontWeight: 700, padding: '1px 5px', borderRadius: '10px',
                        background: trade.gachaReward?.card.rarity === 'legendary' ? 'rgba(245,158,11,0.2)' :
                                    trade.gachaReward?.card.rarity === 'epic' ? 'rgba(139,92,246,0.2)' :
                                    trade.gachaReward?.card.rarity === 'rare' ? 'rgba(59,130,246,0.2)' : 'rgba(107,114,128,0.2)',
                        color: trade.gachaReward?.card.rarity === 'legendary' ? '#fbbf24' :
                               trade.gachaReward?.card.rarity === 'epic' ? '#c4b5fd' :
                               trade.gachaReward?.card.rarity === 'rare' ? '#60a5fa' : '#9ca3af',
                        textTransform: 'uppercase',
                      }}>
                        {trade.gachaReward?.card.rarity}
                      </span>
                    </span>
                  </div>
                )
              })}
            </>
          )
        )}
      </div>
    </div>
  )
}
