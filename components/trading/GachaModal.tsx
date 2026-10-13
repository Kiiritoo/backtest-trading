'use client'

import { useEffect, useState, useRef } from 'react'
import type { GachaResult } from '@/lib/trading/gacha'
import { formatCurrency } from '@/lib/market/symbols'
import { useTradingStore } from '@/lib/store/trading-store'

interface Props {
  result: GachaResult
  onClose: () => void
}

const RARITY_CONFIG = {
  common:    { gradient: 'linear-gradient(135deg, #374151 0%, #4b5563 100%)', glow: 'rgba(107,114,128,0.3)',  border: '#4b5563', star: '⬜' },
  rare:      { gradient: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)', glow: 'rgba(59,130,246,0.4)',   border: '#3b82f6', star: '🔷' },
  epic:      { gradient: 'linear-gradient(135deg, #5b21b6 0%, #8b5cf6 100%)', glow: 'rgba(139,92,246,0.45)',  border: '#8b5cf6', star: '💎' },
  legendary: { gradient: 'linear-gradient(135deg, #92400e 0%, #f59e0b 100%)', glow: 'rgba(245,158,11,0.55)',  border: '#f59e0b', star: '🌟' },
}

function Particles({ rarity }: { rarity: string }) {
  const cfg = RARITY_CONFIG[rarity as keyof typeof RARITY_CONFIG] ?? RARITY_CONFIG.common
  const count = rarity === 'legendary' ? 24 : rarity === 'epic' ? 16 : rarity === 'rare' ? 10 : 5

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', borderRadius: '20px' }}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            width: `${3 + Math.random() * 5}px`,
            height: `${3 + Math.random() * 5}px`,
            borderRadius: '50%',
            background: cfg.glow.replace('0.', '0.9'),
            left: `${5 + Math.random() * 90}%`,
            top: `${5 + Math.random() * 90}%`,
            animation: `particleFloat ${1.5 + Math.random()}s ease-in-out infinite alternate`,
            animationDelay: `${Math.random() * 0.8}s`,
            opacity: 0.7,
          }}
        />
      ))}
    </div>
  )
}

