'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { useTradingStore, useActiveAccount, useOpenTrades } from '@/lib/store/trading-store'
import { SYMBOLS, formatCurrency } from '@/lib/market/symbols'
import { fetchOHLCV, getCurrentPrice } from '@/lib/market/yahoo'
import { calcPnL, calcMarginRequired } from '@/lib/trading/simulator'
import GachaModal from './GachaModal'
import GachaJumpPanel from './GachaJumpPanel'
import TradingChart from '../chart/TradingChart'
import OrderPanel from './OrderPanel'
import InstrumentSidebar from './InstrumentSidebar'
import PositionsPanel from './PositionsPanel'

// Pinned symbol tabs at top (like Exness)
const DEFAULT_PINNED = ['XAUUSD', 'EURUSD', 'GBPUSD', 'GBPJPY']

export default function TradingTerminal() {
  const activeAccount = useActiveAccount()
  const openTrades = useOpenTrades()

  const activeSymbol = useTradingStore(s => s.activeSymbol)
  const activeTimeframe = useTradingStore(s => s.activeTimeframe)
  const bars = useTradingStore(s => s.bars)
  const currentBarIndex = useTradingStore(s => s.currentBarIndex)
  const isReplayMode = useTradingStore(s => s.isReplayMode)
  const replayRunning = useTradingStore(s => s.replayRunning)
  const replaySpeed = useTradingStore(s => s.replaySpeed)
  const accounts = useTradingStore(s => s.accounts)
  const pendingGacha = useTradingStore(s => s.pendingGacha)
  const streak = useTradingStore(s => s.streak)

  const setActiveSymbol = useTradingStore(s => s.setActiveSymbol)
  const setActiveTimeframe = useTradingStore(s => s.setActiveTimeframe)
  const setBars = useTradingStore(s => s.setBars)
  const stepReplay = useTradingStore(s => s.stepReplay)
  const setReplayRunning = useTradingStore(s => s.setReplayRunning)
  const setReplaySpeed = useTradingStore(s => s.setReplaySpeed)
  const toggleReplayMode = useTradingStore(s => s.toggleReplayMode)
  const setPendingGacha = useTradingStore(s => s.setPendingGacha)
  const setActiveAccount = useTradingStore(s => s.setActiveAccount)

  const [showSidebar, setShowSidebar] = useState(false)
  const [pinnedSymbols, setPinnedSymbols] = useState(DEFAULT_PINNED)
  const [showAccountDropdown, setShowAccountDropdown] = useState(false)
  const [showGachaJump, setShowGachaJump] = useState(false)
  const replayRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Load chart data
  useEffect(() => {
    const sym = SYMBOLS.find(s => s.symbol === activeSymbol)
    if (!sym) return
    const load = async () => {
      const data = await fetchOHLCV(sym.yahooTicker, activeTimeframe, 500)
      setBars(data)
    }
    load()
  }, [activeSymbol, activeTimeframe, setBars])

  // Replay timer — use store's stepReplay directly (it's stable)
  useEffect(() => {
    if (replayRef.current) clearInterval(replayRef.current)
    if (replayRunning && isReplayMode) {
      const interval = Math.max(80, 1000 / replaySpeed)
      replayRef.current = setInterval(() => {
        // Always call the latest stepReplay from the store
        useTradingStore.getState().stepReplay()
      }, interval)
    }
    return () => { if (replayRef.current) clearInterval(replayRef.current) }
  }, [replayRunning, isReplayMode, replaySpeed])

  const currentBars = isReplayMode ? bars.slice(0, currentBarIndex + 1) : bars
  const currentPrice = getCurrentPrice(currentBars)
  const activeSym = SYMBOLS.find(s => s.symbol === activeSymbol)

  // Floating P&L
  const floatingPnL = openTrades.reduce((total, trade) => {
    if (!activeSym || trade.symbol !== activeSymbol) return total
    const r = calcPnL(trade.direction, trade.entryPrice, currentPrice, trade.lotSize, activeSym, 'IDR')
    return total + r.pnlIDR
  }, 0)

  const balance = activeAccount?.balance ?? 0
  const equity = balance + floatingPnL
  const currency = activeAccount?.currency ?? 'IDR'

  // Margin used
  const marginUsed = openTrades.reduce((total, trade) => {
    if (!activeSym) return total
    return total + calcMarginRequired(trade.entryPrice, trade.lotSize, activeAccount?.leverage ?? 100, activeSym)
  }, 0)
  const freeMargin = equity - marginUsed
  const marginLevel = marginUsed > 0 ? (equity / marginUsed * 100) : 0

  return (
    <div className="terminal-root">

      {/* ===== TOP BAR ===== */}
      <div style={{
        height: '42px', flexShrink: 0,
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex', alignItems: 'center',
        padding: '0 0 0 8px',
        gap: '0',
      }}>
        {/* Logo */}
        <Link href="/dashboard" className="logo" style={{ padding: '0 12px', flexShrink: 0 }}>
          <div className="logo-icon" style={{ width: '26px', height: '26px' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <path d="M3 17l4-8 4 4 4-6 4 10" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="logo-text" style={{ fontSize: '14px' }}>ForexSim</span>
        </Link>

        <div style={{ width: '1px', height: '24px', background: 'var(--border-subtle)', margin: '0 4px' }} />

        {/* Pinned symbol tabs */}
        {pinnedSymbols.map(sym => {
          const config = SYMBOLS.find(s => s.symbol === sym)
          if (!config) return null
          const isActive = activeSymbol === sym
          return (
            <div
              key={sym}
              role="button"
              tabIndex={0}
              onClick={() => setActiveSymbol(sym)}
              onKeyDown={e => e.key === 'Enter' && setActiveSymbol(sym)}
              id={`sym-tab-${sym}`}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '0 14px', height: '42px',
                border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                fontSize: '13px', fontWeight: isActive ? 700 : 500,
                background: isActive ? 'var(--bg-primary)' : 'transparent',
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                borderBottom: isActive ? '2px solid var(--accent-blue)' : '2px solid transparent',
                transition: 'all 0.15s', flexShrink: 0, userSelect: 'none',
              }}
            >
              <span style={{ fontSize: '14px' }}>{config.icon}</span>
              {config.displayName}
              {isActive && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={e => { e.stopPropagation(); setPinnedSymbols(ps => ps.filter(s => s !== sym)) }}
                  onKeyDown={e => e.key === 'Enter' && setPinnedSymbols(ps => ps.filter(s => s !== sym))}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '11px', padding: '0 0 0 2px', lineHeight: 1 }}
                >×</span>
              )}
            </div>
          )
        })}

        {/* Add symbol */}
        <button
          style={{
            padding: '0 12px', height: '42px', border: 'none', cursor: 'pointer',
            background: 'transparent', color: 'var(--text-muted)', fontSize: '18px',
          }}
        >+</button>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Account info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingRight: '12px', flexShrink: 0 }}>
          {streak > 1 && (
            <div style={{
              padding: '3px 10px', borderRadius: '6px',
              background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)',
              color: 'var(--warning-color)', fontSize: '12px', fontWeight: 700,
            }}>🔥 {streak}</div>
          )}

          {/* Account dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowAccountDropdown(v => !v)}
              id="account-dropdown-btn"
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '5px 12px',
                background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)',
                borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              <span className="demo-tag">DEMO</span>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Standard</span>
              <span style={{ fontSize: '13px', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-primary)' }}>
                {formatCurrency(balance, currency)}
              </span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text-muted)' }}>
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </button>

            {showAccountDropdown && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 6px)', right: 0,
                background: 'var(--bg-card)', border: '1px solid var(--border-light)',
                borderRadius: '12px', padding: '8px', minWidth: '240px',
                boxShadow: 'var(--shadow-lg)', zIndex: 100,
                animation: 'slideDown 0.15s ease',
              }}>
                {accounts.length === 0 ? (
                  <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                    No accounts. <Link href="/dashboard" style={{ color: 'var(--accent-blue)' }}>Create one</Link>
                  </div>
                ) : accounts.map(acc => (
                  <button
                    key={acc.id}
                    onClick={() => { setActiveAccount(acc.id); setShowAccountDropdown(false) }}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                      background: acc.id === activeAccount?.id ? 'var(--bg-active)' : 'transparent',
                      fontFamily: 'inherit', textAlign: 'left', transition: 'background 0.1s',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{acc.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>1:{acc.leverage} · {acc.currency}</div>
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-primary)' }}>
                      {formatCurrency(acc.balance, acc.currency)}
                    </div>
                  </button>
                ))}
                <div style={{ borderTop: '1px solid var(--border-subtle)', marginTop: '4px', paddingTop: '8px' }}>
                  <Link href="/dashboard" style={{
                    display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px',
                    borderRadius: '8px', textDecoration: 'none', color: 'var(--accent-blue)',
                    fontSize: '12px', fontWeight: 600,
                  }}>
                    + Create new account
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Icons */}
          <button className="btn-icon" title="Notifications">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
            </svg>
          </button>
          <button className="btn-icon" title="Apps">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
              <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
            </svg>
          </button>
          <div style={{
            width: '30px', height: '30px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '12px', fontWeight: 700, cursor: 'pointer', color: 'white',
          }}>U</div>
        </div>
      </div>

      {/* ===== TERMINAL BODY ===== */}
      <div className="terminal-body" style={{ overflow: 'hidden' }}>
        {/* Instrument Sidebar (toggle) */}
        {showSidebar && (
          <InstrumentSidebar
            activeSymbol={activeSymbol}
            onSelectSymbol={(s) => { setActiveSymbol(s); setShowSidebar(false) }}
            currentPrice={currentPrice}
            bars={currentBars}
          />
        )}

        {/* Chart + bottom */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <TradingChart
            bars={currentBars}
            symbol={activeSymbol}
            timeframe={activeTimeframe}
            onTimeframeChange={setActiveTimeframe}
            isReplayMode={isReplayMode}
            replayRunning={replayRunning}
            currentBarIndex={currentBarIndex}
            totalBars={bars.length}
            onToggleReplay={toggleReplayMode}
            onToggleReplayRunning={() => setReplayRunning(!replayRunning)}
            onStepForward={() => useTradingStore.getState().stepReplay()}
            replaySpeed={replaySpeed}
            onChangeReplaySpeed={setReplaySpeed}
            onToggleSidebar={() => setShowSidebar(v => !v)}
            showSidebar={showSidebar}
            onOpenGachaJump={() => setShowGachaJump(true)}
          />

          <PositionsPanel
            openTrades={openTrades}
            currentPrice={currentPrice}
            activeSymbol={activeSymbol}
          />
        </div>

        {/* Order Panel */}
        <OrderPanel
          symbol={activeSymbol}
          currentPrice={currentPrice}
          account={activeAccount}
          bars={currentBars}
        />
      </div>

      {/* ===== FOOTER ===== */}
      <div className="terminal-footer">
        <div className="footer-stat">
          <span style={{ color: 'var(--text-muted)' }}>Equity</span>
          <span style={{ fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: equity >= balance ? 'var(--profit-color)' : 'var(--loss-color)' }}>
            {formatCurrency(equity, currency)}
          </span>
        </div>
        <div className="footer-stat">
          <span style={{ color: 'var(--text-muted)' }}>Free Margin</span>
          <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{formatCurrency(freeMargin, currency)}</span>
        </div>
        <div className="footer-stat">
          <span style={{ color: 'var(--text-muted)' }}>Balance</span>
          <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{formatCurrency(balance, currency)}</span>
        </div>
        <div className="footer-stat">
          <span style={{ color: 'var(--text-muted)' }}>Margin</span>
          <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{formatCurrency(marginUsed, currency)}</span>
        </div>
        <div className="footer-stat">
          <span style={{ color: 'var(--text-muted)' }}>Margin level</span>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', color: marginLevel > 200 ? 'var(--profit-color)' : marginLevel > 100 ? 'var(--warning-color)' : 'var(--loss-color)' }}>
            {marginUsed > 0 ? `${marginLevel.toFixed(0)}%` : '—'}
          </span>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '12px' }}>
          <Link href="/dashboard" style={{ color: 'var(--text-muted)', fontSize: '11px', textDecoration: 'none' }}>Dashboard</Link>
          <Link href="/journal" style={{ color: 'var(--text-muted)', fontSize: '11px', textDecoration: 'none' }}>Journal</Link>
        </div>

        {/* Signal indicator */}
        <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
          {[1,2,3,4,5].map(i => (
            <div key={i} style={{
              width: '3px', height: `${i * 4}px`,
              background: i <= 4 ? 'var(--profit-color)' : 'var(--border-subtle)',
              borderRadius: '1px',
            }} />
          ))}
        </div>
      </div>

      {/* Gacha Modal */}
      {pendingGacha && (
        <GachaModal result={pendingGacha} onClose={() => setPendingGacha(null)} />
      )}

      {/* Gacha Jump Panel */}
      {showGachaJump && (
        <GachaJumpPanel onClose={() => setShowGachaJump(false)} />
      )}

      {/* Click outside dropdown */}
      {showAccountDropdown && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setShowAccountDropdown(false)} />
      )}
    </div>
  )
}
