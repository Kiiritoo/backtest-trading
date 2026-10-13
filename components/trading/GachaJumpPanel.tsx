'use client'

import { useState, useEffect } from 'react'
import { useTradingStore } from '@/lib/store/trading-store'
import { SYMBOLS } from '@/lib/market/symbols'
import { fetchOHLCV } from '@/lib/market/yahoo'

interface Props {
  onClose: () => void
}

const TIMEFRAME_OPTIONS = [
  { label: '1m', value: '1m' },
  { label: '5m', value: '5m' },
  { label: '15m', value: '15m' },
  { label: '1h', value: '1h' },
  { label: '4h', value: '4h' },
  { label: '1D', value: '1d' },
]

const SESSION_OPTIONS = [5, 10, 20, 50]

export default function GachaJumpPanel({ onClose }: Props) {
  const setActiveSymbol = useTradingStore(s => s.setActiveSymbol)
  const setActiveTimeframe = useTradingStore(s => s.setActiveTimeframe)
  const setBars = useTradingStore(s => s.setBars)
  const setCurrentBarIndex = useTradingStore(s => s.setCurrentBarIndex)
  const toggleReplayMode = useTradingStore(s => s.toggleReplayMode)
  const isReplayMode = useTradingStore(s => s.isReplayMode)
  const activeSymbol = useTradingStore(s => s.activeSymbol)
  const activeTimeframe = useTradingStore(s => s.activeTimeframe)

  const [selectedSymbol, setSelectedSymbol] = useState(activeSymbol)
  const [selectedTf, setSelectedTf] = useState(activeTimeframe)
  const [sessions, setSessions] = useState(10)
  const [minJump, setMinJump] = useState(20)
  const [maxJump, setMaxJump] = useState(150)
  const [loading, setLoading] = useState(false)
  const [phase, setPhase] = useState<'config' | 'rolling'>('config')

  const symConfig = SYMBOLS.find(s => s.symbol === selectedSymbol)

  async function handleStart() {
    setPhase('rolling')
    setLoading(true)

    // Load fresh chart data for selected symbol/timeframe
    const sym = SYMBOLS.find(s => s.symbol === selectedSymbol)
    if (!sym) { setLoading(false); return }

    if (selectedSymbol !== activeSymbol || selectedTf !== activeTimeframe) {
      setActiveSymbol(selectedSymbol)
      setActiveTimeframe(selectedTf)
      try {
        const bars = await fetchOHLCV(sym.yahooTicker, selectedTf, 500)
        setBars(bars)
        // Jump to a random start point (not the very beginning or end)
        const startIdx = Math.floor(100 + Math.random() * (bars.length - 200))
        setCurrentBarIndex(startIdx)
      } catch {
        // mock data will be used by default
      }
    } else {
      // Same symbol — just pick a random start bar
      const { bars } = useTradingStore.getState()
      if (bars.length > 50) {
        const startIdx = Math.floor(50 + Math.random() * (bars.length - 100))
        setCurrentBarIndex(startIdx)
      }
    }

    // Enable replay mode if not already
    if (!isReplayMode) {
      toggleReplayMode()
    }

    setLoading(false)
    onClose()
  }

  return (
    <>
      <style>{`
        @keyframes gachaRoll {
          0% { transform: rotate(0deg) scale(1); }
          25% { transform: rotate(10deg) scale(1.1); }
          50% { transform: rotate(-10deg) scale(0.95); }
          75% { transform: rotate(8deg) scale(1.08); }
          100% { transform: rotate(0deg) scale(1); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>

      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 500,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
        onClick={onClose}
      >
        <div
          onClick={e => e.stopPropagation()}
          style={{
            width: '480px', maxWidth: '95vw',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-light)',
            borderRadius: '20px',
            padding: '28px',
            boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
            animation: 'gachaSlideUp 0.3s cubic-bezier(0.34,1.56,0.64,1)',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
            <div>
              <div style={{ fontSize: '22px', fontWeight: 900, letterSpacing: '-0.5px' }}>
                🎰 Gacha Replay
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px' }}>
                Teleport ke waktu acak & test strategi kamu
              </div>
            </div>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '20px', lineHeight: 1 }}
            >×</button>
          </div>

          {phase === 'config' ? (
            <>
              {/* Instrument picker */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>
                  Pilih Instrumen
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                  {SYMBOLS.map(s => (
                    <button
                      key={s.symbol}
                      onClick={() => setSelectedSymbol(s.symbol)}
                      style={{
                        padding: '8px 6px', borderRadius: '10px',
                        border: `1px solid ${selectedSymbol === s.symbol ? 'var(--accent-blue)' : 'var(--border-subtle)'}`,
                        background: selectedSymbol === s.symbol ? 'var(--accent-blue-glow)' : 'var(--bg-secondary)',
                        cursor: 'pointer', textAlign: 'center',
                        transition: 'all 0.15s', fontFamily: 'inherit',
                      }}
                    >
                      <div style={{ fontSize: '16px' }}>{s.icon}</div>
                      <div style={{ fontSize: '10px', fontWeight: 700, color: selectedSymbol === s.symbol ? 'var(--accent-blue)' : 'var(--text-secondary)', marginTop: '2px' }}>
                        {s.displayName}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Timeframe picker */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>
                  Timeframe
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {TIMEFRAME_OPTIONS.map(tf => (
                    <button
                      key={tf.value}
                      onClick={() => setSelectedTf(tf.value)}
                      style={{
                        flex: 1, padding: '8px 4px', borderRadius: '8px',
                        border: `1px solid ${selectedTf === tf.value ? 'var(--accent-blue)' : 'var(--border-subtle)'}`,
                        background: selectedTf === tf.value ? 'var(--accent-blue-glow)' : 'var(--bg-secondary)',
                        cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700,
                        fontSize: '12px',
                        color: selectedTf === tf.value ? 'var(--accent-blue)' : 'var(--text-secondary)',
                        transition: 'all 0.15s',
                      }}
                    >
                      {tf.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Jump range */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>
                  Jangkauan Jump (bar)
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px' }}>Min</div>
                    <input
                      type="number" min={5} max={500} value={minJump}
                      onChange={e => setMinJump(Number(e.target.value))}
                      className="input"
                      style={{ padding: '8px 10px', fontSize: '13px', fontFamily: 'JetBrains Mono, monospace' }}
                    />
                  </div>
                  <div style={{ color: 'var(--text-muted)', marginTop: '16px' }}>—</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px' }}>Max</div>
                    <input
                      type="number" min={5} max={1000} value={maxJump}
                      onChange={e => setMaxJump(Number(e.target.value))}
                      className="input"
                      style={{ padding: '8px 10px', fontSize: '13px', fontFamily: 'JetBrains Mono, monospace' }}
                    />
                  </div>
                </div>
              </div>

              {/* Sessions */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>
                  Target Sesi
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {SESSION_OPTIONS.map(n => (
                    <button
                      key={n}
                      onClick={() => setSessions(n)}
                      style={{
                        flex: 1, padding: '10px', borderRadius: '8px',
                        border: `1px solid ${sessions === n ? 'var(--accent-purple)' : 'var(--border-subtle)'}`,
                        background: sessions === n ? 'var(--accent-purple-glow)' : 'var(--bg-secondary)',
                        cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace',
                        fontWeight: 800, fontSize: '14px',
                        color: sessions === n ? '#c4b5fd' : 'var(--text-secondary)',
                        transition: 'all 0.15s',
                      }}
                    >
                      {n}×
                    </button>
                  ))}
                  <input
                    type="number" min={1} max={999} value={sessions}
                    onChange={e => setSessions(Number(e.target.value))}
                    className="input"
                    style={{ flex: 1, padding: '8px 10px', fontSize: '14px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 800, textAlign: 'center' }}
                  />
                </div>
              </div>

              {/* Summary */}
              <div style={{
                padding: '12px 16px', borderRadius: '10px',
                background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.2)',
                marginBottom: '20px', fontSize: '12px', color: 'var(--text-secondary)',
              }}>
                <span style={{ color: symConfig?.icon ? 'var(--text-primary)' : undefined }}>
                  {symConfig?.icon} {symConfig?.name}
                </span>
                {' · '}{selectedTf.toUpperCase()}
                {' · '}<strong style={{ color: '#c4b5fd' }}>{sessions} sesi</strong>
                {' · Jump '}<strong style={{ color: 'var(--text-primary)' }}>{minJump}–{maxJump} bar</strong>
              </div>

              <button
                className="btn btn-primary"
                onClick={handleStart}
                disabled={loading}
                style={{ width: '100%', padding: '14px', fontSize: '15px', fontWeight: 800 }}
                id="gacha-jump-start-btn"
              >
                🎲 Mulai Gacha Replay!
              </button>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{ fontSize: '72px', animation: 'gachaRoll 0.6s ease-in-out infinite', display: 'inline-block' }}>
                🎰
              </div>
              <div style={{ marginTop: '20px', fontSize: '16px', fontWeight: 700 }}>
                Loading chart data...
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
                Teleporting ke waktu acak di {symConfig?.name}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
