'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useTradingStore } from '@/lib/store/trading-store'
import { formatCurrency, SYMBOLS } from '@/lib/market/symbols'

const LEVERAGE_OPTIONS = [100, 200, 500, 1000]
const CURRENCY_OPTIONS: Array<'IDR' | 'USD' | 'EUR'> = ['IDR', 'USD', 'EUR']
const INITIAL_BALANCES: Record<string, number[]> = {
  IDR: [500000, 1000000, 5000000, 10000000],
  USD: [100, 500, 1000, 5000],
  EUR: [100, 500, 1000, 5000],
}

function CreateAccountModal({ onClose }: { onClose: () => void }) {
  const accounts = useTradingStore(s => s.accounts)
  const [form, setForm] = useState({
    name: `Porto ${accounts.length + 1}`,
    currency: 'IDR' as 'IDR' | 'USD' | 'EUR',
    balance: 1000000,
    leverage: 100,
  })

  const addAccount = useTradingStore(s => s.addAccount)
  function handleCreate() {
    addAccount({ ...form, initialBalance: form.balance, isActive: false })
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: 460, padding: '32px' }} onClick={e => e.stopPropagation()}>
        <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '6px' }}>Buat Porto Baru</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '24px' }}>
          Setup porto backtesting baru kamu
        </p>

        <div className="form-group">
          <label className="form-label">Account Name</label>
          <input className="input" value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        </div>

        <div className="form-group">
          <label className="form-label">Currency</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            {CURRENCY_OPTIONS.map(c => (
              <button key={c} onClick={() => setForm(f => ({ ...f, currency: c, balance: INITIAL_BALANCES[c][1] }))}
                style={{
                  padding: '10px', borderRadius: '8px', border: '1px solid',
                  borderColor: form.currency === c ? 'var(--accent-blue)' : 'var(--border-subtle)',
                  background: form.currency === c ? 'var(--accent-blue-glow)' : 'var(--bg-secondary)',
                  color: form.currency === c ? 'var(--accent-blue)' : 'var(--text-secondary)',
                  cursor: 'pointer', fontWeight: 700, fontSize: '14px', fontFamily: 'inherit',
                }}
              >{c}</button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Initial Balance</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '8px' }}>
            {INITIAL_BALANCES[form.currency].map(b => (
              <button key={b} onClick={() => setForm(f => ({ ...f, balance: b }))}
                style={{
                  padding: '8px', borderRadius: '8px', border: '1px solid',
                  borderColor: form.balance === b ? 'var(--accent-blue)' : 'var(--border-subtle)',
                  background: form.balance === b ? 'var(--accent-blue-glow)' : 'var(--bg-secondary)',
                  color: form.balance === b ? 'var(--accent-blue)' : 'var(--text-secondary)',
                  cursor: 'pointer', fontSize: '12px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600,
                }}
              >{formatCurrency(b, form.currency)}</button>
            ))}
          </div>
          <input type="number" className="input" value={form.balance}
            onChange={e => setForm(f => ({ ...f, balance: Number(e.target.value) }))} min={100} />
        </div>

        <div className="form-group">
          <label className="form-label">Leverage</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
            {LEVERAGE_OPTIONS.map(lv => (
              <button key={lv} onClick={() => setForm(f => ({ ...f, leverage: lv }))}
                style={{
                  padding: '8px', borderRadius: '8px', border: '1px solid',
                  borderColor: form.leverage === lv ? 'var(--accent-blue)' : 'var(--border-subtle)',
                  background: form.leverage === lv ? 'var(--accent-blue-glow)' : 'var(--bg-secondary)',
                  color: form.leverage === lv ? 'var(--accent-blue)' : 'var(--text-secondary)',
                  cursor: 'pointer', fontSize: '12px', fontWeight: 700, fontFamily: 'inherit',
                }}
              >1:{lv}</button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
          <button className="btn btn-ghost" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
          <button className="btn btn-primary" onClick={handleCreate} style={{ flex: 2 }} id="create-account-confirm-btn">
            Buat Porto
          </button>
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const accounts = useTradingStore(s => s.accounts)
  const allTrades = useTradingStore(s => s.trades)
  const streak = useTradingStore(s => s.streak)
  const activeAccountId = useTradingStore(s => s.activeAccountId)
  const setActiveAccount = useTradingStore(s => s.setActiveAccount)

  const closedTrades = allTrades.filter(t => t.status === 'CLOSED')
  const [showCreateModal, setShowCreateModal] = useState(false)

  const navSections = [
    {
      title: 'Trading',
      icon: '📈',
      items: [
        { label: 'Accounts', icon: '🏦', href: '/dashboard', active: true },
        { label: 'Performance', icon: '📊', href: '/journal' },
        { label: 'Trade History', icon: '📋', href: '/journal' },
        { label: 'Trading Terminal', icon: '🖥️', href: '/trade', external: true },
      ],
    },
    {
      title: 'Portfolio',
      icon: '💼',
      items: [
        { label: 'Gacha Collection', icon: '🎰', href: '/journal' },
        { label: 'Analytics', icon: '📉', href: '/journal' },
      ],
    },
  ]

  const winTrades = closedTrades.filter(t => (t.pnlIDR ?? 0) > 0).length
  const winRate = closedTrades.length > 0 ? (winTrades / closedTrades.length * 100) : 0

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-primary)', overflow: 'hidden' }}>

      {/* ====== LEFT SIDEBAR ====== */}
      <aside style={{
        width: '220px', flexShrink: 0,
        background: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Logo */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex', alignItems: 'center', gap: '10px',
        }}>
          <div className="logo-icon" style={{ width: '30px', height: '30px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M3 17l4-8 4 4 4-6 4 10" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="logo-text">ForexSim</span>
        </div>

        {/* Nav sections */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {navSections.map(section => (
            <div key={section.title} style={{ marginBottom: '4px' }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 20px 4px',
                cursor: 'pointer',
              }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {section.title}
                </span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text-muted)' }}>
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </div>
              {section.items.map(item => (
                <Link
                  key={item.label}
                  href={item.href}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '8px 20px',
                    fontSize: '13px',
                    color: item.active ? 'var(--text-primary)' : 'var(--text-secondary)',
                    textDecoration: 'none',
                    background: item.active ? 'var(--bg-active)' : 'transparent',
                    borderLeft: item.active ? '2px solid var(--accent-blue)' : '2px solid transparent',
                    transition: 'all 0.15s',
                  }}
                  id={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <span style={{ fontSize: '14px' }}>{item.icon}</span>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.external && (
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text-muted)' }}>
                      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/>
                    </svg>
                  )}
                </Link>
              ))}
            </div>
          ))}
        </div>

        {/* Streak display */}
        {streak > 0 && (
          <div style={{
            margin: '8px 12px',
            padding: '10px 14px',
            background: 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(245,158,11,0.05))',
            border: '1px solid rgba(245,158,11,0.25)',
            borderRadius: '10px',
          }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Current Streak</div>
            <div style={{ fontSize: '22px', fontWeight: 900, color: 'var(--warning-color)' }}>
              🔥 {streak}
            </div>
          </div>
        )}

        {/* Bottom collapse button */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center' }}>
            ForexSim v1.0 · Demo Mode
          </div>
        </div>
      </aside>

      {/* ====== MAIN CONTENT ====== */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Top Bar */}
        <div style={{
          height: '56px', flexShrink: 0,
          background: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex', alignItems: 'center',
          padding: '0 24px', gap: '16px',
        }}>
          <div style={{ flex: 1 }} />

          {/* Balance display */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '6px 14px',
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '8px',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text-muted)' }}>
              <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
            </svg>
            <span style={{ fontSize: '13px', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>
              {formatCurrency(accounts.reduce((s, a) => s + a.balance, 0))}
            </span>
          </div>

          {/* Icons */}
          <button className="btn-icon" title="Settings">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
            </svg>
          </button>
          <button className="btn-icon" title="Notifications">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
            </svg>
          </button>
          <button className="btn-icon" title="Apps">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
              <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
            </svg>
          </button>
          <div style={{
            width: '32px', height: '32px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '13px', fontWeight: 700, cursor: 'pointer',
          }}>U</div>
        </div>

        {/* Page Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0' }}>

          {/* Promo banners */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0',
            borderBottom: '1px solid var(--border-subtle)',
          }}>
            <div style={{
              padding: '20px 28px',
              background: 'linear-gradient(135deg, rgba(59,130,246,0.06), rgba(139,92,246,0.04))',
              borderRight: '1px solid var(--border-subtle)',
              display: 'flex', alignItems: 'center', gap: '16px',
            }}>
              <div style={{ fontSize: '36px' }}>🎯</div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '3px' }}>Practice Trading</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Backtest strategies with real historical data
                </div>
              </div>
            </div>
            <div style={{
              padding: '20px 28px',
              background: 'linear-gradient(135deg, rgba(245,158,11,0.06), rgba(239,68,68,0.04))',
              display: 'flex', alignItems: 'center', gap: '16px',
            }}>
              <div style={{ fontSize: '36px' }}>🎰</div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '3px' }}>Gacha Rewards</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Get cards every trade — 4 rarities including Legendary
                </div>
              </div>
            </div>
          </div>

          <div style={{ padding: '28px 32px' }}>

            {/* My Accounts header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: '20px',
            }}>
              <h1 style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.5px' }}>Porto Saya</h1>
              <button
                className="btn btn-primary"
                onClick={() => setShowCreateModal(true)}
                id="open-account-btn"
                style={{ gap: '6px' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Buat Porto
              </button>
            </div>

            {/* Sort */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '12px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
                <line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/>
                <line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
              </svg>
              Terbaru ↓
            </div>

            {/* Accounts list */}
            {accounts.length === 0 ? (
              <div style={{
                border: '2px dashed var(--border-subtle)', borderRadius: '16px',
                padding: '60px', textAlign: 'center', cursor: 'pointer',
              }} onClick={() => setShowCreateModal(true)}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>💼</div>
                <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>Belum ada porto</div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px' }}>
                  Buat porto pertama kamu untuk mulai backtesting
                </p>
                <button className="btn btn-primary" id="no-account-create-btn">+ Buat Porto</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {accounts.map(acc => {
                  const accTrades = allTrades.filter(t => t.status === 'CLOSED' && t.accountId === acc.id)
                  const pnl = acc.balance - acc.initialBalance
                  const pnlPct = (pnl / acc.initialBalance) * 100
                  const isActive = acc.id === activeAccountId

                  return (
                    <div
                      key={acc.id}
                      id={`account-row-${acc.id}`}
                      style={{
                        background: 'var(--bg-card)',
                        border: `1px solid ${isActive ? 'var(--accent-blue)' : 'var(--border-subtle)'}`,
                        borderRadius: '12px',
                        padding: '18px 24px',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        boxShadow: isActive ? '0 0 0 1px var(--accent-blue), 0 4px 20px rgba(59,130,246,0.12)' : 'none',
                      }}
                      onClick={() => setActiveAccount(acc.id)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                        <span style={{
                          fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '4px',
                          background: 'rgba(139,92,246,0.15)', color: '#c4b5fd',
                          letterSpacing: '0.5px', textTransform: 'uppercase',
                        }}>PORTO</span>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Sim</span>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>{acc.currency}</span>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '4px' }}>
                          # {acc.id.slice(0, 8).toUpperCase()}
                        </span>
                        <span style={{ fontSize: '12px', fontWeight: 600 }}>{acc.name}</span>
                        {isActive && (
                          <span style={{
                            marginLeft: '4px', fontSize: '10px', fontWeight: 700,
                            padding: '2px 8px', borderRadius: '20px',
                            background: 'rgba(59,130,246,0.15)', color: 'var(--accent-blue)',
                            border: '1px solid rgba(59,130,246,0.3)',
                          }}>ACTIVE</span>
                        )}
                        <div style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M6 9l6 6 6-6"/>
                          </svg>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{
                            fontSize: '28px', fontWeight: 900, letterSpacing: '-1px',
                            fontFamily: 'JetBrains Mono, monospace',
                          }}>
                            {formatCurrency(acc.balance, acc.currency)}
                          </div>
                          <div style={{ fontSize: '12px', marginTop: '4px', display: 'flex', gap: '12px' }}>
                            <span style={{ color: pnl >= 0 ? 'var(--profit-color)' : 'var(--loss-color)' }}>
                              {pnl >= 0 ? '+' : ''}{pnlPct.toFixed(2)}% P&L
                            </span>
                            <span style={{ color: 'var(--text-muted)' }}>
                              {accTrades.length} trades · {acc.leverage}:1
                            </span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '8px' }}>
                          <Link
                            href="/trade"
                            onClick={() => setActiveAccount(acc.id)}
                            id={`trade-btn-${acc.id}`}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '6px',
                              padding: '9px 20px', borderRadius: '8px',
                              background: 'linear-gradient(135deg, #f59e0b, #f97316)',
                              color: 'white', textDecoration: 'none',
                              fontSize: '13px', fontWeight: 700,
                              boxShadow: '0 4px 16px rgba(245,158,11,0.3)',
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="M3 17l4-8 4 4 4-6 4 10"/>
                            </svg>
                            Trade
                          </Link>
                          <button
                            style={{
                              display: 'flex', alignItems: 'center', gap: '6px',
                              padding: '9px 16px', borderRadius: '8px',
                              background: 'var(--bg-hover)', color: 'var(--text-secondary)',
                              border: '1px solid var(--border-subtle)',
                              fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit',
                            }}
                            id={`set-balance-btn-${acc.id}`}
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
                            </svg>
                            Set Balance
                          </button>
                          <button
                            style={{
                              padding: '9px 10px', borderRadius: '8px',
                              background: 'var(--bg-hover)', color: 'var(--text-secondary)',
                              border: '1px solid var(--border-subtle)', cursor: 'pointer',
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Quick stats if trades exist */}
            {closedTrades.length > 0 && (
              <div style={{ marginTop: '32px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Performance Overview</h2>
                <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                  {[
                    { label: 'Total Trades', value: closedTrades.length.toString(), color: '#3b82f6' },
                    { label: 'Win Rate', value: `${winRate.toFixed(0)}%`, color: '#10b981' },
                    { label: 'Best Streak 🔥', value: streak.toString(), color: '#f59e0b' },
                    { label: 'Gacha Collected', value: closedTrades.length.toString(), color: '#8b5cf6' },
                  ].map(s => (
                    <div key={s.label} className="stat-card" style={{ '--stat-color': s.color } as React.CSSProperties}>
                      <div className="stat-label">{s.label}</div>
                      <div className="stat-value" style={{ fontSize: '20px', color: s.color }}>{s.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showCreateModal && <CreateAccountModal onClose={() => setShowCreateModal(false)} />}
    </div>
  )
}
