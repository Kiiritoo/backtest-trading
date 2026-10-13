'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useTradingStore } from '@/lib/store/trading-store'
import { SYMBOLS, formatCurrency } from '@/lib/market/symbols'
import { calcPnL, calcMarginRequired, calcLotFromRisk } from '@/lib/trading/simulator'
import type { Account } from '@/lib/store/trading-store'
import type { OHLCVBar } from '@/lib/market/yahoo'

interface Props {
  symbol: string
  currentPrice: number
  account: Account | null
  bars: OHLCVBar[]
}

// "TP/SL mode" — user can set by price or by currency profit/loss amount
type TpSlMode = 'price' | 'currency'

export default function OrderPanel({ symbol, currentPrice, account, bars }: Props) {
  const orderSide        = useTradingStore(s => s.orderSide)
  const setOrderSide     = useTradingStore(s => s.setOrderSide)
  const lotSize          = useTradingStore(s => s.lotSize)
  const setLotSize       = useTradingStore(s => s.setLotSize)
  const takeProfit       = useTradingStore(s => s.takeProfit)
  const setTakeProfit    = useTradingStore(s => s.setTakeProfit)
  const stopLoss         = useTradingStore(s => s.stopLoss)
  const setStopLoss      = useTradingStore(s => s.setStopLoss)
  const riskPercent      = useTradingStore(s => s.riskPercent)
  const setRiskPercent   = useTradingStore(s => s.setRiskPercent)
  const activeAccountId  = useTradingStore(s => s.activeAccountId)
  const currentBarIndex  = useTradingStore(s => s.currentBarIndex)
  const isReplayMode     = useTradingStore(s => s.isReplayMode)
  const activeTimeframe  = useTradingStore(s => s.activeTimeframe)

  const symConfig = SYMBOLS.find(s => s.symbol === symbol)
  const dec       = symConfig?.decimals ?? 5
  const pip       = symConfig?.pipSize ?? 0.0001
  const currency  = account?.currency ?? 'IDR'

  const [tpInput,     setTpInput]     = useState('')
  const [slInput,     setSlInput]     = useState('')
  const [confirming,  setConfirming]  = useState(false)
  const [useRisk,     setUseRisk]     = useState(false)
  const [tpSlMode,    setTpSlMode]    = useState<TpSlMode>('price')
  // currency-amount inputs (how much profit/loss in IDR/USD)
  const [tpAmount,    setTpAmount]    = useState('')
  const [slAmount,    setSlAmount]    = useState('')

  // spread
  const spread = symConfig ? (symConfig.spreadPips / 2) * symConfig.pipSize : 0
  const bid    = Math.max(0.001, currentPrice - spread)
  const ask    = currentPrice + spread
  const entryP = orderSide === 'BUY' ? ask : bid

  // ── Sync price inputs with store ──────────────────────────────────────────
  useEffect(() => {
    setTpInput(takeProfit !== null ? takeProfit.toFixed(dec) : '')
    setSlInput(stopLoss  !== null ? stopLoss.toFixed(dec)   : '')
  }, [takeProfit, stopLoss, dec])

  // Track previous price to detect first load
  const prevPriceRef = useRef(0)

  // ── Auto-default TP/SL when side/symbol changes OR price first arrives ────
  useEffect(() => {
    if (!currentPrice || !symConfig) return
    // Only auto-set if TP/SL are null OR price just arrived for the first time
    const priceJustArrived = prevPriceRef.current === 0 && currentPrice > 0
    prevPriceRef.current = currentPrice
    if (!priceJustArrived && takeProfit !== null && stopLoss !== null) return

    const pip100 = 100 * pip
    const pip50  =  50 * pip
    if (orderSide === 'BUY') {
      setTakeProfit(parseFloat((currentPrice + pip100).toFixed(dec)))
      setStopLoss(parseFloat((currentPrice - pip50).toFixed(dec)))
    } else {
      setTakeProfit(parseFloat((currentPrice - pip100).toFixed(dec)))
      setStopLoss(parseFloat((currentPrice + pip50).toFixed(dec)))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderSide, symbol, currentPrice > 0 ? 1 : 0])

  // ── Auto-calc lot from risk% ───────────────────────────────────────────────
  useEffect(() => {
    if (!useRisk || !symConfig || !account || !stopLoss) return
    const slPips = Math.abs(currentPrice - stopLoss) / pip
    if (slPips < 1) return
    setLotSize(calcLotFromRisk(riskPercent, account.balance, slPips, symConfig, account.currency))
  }, [riskPercent, stopLoss, currentPrice, useRisk, symConfig, account, pip, setLotSize])

  // ── Helper: PnL calc ──────────────────────────────────────────────────────
  const pnlAtTP = symConfig && takeProfit && currentPrice
    ? calcPnL(orderSide, entryP, takeProfit, lotSize, symConfig, currency) : null
  const pnlAtSL = symConfig && stopLoss && currentPrice
    ? calcPnL(orderSide, entryP, stopLoss,  lotSize, symConfig, currency) : null

  const slPips = stopLoss   && symConfig ? Math.abs(currentPrice - stopLoss)   / pip : 0
  const tpPips = takeProfit && symConfig ? Math.abs(currentPrice - takeProfit) / pip : 0
  const rrRatio = slPips > 0 ? (tpPips / slPips).toFixed(1) : '-'

  const marginRequired   = symConfig && currentPrice
    ? calcMarginRequired(currentPrice, lotSize, account?.leverage ?? 100, symConfig) : 0
  const insufficientBalance = account && marginRequired > account.balance

  // ── Convert currency-amount → price ───────────────────────────────────────
  function amountToPrice(amount: number, isTp: boolean): number {
    if (!symConfig || !currentPrice) return currentPrice
    // PnL per lot per pip in account currency
    const pnlPerPip = (symConfig.contractSize * pip) / (symConfig.quoteCurrency === 'JPY' ? 100 : 1)
    const pips = amount / (pnlPerPip * lotSize)
    if (orderSide === 'BUY') {
      return isTp
        ? parseFloat((entryP + pips * pip).toFixed(dec))
        : parseFloat((entryP - pips * pip).toFixed(dec))
    } else {
      return isTp
        ? parseFloat((entryP - pips * pip).toFixed(dec))
        : parseFloat((entryP + pips * pip).toFixed(dec))
    }
  }

  function handleTpAmountChange(val: string) {
    setTpAmount(val)
    const amount = parseFloat(val)
    if (!isNaN(amount) && amount > 0) {
      const price = amountToPrice(currency === 'IDR' ? amount / 15000 : amount, true)
      setTakeProfit(price)
    }
  }
  function handleSlAmountChange(val: string) {
    setSlAmount(val)
    const amount = parseFloat(val)
    if (!isNaN(amount) && amount > 0) {
      const price = amountToPrice(currency === 'IDR' ? amount / 15000 : amount, false)
      setStopLoss(price)
    }
  }

  // ── Common presets (in pips) ───────────────────────────────────────────────
  const TP_PRESETS = [50, 100, 200, 500]
  const SL_PRESETS = [20, 50, 100, 200]

  function setTpPips(pips: number) {
    const p = orderSide === 'BUY'
      ? parseFloat((entryP + pips * pip).toFixed(dec))
      : parseFloat((entryP - pips * pip).toFixed(dec))
    setTakeProfit(p)
  }
  function setSlPips(pips: number) {
    const p = orderSide === 'BUY'
      ? parseFloat((entryP - pips * pip).toFixed(dec))
      : parseFloat((entryP + pips * pip).toFixed(dec))
    setStopLoss(p)
  }

  // ── Confirm order ──────────────────────────────────────────────────────────
  function handleConfirm() {
    if (!account || !activeAccountId || !symConfig || currentPrice <= 0) return
    setConfirming(true)
    useTradingStore.getState().openTrade({
      accountId:    activeAccountId,
      symbol,
      direction:    orderSide,
      lotSize,
      entryPrice:   entryP,
      takeProfit:   takeProfit ?? null,
      stopLoss:     stopLoss  ?? null,
      status:       'OPEN',
      closeReason:  null,
      openedAt:     new Date().toISOString(),
      timeframe:    activeTimeframe,
      entryBarIndex: isReplayMode ? currentBarIndex : bars.length - 1,
    })
    setTimeout(() => setConfirming(false), 600)
  }

  const canTrade = account && currentPrice > 0 && lotSize >= (symConfig?.minLot ?? 0.01)
  const sellPct = Math.round(30 + Math.sin(Date.now() / 100000) * 15)
  const buyPct  = 100 - sellPct

  return (
    <div className="order-panel">
      {/* Symbol header */}
      <div style={{
        padding: '10px 14px 6px',
        display: 'flex', alignItems: 'center', gap: '8px',
        borderBottom: '1px solid var(--border-subtle)',
      }}>
        <span style={{ fontSize: '18px' }}>{symConfig?.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: '14px', letterSpacing: '-0.3px' }}>
            {symConfig?.displayName ?? symbol}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{symConfig?.name}</div>
        </div>
        <div style={{
          fontSize: '11px', fontFamily: 'JetBrains Mono, monospace',
          fontWeight: 700, color: currentPrice > 0 ? 'var(--text-primary)' : 'var(--text-muted)',
        }}>
          {currentPrice.toFixed(dec)}
        </div>
      </div>

      {/* ── Sell / Buy buttons ── */}
      <div className="order-sell-buy-bar">
        <button
          className={`sell-buy-price-btn sell ${orderSide === 'SELL' ? 'active' : ''}`}
          onClick={() => setOrderSide('SELL')}
          id="order-sell-tab"
        >
          <div style={{ fontSize: '10px', fontWeight: 600, opacity: 0.8, marginBottom: '2px' }}>Sell</div>
          <div className="sell-price-big">{bid.toFixed(dec)}</div>
        </button>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 0 }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono, monospace' }}>
            {symConfig?.spreadPips ?? '—'}
          </div>
        </div>

        <button
          className={`sell-buy-price-btn buy ${orderSide === 'BUY' ? 'active' : ''}`}
          onClick={() => setOrderSide('BUY')}
          id="order-buy-tab"
        >
          <div style={{ fontSize: '10px', fontWeight: 600, opacity: 0.8, marginBottom: '2px' }}>Buy</div>
          <div className="buy-price-big">{ask.toFixed(dec)}</div>
        </button>
      </div>

      {/* Sentiment bar */}
      <div style={{ padding: '0 12px 10px' }}>
        <div style={{ display: 'flex', height: '4px', borderRadius: '3px', overflow: 'hidden', marginBottom: '4px' }}>
          <div style={{ width: `${sellPct}%`, background: 'var(--sell-color)', transition: 'width 0.5s' }} />
          <div style={{ flex: 1, background: 'var(--buy-color)' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
          <span style={{ color: 'var(--sell-color)', fontWeight: 700 }}>{sellPct}%</span>
          <span style={{ color: 'var(--buy-color)', fontWeight: 700 }}>{buyPct}%</span>
        </div>
      </div>

      {/* ── Volume ── */}
      <div className="order-section">
        <div className="order-label">
          <span>Volume</span>
          <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Lots</span>
        </div>
        <div className="input-group">
          <input
            id="order-lot-input"
            type="number"
            value={lotSize}
            onChange={e => setLotSize(Math.max(symConfig?.minLot ?? 0.01, parseFloat(e.target.value) || 0.01))}
            step={symConfig?.lotStep ?? 0.01}
            min={symConfig?.minLot ?? 0.01}
          />
          <div className="input-stepper">
            <button onClick={() => setLotSize(parseFloat(Math.max(symConfig?.minLot ?? 0.01, lotSize - (symConfig?.lotStep ?? 0.01)).toFixed(2)))}>−</button>
            <button onClick={() => setLotSize(parseFloat((lotSize + (symConfig?.lotStep ?? 0.01)).toFixed(2)))}>+</button>
          </div>
        </div>
        {/* Margin preview */}
        {marginRequired > 0 && (
          <div style={{ fontSize: '10px', color: insufficientBalance ? 'var(--loss-color)' : 'var(--text-muted)', marginTop: '4px' }}>
            Margin: {account ? formatCurrency(marginRequired, currency) : '—'}
            {insufficientBalance && ' ⚠ Tidak cukup'}
          </div>
        )}
      </div>

      {/* ── TP/SL mode toggle ── */}
      <div style={{ padding: '0 12px 6px', display: 'flex', gap: '4px' }}>
        {(['price', 'currency'] as TpSlMode[]).map(m => (
          <button
            key={m}
            onClick={() => setTpSlMode(m)}
            style={{
              flex: 1, padding: '4px 8px', borderRadius: '6px',
              border: `1px solid ${tpSlMode === m ? 'var(--accent-blue)' : 'var(--border-subtle)'}`,
              background: tpSlMode === m ? 'var(--accent-blue-glow)' : 'var(--bg-tertiary)',
              color: tpSlMode === m ? 'var(--accent-blue)' : 'var(--text-muted)',
              fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              transition: 'all 0.15s',
            }}
          >
            {m === 'price' ? '📍 Harga' : `💰 ${currency}`}
          </button>
        ))}
      </div>

      {/* ── Take Profit ── */}
      <div className="order-section">
        <div className="order-label">
          <span style={{ color: 'var(--profit-color)' }}>✓ Take Profit</span>
          {pnlAtTP && (
            <span style={{ color: 'var(--profit-color)', fontSize: '10px', fontWeight: 700 }}>
              +{formatCurrency(pnlAtTP.pnlIDR, currency)}
            </span>
          )}
        </div>

        {tpSlMode === 'price' ? (
          <>
            <div className="input-group">
              <input
                id="order-tp-input"
                type="number"
                value={tpInput}
                onChange={e => {
                  setTpInput(e.target.value)
                  const v = parseFloat(e.target.value)
                  setTakeProfit(isNaN(v) ? null : v)
                }}
                step={pip}
                placeholder="Not set"
              />
              <div style={{ padding: '0 8px', color: 'var(--text-muted)', fontSize: '10px', flexShrink: 0 }}>Price</div>
              <div className="input-stepper">
                <button onClick={() => setTpPips(tpPips - 10)}>−</button>
                <button onClick={() => setTpPips(tpPips + 10)}>+</button>
              </div>
            </div>
            {/* Pip presets */}
            <div style={{ display: 'flex', gap: '4px', marginTop: '5px' }}>
              {TP_PRESETS.map(p => (
                <button key={p} onClick={() => setTpPips(p)} style={{
                  flex: 1, padding: '3px', borderRadius: '4px', border: '1px solid var(--border-subtle)',
                  background: Math.round(tpPips) === p ? 'rgba(38,166,154,0.15)' : 'var(--bg-tertiary)',
                  color: Math.round(tpPips) === p ? '#26a69a' : 'var(--text-muted)',
                  fontSize: '10px', cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace',
                }}>+{p}</button>
              ))}
            </div>
          </>
        ) : (
          <div className="input-group">
            <input
              id="order-tp-amount-input"
              type="number"
              value={tpAmount}
              onChange={e => handleTpAmountChange(e.target.value)}
              placeholder={`Profit (${currency})`}
              min={0}
            />
            <div style={{ padding: '0 8px', color: '#26a69a', fontSize: '10px', flexShrink: 0 }}>
              {currency}
            </div>
          </div>
        )}
        {takeProfit && (
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '3px' }}>
            @ {takeProfit.toFixed(dec)} · {tpPips.toFixed(0)} pips
          </div>
        )}
      </div>

      {/* ── Stop Loss ── */}
      <div className="order-section">
        <div className="order-label">
          <span style={{ color: 'var(--loss-color)' }}>✗ Stop Loss</span>
          {pnlAtSL && (
            <span style={{ color: 'var(--loss-color)', fontSize: '10px', fontWeight: 700 }}>
              {formatCurrency(pnlAtSL.pnlIDR, currency)}
            </span>
          )}
        </div>

        {tpSlMode === 'price' ? (
          <>
            <div className="input-group">
              <input
                id="order-sl-input"
                type="number"
                value={slInput}
                onChange={e => {
                  setSlInput(e.target.value)
                  const v = parseFloat(e.target.value)
                  setStopLoss(isNaN(v) ? null : v)
                }}
                step={pip}
                placeholder="Not set"
              />
              <div style={{ padding: '0 8px', color: 'var(--text-muted)', fontSize: '10px', flexShrink: 0 }}>Price</div>
              <div className="input-stepper">
                <button onClick={() => setSlPips(slPips - 10)}>−</button>
                <button onClick={() => setSlPips(slPips + 10)}>+</button>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '4px', marginTop: '5px' }}>
              {SL_PRESETS.map(p => (
                <button key={p} onClick={() => setSlPips(p)} style={{
                  flex: 1, padding: '3px', borderRadius: '4px', border: '1px solid var(--border-subtle)',
                  background: Math.round(slPips) === p ? 'rgba(239,83,80,0.15)' : 'var(--bg-tertiary)',
                  color: Math.round(slPips) === p ? '#ef5350' : 'var(--text-muted)',
                  fontSize: '10px', cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace',
                }}>-{p}</button>
              ))}
            </div>
          </>
        ) : (
          <div className="input-group">
            <input
              id="order-sl-amount-input"
              type="number"
              value={slAmount}
              onChange={e => handleSlAmountChange(e.target.value)}
              placeholder={`Loss maks (${currency})`}
              min={0}
            />
            <div style={{ padding: '0 8px', color: '#ef5350', fontSize: '10px', flexShrink: 0 }}>
              {currency}
            </div>
          </div>
        )}
        {stopLoss && (
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '3px' }}>
            @ {stopLoss.toFixed(dec)} · {slPips.toFixed(0)} pips
          </div>
        )}
      </div>

      {/* R:R */}
      {slPips > 0 && tpPips > 0 && (
        <div style={{ margin: '0 12px 8px', padding: '7px 10px', background: 'var(--bg-tertiary)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', border: '1px solid var(--border-subtle)' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>R:R Ratio</span>
          <span style={{ fontSize: '12px', fontWeight: 700, color: parseFloat(rrRatio) >= 2 ? 'var(--profit-color)' : parseFloat(rrRatio) >= 1 ? 'var(--warning-color)' : 'var(--loss-color)' }}>
            1:{rrRatio}
          </span>
        </div>
      )}

      {/* ── Risk Calculator ── */}
      <div className="risk-calc">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: useRisk ? '8px' : '0' }}>
          <div className="risk-calc-title">⚡ Risk Calculator</div>
          <div className={`toggle-switch ${useRisk ? 'on' : ''}`} onClick={() => setUseRisk(v => !v)} id="risk-calc-toggle" />
        </div>
        {useRisk && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{riskPercent}% risk</span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                ≈ {account ? formatCurrency((riskPercent / 100) * account.balance, currency) : '-'}
              </span>
            </div>
            <input type="range" className="risk-slider" min={0.1} max={5} step={0.1} value={riskPercent}
              onChange={e => setRiskPercent(parseFloat(e.target.value))} id="risk-percent-slider" />
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Auto lot: <strong style={{ color: 'var(--text-primary)' }}>{lotSize}</strong>
            </div>
          </>
        )}
      </div>

      {/* ── Confirm button ── */}
      <div style={{ padding: '8px 12px 6px' }}>
        <button
          className={`confirm-btn ${orderSide === 'BUY' ? 'buy' : 'sell'}`}
          onClick={handleConfirm}
          disabled={!canTrade || confirming || !!insufficientBalance}
          id="order-confirm-btn"
          style={{ fontSize: '13px', fontWeight: 800 }}
        >
          {confirming
            ? '✓ Order masuk!'
            : insufficientBalance
            ? '⚠ Margin tidak cukup'
            : `${orderSide === 'BUY' ? '▲ BUY' : '▼ SELL'} ${lotSize} lot @ ${entryP.toFixed(dec)}`}
        </button>
      </div>

      {/* Hint: drag SL/TP */}
      {canTrade && !confirming && (
        <div style={{ margin: '0 12px 8px', padding: '6px 10px', background: 'rgba(59,130,246,0.05)', borderRadius: '6px', fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center', border: '1px solid rgba(59,130,246,0.1)' }}>
          💡 Setelah entry, drag garis <span style={{ color: '#26a69a' }}>TP</span> / <span style={{ color: '#ef5350' }}>SL</span> di chart untuk mengubah level
        </div>
      )}

      {/* Meta info */}
      <div className="order-meta">
        <div className="order-meta-item">
          <span className="order-meta-label">Leverage</span>
          <span className="order-meta-value">1:{account?.leverage ?? '—'}</span>
        </div>
        <div className="order-meta-item">
          <span className="order-meta-label">Balance</span>
          <span className="order-meta-value">{account ? formatCurrency(account.balance, currency) : '—'}</span>
        </div>
        <div className="order-meta-item">
          <span className="order-meta-label">Equity</span>
          <span className="order-meta-value">{account ? formatCurrency(account.equity, currency) : '—'}</span>
        </div>
      </div>

      {!account && (
        <div style={{ margin: '8px 12px', padding: '10px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '8px', fontSize: '12px', color: 'var(--warning-color)' }}>
          ⚠ <a href="/dashboard" style={{ color: 'var(--accent-blue)', textDecoration: 'none' }}>Buat porto</a> dulu di Dashboard
        </div>
      )}
    </div>
  )
}
