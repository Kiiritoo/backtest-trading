'use client'

import Link from 'next/link'
import { useTradingStore, useClosedTrades } from '@/lib/store/trading-store'
import { SYMBOLS, formatCurrency } from '@/lib/market/symbols'

export default function JournalPage() {
  const rawTrades = useTradingStore(s => s.trades)
  const accounts = useTradingStore(s => s.accounts)
  const streak = useTradingStore(s => s.streak)
  const allTrades = rawTrades.filter(t => t.status === 'CLOSED')

  const totalPnL = allTrades.reduce((s, t) => s + (t.pnlIDR ?? 0), 0)
  const winTrades = allTrades.filter(t => (t.pnlIDR ?? 0) > 0)
  const lossTrades = allTrades.filter(t => (t.pnlIDR ?? 0) <= 0)
  const winRate = allTrades.length > 0 ? (winTrades.length / allTrades.length * 100) : 0
  const avgWin = winTrades.length > 0 ? winTrades.reduce((s, t) => s + (t.pnlIDR ?? 0), 0) / winTrades.length : 0
  const avgLoss = lossTrades.length > 0 ? Math.abs(lossTrades.reduce((s, t) => s + (t.pnlIDR ?? 0), 0) / lossTrades.length) : 0
  const rr = avgLoss > 0 ? (avgWin / avgLoss).toFixed(2) : '-'

  // By symbol stats
  const bySymbol = SYMBOLS.map(sym => {
    const symTrades = allTrades.filter(t => t.symbol === sym.symbol)
    const pnl = symTrades.reduce((s, t) => s + (t.pnlIDR ?? 0), 0)
    const wins = symTrades.filter(t => (t.pnlIDR ?? 0) > 0).length
    return { sym, count: symTrades.length, pnl, winRate: symTrades.length > 0 ? (wins / symTrades.length * 100) : 0 }
  }).filter(s => s.count > 0).sort((a, b) => b.count - a.count)

  // Gacha collection
  const gachaCards = allTrades.map(t => t.gachaReward?.card).filter(Boolean)
  const legendary = gachaCards.filter(c => c?.rarity === 'legendary').length
  const epic = gachaCards.filter(c => c?.rarity === 'epic').length
  const rare = gachaCards.filter(c => c?.rarity === 'rare').length
  const common = gachaCards.filter(c => c?.rarity === 'common').length

  // Equity curve (simplified - running balance)
  const equityPoints = allTrades.reduce((acc, trade) => {
    const lastBalance = acc.length > 0 ? acc[acc.length - 1].balance : (accounts[0]?.initialBalance ?? 1000000)
    acc.push({ balance: lastBalance + (trade.pnlIDR ?? 0), trade })
    return acc
  }, [] as { balance: number; trade: typeof allTrades[0] }[])

  return (
    <div className="dashboard-root">
      <div style={{ display: 'flex', height: '100%' }}>
        {/* Sidebar */}
        <nav className="nav-sidebar">
          <Link href="/" className="nav-item" style={{ marginBottom: '12px' }}>
            <div className="logo-icon" style={{ width: '28px', height: '28px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M3 17l4-8 4 4 4-6 4 10" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </Link>
          <Link href="/dashboard" className="nav-item" title="Dashboard">📊</Link>
          <Link href="/trade" className="nav-item" title="Trade">📈</Link>
          <Link href="/journal" className="nav-item active" title="Journal">📓</Link>
        </nav>

        <div style={{ flex: 1, overflow: 'auto' }}>
          {/* Header */}
          <div className="dashboard-header" style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px' }}>
            <div>
              <h1 style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '-0.5px' }}>Trade Journal</h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '2px' }}>
                Analisa performa & koleksi gacha kamu
              </p>
            </div>
            <Link href="/trade" className="btn btn-primary">📈 Lanjut Trading</Link>
          </div>

          <div className="dashboard-content">
            {/* Stats grid */}
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
              {[
                { label: 'Total Trades', value: allTrades.length.toString(), color: '#3b82f6' },
                { label: 'Win Rate', value: `${winRate.toFixed(1)}%`, color: '#10b981' },
                { label: 'Total P&L', value: `${totalPnL >= 0 ? '+' : ''}${(totalPnL / 1000).toFixed(0)}K`, color: totalPnL >= 0 ? '#22c55e' : '#f87171' },
                { label: 'Avg Win', value: `+${(avgWin / 1000).toFixed(0)}K`, color: '#22c55e' },
                { label: 'Avg Loss', value: `-${(avgLoss / 1000).toFixed(0)}K`, color: '#f87171' },
                { label: 'Avg R:R', value: rr, color: '#f59e0b' },
                { label: 'Best Streak 🔥', value: streak.toString(), color: '#f59e0b' },
                { label: 'Legends 🌟', value: legendary.toString(), color: '#f59e0b' },
              ].map(s => (
                <div key={s.label} className="stat-card" style={{ '--stat-color': s.color } as React.CSSProperties}>
                  <div className="stat-label">{s.label}</div>
                  <div className="stat-value" style={{ fontSize: '20px', color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
              {/* By Symbol */}
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '12px', overflow: 'hidden' }}>
                <div style={{ padding: '16px', borderBottom: '1px solid var(--border-subtle)' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 700 }}>Performa per Pair</h3>
                </div>
                {bySymbol.length === 0 ? (
                  <div className="empty-state" style={{ padding: '32px' }}>
                    <div className="empty-state-icon">📊</div>
                    <div>Belum ada data</div>
                  </div>
                ) : (
                  bySymbol.map(({ sym, count, pnl, winRate }) => (
                    <div key={sym.symbol} style={{
                      display: 'flex', alignItems: 'center', padding: '10px 16px',
                      borderBottom: '1px solid var(--border-subtle)', gap: '12px',
                    }}>
                      <span style={{ fontSize: '18px' }}>{sym.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '12px', fontWeight: 700 }}>{sym.displayName}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{count} trades · {winRate.toFixed(0)}% win</div>
                      </div>
                      <div style={{
                        fontSize: '13px', fontWeight: 700,
                        fontFamily: 'JetBrains Mono, monospace',
                        color: pnl >= 0 ? 'var(--profit-color)' : 'var(--loss-color)',
                      }}>
                        {pnl >= 0 ? '+' : ''}{(pnl / 1000).toFixed(0)}K
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Gacha Collection */}
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '12px', overflow: 'hidden' }}>
                <div style={{ padding: '16px', borderBottom: '1px solid var(--border-subtle)' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 700 }}>🎰 Koleksi Gacha</h3>
                </div>
                <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  {[
                    { rarity: 'legendary', count: legendary, color: '#f59e0b', icon: '🌟' },
                    { rarity: 'epic', count: epic, color: '#8b5cf6', icon: '💎' },
                    { rarity: 'rare', count: rare, color: '#3b82f6', icon: '🔷' },
                    { rarity: 'common', count: common, color: '#6b7280', icon: '⬜' },
                  ].map(r => (
                    <div key={r.rarity} style={{
                      padding: '14px', borderRadius: '10px',
                      background: r.color + '11',
                      border: `1px solid ${r.color}33`,
                      textAlign: 'center',
                    }}>
                      <div style={{ fontSize: '24px' }}>{r.icon}</div>
                      <div style={{ fontSize: '22px', fontWeight: 900, color: r.color, fontFamily: 'JetBrains Mono, monospace' }}>{r.count}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{r.rarity}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Equity Curve */}
            {equityPoints.length > 1 && (
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px' }}>📈 Equity Curve</h3>
                <div style={{ height: '120px', position: 'relative', display: 'flex', alignItems: 'flex-end', gap: '2px' }}>
                  {equityPoints.map((p, i) => {
                    const maxBal = Math.max(...equityPoints.map(e => e.balance))
                    const minBal = Math.min(...equityPoints.map(e => e.balance))
                    const range = maxBal - minBal || 1
                    const heightPct = ((p.balance - minBal) / range) * 90 + 5
                    const isPrev = i > 0 && p.balance >= equityPoints[i - 1].balance
                    return (
                      <div
                        key={i}
                        style={{
                          flex: 1, borderRadius: '2px 2px 0 0',
                          height: `${heightPct}%`,
                          background: isPrev ? 'rgba(16,185,129,0.6)' : 'rgba(239,68,68,0.6)',
                          minWidth: '2px',
                          transition: 'height 0.2s',
                        }}
                        title={formatCurrency(p.balance)}
                      />
                    )
                  })}
                </div>
              </div>
            )}

            {/* Trade History Table */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ padding: '16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700 }}>Semua Trade ({allTrades.length})</h3>
              </div>
              {allTrades.length === 0 ? (
                <div className="empty-state" style={{ padding: '40px' }}>
                  <div className="empty-state-icon">📭</div>
                  <div>Belum ada trade history</div>
                  <Link href="/trade" className="btn btn-primary btn-sm" style={{ marginTop: '12px' }}>Mulai Trading</Link>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <div style={{ minWidth: '800px' }}>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '100px 55px 70px 100px 100px 100px 100px 1fr',
                      padding: '8px 16px',
                      fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)',
                      textTransform: 'uppercase', letterSpacing: '0.5px',
                      borderBottom: '1px solid var(--border-subtle)',
                      background: 'var(--bg-secondary)',
                    }}>
                      <span>Symbol</span><span>Arah</span><span>Lot</span>
                      <span>Entry</span><span>Exit</span><span>P&L IDR</span>
                      <span>Close By</span><span>Gacha Reward</span>
                    </div>
                    {allTrades.slice().reverse().map(trade => {
                      const sym = SYMBOLS.find(s => s.symbol === trade.symbol)
                      const pnl = trade.pnlIDR ?? 0
                      return (
                        <div key={trade.id} style={{
                          display: 'grid',
                          gridTemplateColumns: '100px 55px 70px 100px 100px 100px 100px 1fr',
                          padding: '10px 16px',
                          borderBottom: '1px solid var(--border-subtle)',
                          fontSize: '12px', alignItems: 'center',
                        }}>
                          <span style={{ fontWeight: 700 }}>{sym?.displayName ?? trade.symbol}</span>
                          <span className={`badge ${trade.direction === 'BUY' ? 'badge-buy' : 'badge-sell'}`}>{trade.direction}</span>
                          <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{trade.lotSize}</span>
                          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px' }}>{trade.entryPrice.toFixed(sym?.decimals ?? 5)}</span>
                          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px' }}>{trade.exitPrice?.toFixed(sym?.decimals ?? 5) ?? '-'}</span>
                          <span className={pnl >= 0 ? 'pnl-positive' : 'pnl-negative'}>
                            {pnl >= 0 ? '+' : ''}{(pnl / 1000).toFixed(1)}K
                          </span>
                          <span>
                            <span className={`badge ${trade.closeReason === 'TP' ? 'badge-buy' : trade.closeReason === 'SL' ? 'badge-sell' : 'badge-info'}`}>
                              {trade.closeReason ?? 'MANUAL'}
                            </span>
                          </span>
                          <span style={{ fontSize: '13px' }}>
                            {trade.gachaReward?.card.icon}{' '}
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{trade.gachaReward?.card.name}</span>
                            {' '}
                            <span style={{
                              fontSize: '9px', fontWeight: 700, padding: '1px 6px', borderRadius: '10px',
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
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