export default function GachaModal({ result, onClose }: Props) {
  const [phase, setPhase] = useState<0 | 1 | 2 | 3>(0)
  // 0=flash, 1=pnl revealed, 2=card revealed, 3=buttons shown
  const isProfit = result.tradeResult === 'profit'
  const { card } = result
  const cfg = RARITY_CONFIG[card.rarity as keyof typeof RARITY_CONFIG] ?? RARITY_CONFIG.common

  const setReplayRunning = useTradingStore(s => s.setReplayRunning)
  const stepReplay = useTradingStore(s => s.stepReplay)
  const isReplayMode = useTradingStore(s => s.isReplayMode)

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 300)
    const t2 = setTimeout(() => setPhase(2), 900)
    const t3 = setTimeout(() => setPhase(3), 1800)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [])

  // Web Audio beep
  useEffect(() => {
    try {
      const ctx = new AudioContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      if (isProfit) {
        osc.frequency.setValueAtTime(440, ctx.currentTime)
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3)
      } else {
        osc.frequency.setValueAtTime(330, ctx.currentTime)
        osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.4)
      }
      gain.gain.setValueAtTime(0.08, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6)
      osc.start(); osc.stop(ctx.currentTime + 0.6)
    } catch {}
  }, [])

  function handleContinue() {
    onClose()
  }

  function handleNextBar() {
    onClose()
    // Step one bar forward immediately
    setTimeout(() => stepReplay(), 50)
  }

  function handleAutoPlay() {
    onClose()
    setTimeout(() => setReplayRunning(true), 100)
  }

  return (
    <>
      <style>{`
        @keyframes particleFloat {
          from { transform: translateY(0px) scale(1); }
          to   { transform: translateY(-12px) scale(1.3); }
        }
        @keyframes gachaSlideUp {
          from { opacity: 0; transform: translateY(30px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes cardFlip {
          0%   { transform: rotateY(90deg) scale(0.8); opacity: 0; }
          100% { transform: rotateY(0deg) scale(1); opacity: 1; }
        }
        @keyframes pnlPop {
          0%   { transform: scale(0.5); opacity: 0; }
          60%  { transform: scale(1.15); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes legendaryPulse {
          0%, 100% { box-shadow: 0 0 30px ${cfg.glow}, 0 0 60px ${cfg.glow}; }
          50%       { box-shadow: 0 0 50px ${cfg.glow}, 0 0 100px ${cfg.glow}; }
        }
      `}</style>

      <div
        className="gacha-overlay"
        onClick={phase === 3 ? handleContinue : undefined}
        style={{ backdropFilter: 'blur(8px)' }}
      >
        <div
          className="gacha-container"
          onClick={e => e.stopPropagation()}
          style={{
            animation: 'gachaSlideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
            maxWidth: '420px',
            width: '90%',
            borderRadius: '20px',
            background: 'var(--bg-card)',
            border: `1px solid ${cfg.border}44`,
            padding: '28px 24px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Background glow for legendary/epic */}
          {(card.rarity === 'legendary' || card.rarity === 'epic') && (
            <div style={{
              position: 'absolute', inset: 0,
              background: `radial-gradient(ellipse at center, ${cfg.glow.replace('0.', '0.08')} 0%, transparent 70%)`,
              pointerEvents: 'none',
            }} />
          )}

          {/* Trade result header */}
          <div style={{
            textAlign: 'center', marginBottom: '16px',
            opacity: phase >= 1 ? 1 : 0, transition: 'opacity 0.4s',
          }}>
            <div style={{
              fontSize: '13px', fontWeight: 700, letterSpacing: '2px',
              color: isProfit ? 'var(--profit-color)' : 'var(--loss-color)',
              textTransform: 'uppercase', marginBottom: '6px',
            }}>
              {isProfit ? '🎉 PROFIT' : '💸 LOSS'}
            </div>
            <div style={{
              fontSize: '38px', fontWeight: 900, letterSpacing: '-2px',
              fontFamily: 'JetBrains Mono, monospace',
              color: isProfit ? 'var(--profit-color)' : 'var(--loss-color)',
              animation: phase >= 1 ? 'pnlPop 0.5s cubic-bezier(0.34,1.56,0.64,1)' : 'none',
            }}>
              {isProfit ? '+' : ''}{formatCurrency(result.pnlIDR)}
            </div>
            {result.streak > 1 && (
              <div style={{
                display: 'inline-block', marginTop: '8px',
                padding: '4px 14px', borderRadius: '20px',
                background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)',
                color: 'var(--warning-color)', fontSize: '13px', fontWeight: 700,
              }}>
                🔥 {result.streakMessage || `${result.streak}× Win Streak!`}
              </div>
            )}
          </div>

          {/* Divider */}
          <div style={{
            height: '1px', background: 'var(--border-subtle)',
            margin: '0 -24px 16px', opacity: phase >= 1 ? 1 : 0,
          }} />

          {/* Gacha Card */}
          <div style={{
            opacity: phase >= 2 ? 1 : 0,
            animation: phase >= 2 ? 'cardFlip 0.6s ease' : 'none',
          }}>
            <div style={{
              borderRadius: '16px',
              background: cfg.gradient,
              border: `2px solid ${cfg.border}`,
              padding: '20px',
              textAlign: 'center',
              position: 'relative',
              overflow: 'hidden',
              ...(card.rarity === 'legendary' ? { animation: 'legendaryPulse 2s ease-in-out infinite' } : {}),
            }}>
              <Particles rarity={card.rarity} />
              
              {/* Rarity badge */}
              <div style={{
                position: 'absolute', top: '10px', left: '10px',
                fontSize: '10px', fontWeight: 800, letterSpacing: '1px',
                padding: '3px 8px', borderRadius: '20px',
                background: 'rgba(0,0,0,0.3)',
                color: 'rgba(255,255,255,0.9)',
                textTransform: 'uppercase',
              }}>
                {cfg.star} {card.rarity}
              </div>

              <div style={{ fontSize: '52px', marginBottom: '8px', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.4))' }}>
                {card.icon}
              </div>
              <div style={{ fontSize: '17px', fontWeight: 800, color: 'white', marginBottom: '6px', letterSpacing: '-0.3px' }}>
                {card.name}
              </div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', marginBottom: '8px', fontStyle: 'italic' }}>
                {card.description}
              </div>
              <div style={{
                fontSize: '11px', fontWeight: 700,
                padding: '5px 12px', borderRadius: '8px',
                background: 'rgba(0,0,0,0.25)',
                color: 'rgba(255,255,255,0.95)',
                display: 'inline-block',
              }}>
                {card.effect}
              </div>

              {/* Bonus balance */}
              {card.type === 'balance_bonus' && card.effectValue > 0 && (
                <div style={{
                  marginTop: '10px',
                  fontSize: '20px', fontWeight: 900,
                  color: 'var(--profit-color)',
                  fontFamily: 'JetBrains Mono, monospace',
                  textShadow: '0 0 20px rgba(34,197,94,0.5)',
                }}>
                  +{formatCurrency(card.effectValue)} bonus!
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          {phase >= 3 && (
            <div style={{
              display: 'flex', flexDirection: 'column', gap: '8px',
              marginTop: '20px',
              animation: 'gachaSlideUp 0.3s ease',
            }}>
              {isReplayMode ? (
                <>
                  <button
                    className="btn btn-primary"
                    onClick={handleNextBar}
                    id="gacha-next-bar-btn"
                    style={{ padding: '12px', fontSize: '14px', fontWeight: 700 }}
                  >
                    ⏭ Next Bar
                  </button>
                  <button
                    className="btn"
                    onClick={handleAutoPlay}
                    id="gacha-autoplay-btn"
                    style={{
                      padding: '11px', fontSize: '13px',
                      background: 'rgba(16,185,129,0.1)',
                      border: '1px solid rgba(16,185,129,0.3)',
                      color: 'var(--profit-color)',
                    }}
                  >
                    ▶ Auto Replay
                  </button>
                  <button
                    className="btn btn-ghost"
                    onClick={handleContinue}
                    id="gacha-close-btn"
                    style={{ padding: '10px', fontSize: '12px' }}
                  >
                    ✕ Close & Stay
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="btn btn-primary"
                    onClick={handleContinue}
                    id="gacha-next-btn"
                    style={{ padding: '12px', fontSize: '14px', fontWeight: 700 }}
                  >
                    🎯 Continue Trading
                  </button>
                  <button
                    className="btn btn-ghost"
                    onClick={handleContinue}
                    id="gacha-close-btn"
                    style={{ padding: '10px', fontSize: '12px' }}
                  >
                    Close
                  </button>
                </>
              )}
            </div>
          )}

          {/* Loading indicator while animating */}
          {phase < 3 && (
            <div style={{ textAlign: 'center', marginTop: '16px', color: 'var(--text-muted)', fontSize: '11px' }}>
              {phase < 2 ? 'Calculating reward...' : 'Revealing card...'}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
