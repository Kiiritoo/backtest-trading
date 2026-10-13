'use client'

import { useEffect, useRef, useState } from 'react'
import {
  createChart, CrosshairMode, LineStyle,
  CandlestickSeries,
  type IChartApi, type ISeriesApi, type Time, type IPriceLine,
} from 'lightweight-charts'
import { useTradingStore } from '@/lib/store/trading-store'
import { SYMBOLS } from '@/lib/market/symbols'
import type { OHLCVBar } from '@/lib/market/yahoo'

const TIMEFRAMES = ['1m', '5m', '15m', '30m', '1h', '4h', 'D', 'W']
const TF_MAP: Record<string, string> = { 'D': '1d', 'W': '1wk' }
const SPEED_OPTIONS = [0.5, 1, 2, 5, 10, 20]

const DRAW_TOOLS = [
  { id: 'cursor', icon: '↖', label: 'Cursor' },
  { id: 'cross',  icon: '+', label: 'Crosshair' },
  { id: 'hline',  icon: '—', label: 'H. Line' },
  { id: 'trend',  icon: '/', label: 'Trendline' },
  { id: 'ray',    icon: '→', label: 'Ray Line' },
  { id: 'fib',    icon: '𝛗', label: 'Fibonacci' },
  { id: 'rect',   icon: '□', label: 'Rectangle' },
  { id: 'text',   icon: 'T', label: 'Text' },
]

interface Props {
  bars: OHLCVBar[]
  symbol: string
  timeframe: string
  onTimeframeChange: (tf: string) => void
  isReplayMode: boolean
  replayRunning: boolean
  currentBarIndex: number
  totalBars?: number
  onToggleReplay: () => void
  onToggleReplayRunning: () => void
  onStepForward: () => void
  replaySpeed: number
  onChangeReplaySpeed?: (v: number) => void
  onToggleSidebar?: () => void
  showSidebar?: boolean
  onOpenGachaJump?: () => void
}

// One label per price-line (entry / TP / SL)
interface LineLabel {
  y: number
  price: number
  type: 'entry' | 'tp' | 'sl'
  lot: number
  direction: 'BUY' | 'SELL'
  tradeId?: string       // undefined = pre-entry preview
  entryPrice: number
  pnlIDR: number | null  // null for preview (no filled trade yet)
}

export default function TradingChart({
  bars, symbol, timeframe, onTimeframeChange,
  isReplayMode, replayRunning, currentBarIndex, totalBars,
  onToggleReplay, onToggleReplayRunning, onStepForward,
  replaySpeed, onChangeReplaySpeed,
  onToggleSidebar, showSidebar, onOpenGachaJump,
}: Props) {

  // ── Refs ──────────────────────────────────────────────────────────────────
  const containerRef  = useRef<HTMLDivElement>(null)
  const chartRef      = useRef<IChartApi | null>(null)
  const seriesRef     = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const tradeLineRefs = useRef<Map<string, IPriceLine>>(new Map())
  const previewRefs   = useRef<{ entry?: IPriceLine; tp?: IPriceLine; sl?: IPriceLine }>({})
  const rafRef        = useRef<number | null>(null)
  const updateLabelsRef = useRef<() => void>(() => {})
  const userPannedRef = useRef(false)
  const activeDragRef = useRef<{
    type: 'tp' | 'sl'
    tradeId?: string
    startY: number
    startPrice: number
    fieldKey: string
  } | null>(null)

  // ── Store ─────────────────────────────────────────────────────────────────
  const activeTool    = useTradingStore(s => s.activeTool)
  const setActiveTool = useTradingStore(s => s.setActiveTool)
  const allTrades     = useTradingStore(s => s.trades)
  const openTrades    = allTrades.filter(t => t.status === 'OPEN' && t.symbol === symbol)
  const updateTradeTP = useTradingStore(s => s.updateTradeTP)
  const updateTradeSL = useTradingStore(s => s.updateTradeSL)
  const cancelTrade   = useTradingStore(s => s.cancelTrade)
  const setBarIndex   = useTradingStore(s => s.setCurrentBarIndex)

  const orderSide     = useTradingStore(s => s.orderSide)
  const takeProfit    = useTradingStore(s => s.takeProfit)
  const stopLoss      = useTradingStore(s => s.stopLoss)
  const lotSize       = useTradingStore(s => s.lotSize)
  const setTakeProfit = useTradingStore(s => s.setTakeProfit)
  const setStopLoss   = useTradingStore(s => s.setStopLoss)

  // ── State ─────────────────────────────────────────────────────────────────
  const [ohlcInfo, setOhlcInfo]     = useState({ o: 0, h: 0, l: 0, c: 0, pct: 0 })
  const [lineLabels, setLineLabels] = useState<LineLabel[]>([])
  const [chartH, setChartH]         = useState(400)
  const [draggedFields, setDraggedFields] = useState<Set<string>>(new Set())

  // ── Derived ───────────────────────────────────────────────────────────────
  const symConfig = SYMBOLS.find(s => s.symbol === symbol)
  const displayTF = timeframe === '1d' ? 'D' : timeframe === '1wk' ? 'W' : timeframe
  const dec       = symConfig?.decimals ?? 5

  const currentPrice = bars.length > 0
    ? (isReplayMode
        ? (bars[Math.min(currentBarIndex, bars.length - 1)]?.close ?? 0)
        : (bars[bars.length - 1]?.close ?? 0))
    : 0

  const tradesKey = openTrades.map(t =>
    `${t.id}:${t.entryPrice}:${t.takeProfit}:${t.stopLoss}`).join('|')

  const USD_IDR = 15_500
  function calcPnlIDR(entryP: number, exitP: number, dir: 'BUY' | 'SELL', lot: number): number {
    const sign = dir === 'BUY' ? 1 : -1
    const contractSize = symConfig?.contractSize ?? 100
    return Math.round(sign * (exitP - entryP) * lot * contractSize * USD_IDR)
  }

  // ── 1. Chart init ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return

    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: '#0d0f12' },
        textColor: '#6b7f9a',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.03)' },
        horzLines: { color: 'rgba(255,255,255,0.03)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: 'rgba(255,255,255,0.15)', labelBackgroundColor: '#1e2530', width: 1, style: LineStyle.Dashed },
        horzLine: { color: 'rgba(255,255,255,0.15)', labelBackgroundColor: '#1e2530', width: 1, style: LineStyle.Dashed },
      },
      rightPriceScale: { borderColor: 'rgba(255,255,255,0.05)', textColor: '#6b7f9a' },
      timeScale: {
        borderColor: 'rgba(255,255,255,0.05)',
        textColor: '#6b7f9a',
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 5,
      },
      width:  containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
    })

    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#26a69a', downColor: '#ef5350',
      borderUpColor: '#26a69a', borderDownColor: '#ef5350',
      wickUpColor: '#26a69a', wickDownColor: '#ef5350',
    })

    chart.subscribeCrosshairMove(param => {
      if (param.seriesData.size > 0) {
        const d = param.seriesData.get(series) as any
        if (d) setOhlcInfo({ o: d.open, h: d.high, l: d.low, c: d.close, pct: d.open > 0 ? ((d.close - d.open) / d.open * 100) : 0 })
      }
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(() => updateLabelsRef.current())
    })

    chart.timeScale().subscribeVisibleLogicalRangeChange(range => {
      if (range !== null) userPannedRef.current = true
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(() => updateLabelsRef.current())
    })

    chartRef.current = chart
    seriesRef.current = series
    setChartH(containerRef.current.clientHeight)

    const ro = new ResizeObserver(() => {
      if (!containerRef.current || !chartRef.current) return
      chartRef.current.applyOptions({
        width:  containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
      })
      setChartH(containerRef.current.clientHeight)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(() => updateLabelsRef.current())
    })
    ro.observe(containerRef.current)

    return () => {
      ro.disconnect()
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
    }
  }, [])

  // ── 2. Full bar load ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!seriesRef.current || bars.length === 0) return
    const end  = isReplayMode ? Math.min(currentBarIndex + 1, bars.length) : bars.length
    const data = bars.slice(0, end).map(b => ({ time: b.time as Time, open: b.open, high: b.high, low: b.low, close: b.close }))
    seriesRef.current.setData(data)
    if (!isReplayMode) { chartRef.current?.timeScale().fitContent(); userPannedRef.current = false }
    const last = bars[end - 1]
    if (last) setOhlcInfo({ o: last.open, h: last.high, l: last.low, c: last.close, pct: last.open > 0 ? ((last.close - last.open) / last.open * 100) : 0 })
  }, [bars]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── 3. Replay advance ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!seriesRef.current || !isReplayMode || bars.length === 0) return
    const end  = Math.min(currentBarIndex + 1, bars.length)
    const data = bars.slice(0, end).map(b => ({ time: b.time as Time, open: b.open, high: b.high, low: b.low, close: b.close }))
    seriesRef.current.setData(data)
    if (!userPannedRef.current) chartRef.current?.timeScale().scrollToRealTime()
    const bar = bars[end - 1]
    if (bar) setOhlcInfo({ o: bar.open, h: bar.high, l: bar.low, c: bar.close, pct: bar.open > 0 ? ((bar.close - bar.open) / bar.open * 100) : 0 })
  }, [currentBarIndex, isReplayMode]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (isReplayMode) userPannedRef.current = false }, [isReplayMode])

  // ── 4. Open trade price lines ─────────────────────────────────────────────
  useEffect(() => {
    const series = seriesRef.current
    if (!series) return
    tradeLineRefs.current.forEach(l => { try { series.removePriceLine(l) } catch {} })
    tradeLineRefs.current.clear()

    openTrades.forEach(trade => {
      const col = trade.direction === 'BUY' ? '#26a69a' : '#ef5350'
      tradeLineRefs.current.set(`e_${trade.id}`, series.createPriceLine({
        price: trade.entryPrice, color: col, lineWidth: 1, lineStyle: LineStyle.Solid,
        axisLabelVisible: true, title: '', draggable: false,
      }))
      if (trade.takeProfit !== null) {
        const tl = series.createPriceLine({
          price: trade.takeProfit, color: 'rgba(38,166,154,0.5)', lineWidth: 1, lineStyle: LineStyle.Dashed,
          axisLabelVisible: true, title: 'TP', draggable: true,
        })
        tradeLineRefs.current.set(`tp_${trade.id}`, tl)
        ;(tl as any).subscribeDragComplete?.((p: number) => updateTradeTP(trade.id, parseFloat(p.toFixed(dec))))
      }
      if (trade.stopLoss !== null) {
        const sl = series.createPriceLine({
          price: trade.stopLoss, color: 'rgba(239,83,80,0.5)', lineWidth: 1, lineStyle: LineStyle.Dashed,
          axisLabelVisible: true, title: 'SL', draggable: true,
        })
        tradeLineRefs.current.set(`sl_${trade.id}`, sl)
        ;(sl as any).subscribeDragComplete?.((p: number) => updateTradeSL(trade.id, parseFloat(p.toFixed(dec))))
      }
    })
    requestAnimationFrame(() => updateLabelsRef.current())
  }, [tradesKey, symbol, dec]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── 5. Preview price lines ────────────────────────────────────────────────
  useEffect(() => {
    const series = seriesRef.current
    if (!series) return
    if (previewRefs.current.entry) { try { series.removePriceLine(previewRefs.current.entry) } catch {} }
    if (previewRefs.current.tp)    { try { series.removePriceLine(previewRefs.current.tp) }    catch {} }
    if (previewRefs.current.sl)    { try { series.removePriceLine(previewRefs.current.sl) }    catch {} }
    previewRefs.current = {}

    if (!currentPrice || !symConfig) return
    const spread = (symConfig.spreadPips / 2) * symConfig.pipSize
    const entryP = orderSide === 'BUY' ? currentPrice + spread : currentPrice - spread
    const col    = orderSide === 'BUY' ? '#26a69a' : '#ef5350'

    previewRefs.current.entry = series.createPriceLine({
      price: entryP, color: col, lineWidth: 2, lineStyle: LineStyle.Solid,
      axisLabelVisible: true, title: '', draggable: false,
    })
    if (takeProfit !== null) {
      const tl = series.createPriceLine({
        price: takeProfit, color: 'rgba(38,166,154,0.45)', lineWidth: 1, lineStyle: LineStyle.Dashed,
        axisLabelVisible: true, title: 'TP', draggable: true,
      })
      previewRefs.current.tp = tl
      ;(tl as any).subscribeDragComplete?.((p: number) => setTakeProfit(parseFloat(p.toFixed(dec))))
    }
    if (stopLoss !== null) {
      const sl = series.createPriceLine({
        price: stopLoss, color: 'rgba(239,83,80,0.45)', lineWidth: 1, lineStyle: LineStyle.Dashed,
        axisLabelVisible: true, title: 'SL', draggable: true,
      })
      previewRefs.current.sl = sl
      ;(sl as any).subscribeDragComplete?.((p: number) => setStopLoss(parseFloat(p.toFixed(dec))))
    }
    requestAnimationFrame(() => updateLabelsRef.current())

    return () => {
      if (series) {
        if (previewRefs.current.entry) { try { series.removePriceLine(previewRefs.current.entry) } catch {} }
        if (previewRefs.current.tp)    { try { series.removePriceLine(previewRefs.current.tp) }    catch {} }
        if (previewRefs.current.sl)    { try { series.removePriceLine(previewRefs.current.sl) }    catch {} }
      }
    }
  }, [takeProfit, stopLoss, orderSide, lotSize, currentPrice, symbol]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── 6. Compute per-line labels ────────────────────────────────────────────
  function computeLabels() {
    const series = seriesRef.current
    if (!series || !chartRef.current) return  // guard: chart may be disposed
    const h = containerRef.current?.clientHeight ?? 400

    function getY(price: number): number | null {
      const y = (series as any).priceToCoordinate?.(price)
      return (y != null && y > 8 && y < h - 8) ? y : null
    }

    const result: LineLabel[] = []

    // Preview labels
    if (currentPrice && symConfig) {
      const spread = (symConfig.spreadPips / 2) * symConfig.pipSize
      const entryP = orderSide === 'BUY' ? currentPrice + spread : currentPrice - spread

      const yE = getY(entryP)
      if (yE !== null) result.push({ y: yE, price: entryP, type: 'entry', lot: lotSize, direction: orderSide, entryPrice: entryP, pnlIDR: null })

      if (takeProfit !== null) {
        const y = getY(takeProfit)
        if (y !== null) result.push({ y, price: takeProfit, type: 'tp', lot: lotSize, direction: orderSide, entryPrice: entryP, pnlIDR: calcPnlIDR(entryP, takeProfit, orderSide, lotSize) })
      }
      if (stopLoss !== null) {
        const y = getY(stopLoss)
        if (y !== null) result.push({ y, price: stopLoss, type: 'sl', lot: lotSize, direction: orderSide, entryPrice: entryP, pnlIDR: calcPnlIDR(entryP, stopLoss, orderSide, lotSize) })
      }
    }

    // Open trade labels
    openTrades.forEach(trade => {
      const yE = getY(trade.entryPrice)
      if (yE !== null) result.push({ y: yE, price: trade.entryPrice, type: 'entry', lot: trade.lotSize, direction: trade.direction, tradeId: trade.id, entryPrice: trade.entryPrice, pnlIDR: null })

      if (trade.takeProfit !== null) {
        const y = getY(trade.takeProfit)
        if (y !== null) result.push({ y, price: trade.takeProfit, type: 'tp', lot: trade.lotSize, direction: trade.direction, tradeId: trade.id, entryPrice: trade.entryPrice, pnlIDR: calcPnlIDR(trade.entryPrice, trade.takeProfit, trade.direction, trade.lotSize) })
      }
      if (trade.stopLoss !== null) {
        const y = getY(trade.stopLoss)
        if (y !== null) result.push({ y, price: trade.stopLoss, type: 'sl', lot: trade.lotSize, direction: trade.direction, tradeId: trade.id, entryPrice: trade.entryPrice, pnlIDR: calcPnlIDR(trade.entryPrice, trade.stopLoss, trade.direction, trade.lotSize) })
      }
    })

    setLineLabels(result)
  }

  updateLabelsRef.current = computeLabels

  const labelsKey = `${takeProfit}:${stopLoss}:${tradesKey}:${currentBarIndex}:${chartH}:${orderSide}:${lotSize}`
  useEffect(() => { computeLabels() }, [labelsKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── 7. Drag TP/SL from overlay label ─────────────────────────────────────
  function startDragField(e: React.MouseEvent, type: 'tp' | 'sl', startPrice: number, tradeId?: string) {
    e.preventDefault()
    e.stopPropagation()
    const fieldKey = `${tradeId ?? 'preview'}_${type}`
    activeDragRef.current = { type, tradeId, startY: e.clientY, startPrice, fieldKey }

    function onMove(me: MouseEvent) {
      const drag = activeDragRef.current
      if (!drag || !seriesRef.current) return
      const dy = me.clientY - drag.startY
      const s  = seriesRef.current as any
      const p0 = s.coordinateToPrice?.(100)
      const p1 = s.coordinateToPrice?.(0)
      const ratio = (p0 != null && p1 != null) ? Math.abs((p1 - p0) / 100) : 0.1
      const newPrice = parseFloat((drag.startPrice - dy * ratio).toFixed(dec))

      if (drag.tradeId) {
        drag.type === 'tp' ? updateTradeTP(drag.tradeId, newPrice) : updateTradeSL(drag.tradeId, newPrice)
      } else {
        drag.type === 'tp' ? setTakeProfit(newPrice) : setStopLoss(newPrice)
      }
    }

    function onUp() {
      const drag = activeDragRef.current  // capture before clearing
      if (drag) {
        setDraggedFields(prev => new Set([...prev, drag.fieldKey]))
      }
      activeDragRef.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  // ── 8. Scrubber ───────────────────────────────────────────────────────────
  function handleScrub(e: React.ChangeEvent<HTMLInputElement>) {
    userPannedRef.current = false
    setBarIndex(parseInt(e.target.value))
  }
  const progressPct = bars.length > 1 ? Math.round((currentBarIndex / (bars.length - 1)) * 100) : 0

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0, flexDirection: 'column' }}>

      {/* Replay scrubber */}
      {isReplayMode && (
        <div style={{
          height: '28px', flexShrink: 0, background: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex', alignItems: 'center', padding: '0 12px', gap: '10px',
        }}>
          <span style={{ fontSize: '10px', color: '#f59e0b', fontWeight: 700, whiteSpace: 'nowrap' }}>
            Bar {currentBarIndex}
          </span>
          <input
            type="range" min={0} max={bars.length > 1 ? bars.length - 1 : 100}
            value={currentBarIndex} onChange={handleScrub}
            style={{ flex: 1, height: '4px', cursor: 'pointer', accentColor: '#f59e0b' }}
            id="replay-scrubber"
          />
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
            {progressPct}% &middot; {bars.length} bars
          </span>
        </div>
      )}

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>

        {/* Left toolbar */}
        <div className="chart-left-toolbar">
          <button
            className={`chart-tool-btn ${showSidebar ? 'active' : ''}`}
            onClick={onToggleSidebar} title="Instruments" id="sidebar-toggle-btn"
            style={{ marginBottom: '8px' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
            <span className="chart-tool-tooltip">Instruments</span>
          </button>
          <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '4px 6px' }} />
          {DRAW_TOOLS.map(tool => (
            <button key={tool.id}
              className={`chart-tool-btn ${activeTool === tool.id ? 'active' : ''}`}
              onClick={() => setActiveTool(activeTool === tool.id ? null : tool.id)}
              id={`tool-${tool.id}`} title={tool.label}>
              <span style={{ fontSize: '12px', lineHeight: 1 }}>{tool.icon}</span>
              <span className="chart-tool-tooltip">{tool.label}</span>
            </button>
          ))}
        </div>

        {/* Chart column */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>

          {/* Top toolbar */}
          <div className="chart-toolbar" style={{ borderLeft: 'none' }}>
            {TIMEFRAMES.map(tf => {
              const actual = TF_MAP[tf] || tf
              return (
                <button key={tf}
                  className={`timeframe-btn ${timeframe === actual ? 'active' : ''}`}
                  onClick={() => onTimeframeChange(actual)} id={`tf-btn-${tf}`}>
                  {tf}
                </button>
              )
            })}
            <div className="toolbar-sep" />
            <button className="chart-action-btn" id="indicators-btn">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
              Indicators
            </button>
            <div className="toolbar-sep" />

            {/* Replay */}
            <button onClick={onToggleReplay} id="replay-toggle-toolbar-btn" style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '4px 10px', borderRadius: '6px', cursor: 'pointer',
              fontFamily: 'inherit', fontSize: '11px', fontWeight: 700,
              background: isReplayMode ? 'rgba(245,158,11,0.18)' : 'var(--bg-tertiary)',
              color: isReplayMode ? '#f59e0b' : 'var(--text-secondary)',
              border: isReplayMode ? '1px solid rgba(245,158,11,0.35)' : '1px solid var(--border-subtle)',
              transition: 'all 0.15s',
            }}>
              {isReplayMode ? '⏹ Exit Replay' : '⏮ Replay'}
            </button>

            {/* Gacha */}
            <button onClick={onOpenGachaJump} id="gacha-toolbar-btn" style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '4px 10px', borderRadius: '6px', cursor: 'pointer',
              fontFamily: 'inherit', fontSize: '11px', fontWeight: 700,
              background: 'rgba(139,92,246,0.12)', color: '#c4b5fd',
              border: '1px solid rgba(139,92,246,0.25)', transition: 'all 0.15s',
            }}>
              🎲 Gacha
            </button>

            {/* Replay controls */}
            {isReplayMode && (
              <>
                <div className="toolbar-sep" />
                <button className="btn-icon" onClick={onToggleReplayRunning}
                  style={{ color: replayRunning ? '#f59e0b' : '#26a69a', fontSize: '16px', padding: '2px 6px' }}
                  id="chart-replay-play-btn">
                  {replayRunning ? '⏸' : '▶'}
                </button>
                <button className="btn-icon" onClick={onStepForward}
                  style={{ fontSize: '16px', padding: '2px 6px' }} id="chart-replay-step-btn">
                  ⏭
                </button>
                <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
                  {SPEED_OPTIONS.map(s => (
                    <button key={s} onClick={() => onChangeReplaySpeed?.(s)} style={{
                      padding: '2px 6px', borderRadius: '4px', border: 'none',
                      background: replaySpeed === s ? 'rgba(245,158,11,0.25)' : 'transparent',
                      color: replaySpeed === s ? '#f59e0b' : 'var(--text-muted)',
                      fontSize: '10px', fontWeight: 800, cursor: 'pointer',
                      fontFamily: 'JetBrains Mono, monospace',
                    }}>{s}x</button>
                  ))}
                </div>
                <div style={{
                  marginLeft: '8px', padding: '2px 8px', borderRadius: '4px',
                  fontSize: '10px', fontWeight: 800,
                  background: 'rgba(245,158,11,0.15)', color: '#f59e0b',
                  fontFamily: 'JetBrains Mono, monospace',
                }}>
                  {currentBarIndex} / {totalBars ?? bars.length}
                </div>
              </>
            )}
            <div style={{ marginLeft: 'auto' }} />
          </div>

          {/* Chart + overlay */}
          <div ref={containerRef} className="chart-container"
            style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>

            {/* OHLC info bar */}
            <div className="chart-info-bar">
              <span style={{ color: '#6b7f9a', fontSize: '11px', fontWeight: 700 }}>
                {symConfig?.name ?? symbol} &middot; {displayTF}
              </span>
              <span style={{ color: '#8899b0' }}>O <span style={{ color: 'var(--text-primary)' }}>{ohlcInfo.o.toFixed(dec)}</span></span>
              <span style={{ color: '#8899b0' }}>H <span style={{ color: '#26a69a' }}>{ohlcInfo.h.toFixed(dec)}</span></span>
              <span style={{ color: '#8899b0' }}>L <span style={{ color: '#ef5350' }}>{ohlcInfo.l.toFixed(dec)}</span></span>
              <span style={{ color: '#8899b0' }}>C <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{ohlcInfo.c.toFixed(dec)}</span></span>
              <span style={{ color: ohlcInfo.pct >= 0 ? '#26a69a' : '#ef5350', fontWeight: 700 }}>
                {ohlcInfo.pct >= 0 ? '+' : ''}{ohlcInfo.pct.toFixed(2)}%
              </span>
            </div>

            {/* ══ PER-LINE LABELS — one per TP / SL / Entry line ══ */}
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10 }}>
              {lineLabels.map((lb, i) => {
                const isBuy  = lb.direction === 'BUY'
                const owner  = lb.tradeId ?? 'preview'
                const isDrag = draggedFields.has(`${owner}_${lb.type}`)

                // ── TP label ──────────────────────────────────────
                if (lb.type === 'tp') {
                  const pnlStr = lb.pnlIDR !== null
                    ? `+${lb.pnlIDR.toLocaleString('id-ID')} IDR`
                    : null
                  return (
                    <div key={i} style={{ position: 'absolute', right: '68px', top: lb.y - 11, pointerEvents: 'auto', userSelect: 'none' }}>
                      <div
                        onMouseDown={e => startDragField(e, 'tp', lb.price, lb.tradeId)}
                        title="Drag TP"
                        style={{
                          display: 'flex', alignItems: 'center',
                          borderRadius: '4px', overflow: 'hidden',
                          border: '1px solid rgba(38,166,154,0.55)',
                          fontSize: '10px', fontWeight: 800,
                          fontFamily: 'JetBrains Mono, monospace',
                          backdropFilter: 'blur(8px)',
                          cursor: 'ns-resize',
                        }}
                      >
                        <div style={{ padding: '2px 6px', background: 'rgba(38,166,154,0.22)', color: '#26a69a', borderRight: '1px solid rgba(38,166,154,0.3)' }}>
                          {lb.lot}
                        </div>
                        {pnlStr ? (
                          <div style={{ padding: '2px 8px', background: 'rgba(38,166,154,0.1)', color: '#4ade80' }}>
                            {pnlStr}
                          </div>
                        ) : (
                          <div style={{ padding: '2px 7px', background: 'rgba(38,166,154,0.08)', color: 'rgba(38,166,154,0.65)', fontSize: '9px' }}>
                            TP ↕
                          </div>
                        )}
                        <div style={{ padding: '2px 5px', background: 'rgba(38,166,154,0.18)', color: '#26a69a', lineHeight: 1 }}>
                          ×
                        </div>
                      </div>
                    </div>
                  )
                }

                // ── SL label ──────────────────────────────────────
                if (lb.type === 'sl') {
                  const pnlStr = lb.pnlIDR !== null
                    ? `${lb.pnlIDR.toLocaleString('id-ID')} IDR`
                    : null
                  return (
                    <div key={i} style={{ position: 'absolute', right: '68px', top: lb.y - 11, pointerEvents: 'auto', userSelect: 'none' }}>
                      <div
                        onMouseDown={e => startDragField(e, 'sl', lb.price, lb.tradeId)}
                        title="Drag SL"
                        style={{
                          display: 'flex', alignItems: 'center',
                          borderRadius: '4px', overflow: 'hidden',
                          border: '1px solid rgba(239,83,80,0.55)',
                          fontSize: '10px', fontWeight: 800,
                          fontFamily: 'JetBrains Mono, monospace',
                          backdropFilter: 'blur(8px)',
                          cursor: 'ns-resize',
                        }}
                      >
                        <div style={{ padding: '2px 6px', background: 'rgba(239,83,80,0.22)', color: '#ef5350', borderRight: '1px solid rgba(239,83,80,0.3)' }}>
                          {lb.lot}
                        </div>
                        {pnlStr ? (
                          <div style={{ padding: '2px 8px', background: 'rgba(239,83,80,0.1)', color: '#f87171' }}>
                            {pnlStr}
                          </div>
                        ) : (
                          <div style={{ padding: '2px 7px', background: 'rgba(239,83,80,0.08)', color: 'rgba(239,83,80,0.65)', fontSize: '9px' }}>
                            SL ↕
                          </div>
                        )}
                        <div style={{ padding: '2px 5px', background: 'rgba(239,83,80,0.18)', color: '#ef5350', lineHeight: 1 }}>
                          ×
                        </div>
                      </div>
                    </div>
                  )
                }

                // ── Entry label ────────────────────────────────────
                const col = isBuy ? '#26a69a' : '#ef5350'
                return (
                  <div key={i} style={{ position: 'absolute', right: '68px', top: lb.y - 11, pointerEvents: 'auto', userSelect: 'none' }}>
                    <div style={{
                      display: 'flex', alignItems: 'center',
                      borderRadius: '4px', overflow: 'hidden',
                      border: `1px solid ${col}55`,
                      fontSize: '10px', fontWeight: 800,
                      fontFamily: 'JetBrains Mono, monospace',
                      backdropFilter: 'blur(8px)',
                    }}>
                      <div style={{ padding: '2px 7px', background: isBuy ? 'rgba(38,166,154,0.2)' : 'rgba(239,83,80,0.2)', color: col, borderRight: `1px solid ${col}33` }}>
                        {!lb.tradeId ? '📍 ' : ''}{lb.direction}
                      </div>
                      <div style={{ padding: '2px 6px', background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)', borderRight: lb.tradeId ? `1px solid ${col}22` : 'none' }}>
                        {lb.lot}L
                      </div>
                      {lb.tradeId && (
                        <div
                          onClick={() => lb.tradeId && cancelTrade(lb.tradeId)}
                          style={{ padding: '2px 7px', background: 'rgba(239,83,80,0.15)', color: '#ef5350', cursor: 'pointer', fontWeight: 900, fontSize: '12px', lineHeight: 1 }}
                          title="Close trade"
                        >
                          ×
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
