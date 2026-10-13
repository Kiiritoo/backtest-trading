'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { SYMBOLS, USD_TO_IDR } from '@/lib/market/symbols'
import { calcPnL, checkSLTP, getExitPrice } from '@/lib/trading/simulator'
import { rollGacha, type GachaResult, getStreakMessage } from '@/lib/trading/gacha'
import type { OHLCVBar } from '@/lib/market/yahoo'

// ============================================================
// TYPES
// ============================================================

export interface Account {
  id: string
  name: string
  currency: 'IDR' | 'USD' | 'EUR'
  balance: number
  equity: number
  initialBalance: number
  leverage: number
  isActive: boolean
  createdAt: string
}

export interface Trade {
  id: string
  accountId: string
  symbol: string
  direction: 'BUY' | 'SELL'
  lotSize: number
  entryPrice: number
  exitPrice: number | null
  takeProfit: number | null
  stopLoss: number | null
  pnlPips: number | null
  pnlUSD: number | null
  pnlIDR: number | null
  status: 'OPEN' | 'CLOSED' | 'PENDING'
  closeReason: 'TP' | 'SL' | 'MANUAL' | null
  openedAt: string
  closedAt: string | null
  timeframe: string
  entryBarIndex: number | null
  exitBarIndex: number | null
  gachaReward: GachaResult | null
}

export interface DrawingObject {
  id: string
  type: 'line' | 'ray' | 'hline' | 'trend' | 'text' | 'fib' | 'rect'
  points: { time: number; price: number }[]
  color: string
  lineWidth: number
  label?: string
  text?: string
}

// ============================================================
// STORE INTERFACE
// ============================================================

interface TradingStore {
  // Accounts
  accounts: Account[]
  activeAccountId: string | null
  addAccount: (acc: Omit<Account, 'id' | 'equity' | 'createdAt'>) => string
  setActiveAccount: (id: string) => void
  updateAccountBalance: (id: string, delta: number) => void
  deleteAccount: (id: string) => void
  resetAccount: (id: string) => void

  // Trades
  trades: Trade[]
  openTrade: (trade: Omit<Trade, 'id' | 'exitPrice' | 'pnlPips' | 'pnlUSD' | 'pnlIDR' | 'closedAt' | 'gachaReward' | 'exitBarIndex'>) => string
  closeTrade: (tradeId: string, exitPrice: number, reason: 'TP' | 'SL' | 'MANUAL') => GachaResult | null
  updateTradeTP: (tradeId: string, tp: number | null) => void
  updateTradeSL: (tradeId: string, sl: number | null) => void
  cancelTrade: (tradeId: string) => void

  // Chart / replay
  activeSymbol: string
  activeTimeframe: string
  bars: OHLCVBar[]
  currentBarIndex: number
  isReplayMode: boolean
  replaySpeed: number
  replayRunning: boolean
  setActiveSymbol: (s: string) => void
  setActiveTimeframe: (tf: string) => void
  setBars: (bars: OHLCVBar[]) => void
  setCurrentBarIndex: (i: number) => void
  toggleReplayMode: () => void
  setReplayRunning: (v: boolean) => void
  setReplaySpeed: (v: number) => void
  stepReplay: () => void
  jumpToBar: (index: number) => void
  gachaJump: (minBarsAhead?: number, maxBarsAhead?: number) => void

  // Drawing tools
  activeTool: string | null
  drawings: DrawingObject[]
  setActiveTool: (tool: string | null) => void
  addDrawing: (d: DrawingObject) => void
  removeDrawing: (id: string) => void
  clearDrawings: () => void

  // Gacha / streak
  pendingGacha: GachaResult | null
  streak: number
  setPendingGacha: (g: GachaResult | null) => void

  // Order form
  orderSide: 'BUY' | 'SELL'
  orderType: 'MARKET' | 'PENDING'
  lotSize: number
  takeProfit: number | null
  stopLoss: number | null
  riskPercent: number
  setOrderSide: (s: 'BUY' | 'SELL') => void
  setOrderType: (t: 'MARKET' | 'PENDING') => void
  setLotSize: (v: number) => void
  setTakeProfit: (v: number | null) => void
  setStopLoss: (v: number | null) => void
  setRiskPercent: (v: number) => void
}

// ============================================================
// HELPERS — Compute gacha result from a trade result inline
// ============================================================

function computeClose(
  trade: Trade,
  exitPrice: number,
  reason: 'TP' | 'SL' | 'MANUAL',
  streak: number,
  accountBalance: number,
  exitBarIndex: number | null
): { updatedTrade: Trade; gachaRes: GachaResult; pnlIDR: number } {
  const sym = SYMBOLS.find(s => s.symbol === trade.symbol)
  if (!sym) throw new Error('Symbol not found: ' + trade.symbol)

  const result = calcPnL(trade.direction, trade.entryPrice, exitPrice, trade.lotSize, sym, 'IDR')
  const isProfit = result.pnlIDR >= 0
  const tradeResult: 'profit' | 'loss' = isProfit ? 'profit' : 'loss'
  const newStreak = isProfit ? streak + 1 : 0

  const card = rollGacha(tradeResult, newStreak, accountBalance)
  const bonusApplied = card.type === 'balance_bonus' ? card.effectValue : 0

  const gachaRes: GachaResult = {
    card,
    pnl: result.pnlUSD,
    pnlIDR: result.pnlIDR + bonusApplied,
    tradeResult,
    streak: newStreak,
    streakMessage: getStreakMessage(newStreak, isProfit),
    bonusApplied,
  }

  const updatedTrade: Trade = {
    ...trade,
    exitPrice,
    pnlPips: result.pips,
    pnlUSD: result.pnlUSD,
    pnlIDR: result.pnlIDR,
    status: 'CLOSED',
    closeReason: reason,
    closedAt: new Date().toISOString(),
    exitBarIndex,
    gachaReward: gachaRes,
  }

  return { updatedTrade, gachaRes, pnlIDR: result.pnlIDR + bonusApplied }
}

// ============================================================
// STORE
// ============================================================

export const useTradingStore = create<TradingStore>()(
  persist(
    (set, get) => ({
      // ---- Accounts ----
      accounts: [],
      activeAccountId: null,

      addAccount: (acc) => {
        const id = crypto.randomUUID()
        const newAcc: Account = {
          ...acc,
          id,
          equity: acc.balance,
          createdAt: new Date().toISOString(),
        }
        set(s => ({
          accounts: [...s.accounts, newAcc],
          activeAccountId: s.activeAccountId ?? id,
        }))
        return id
      },

      setActiveAccount: (id) => set({ activeAccountId: id }),

      updateAccountBalance: (id, delta) => {
        set(s => ({
          accounts: s.accounts.map(a =>
            a.id === id ? { ...a, balance: Math.max(0, a.balance + delta), equity: Math.max(0, a.equity + delta) } : a
          ),
        }))
      },

      deleteAccount: (id) => {
        set(s => ({
          accounts: s.accounts.filter(a => a.id !== id),
          activeAccountId: s.activeAccountId === id
            ? (s.accounts.find(a => a.id !== id)?.id ?? null)
            : s.activeAccountId,
        }))
      },

      resetAccount: (id) => {
        set(s => ({
          accounts: s.accounts.map(a =>
            a.id === id ? { ...a, balance: a.initialBalance, equity: a.initialBalance } : a
          ),
          trades: s.trades.filter(t => t.accountId !== id),
          streak: 0,
        }))
      },

      // ---- Trades ----
      trades: [],

      openTrade: (trade) => {
        const state = get()
        const account = state.accounts.find(a => a.id === trade.accountId)
        if (!account) return ''

        const id = crypto.randomUUID()
        const newTrade: Trade = {
          ...trade,
          id,
          exitPrice: null,
          pnlPips: null,
          pnlUSD: null,
          pnlIDR: null,
          closedAt: null,
          exitBarIndex: null,
          gachaReward: null,
        }
        set(s => ({ trades: [...s.trades, newTrade] }))
        return id
      },

      closeTrade: (tradeId, exitPrice, reason) => {
        // Fully atomic: compute everything then set in one call
        const state = get()
        const trade = state.trades.find(t => t.id === tradeId)
        if (!trade || trade.status === 'CLOSED') return null

        const account = state.accounts.find(a => a.id === trade.accountId)
        if (!account) return null

        const exitBarIndex = state.isReplayMode ? state.currentBarIndex : null

        let result: ReturnType<typeof computeClose>
        try {
          result = computeClose(trade, exitPrice, reason, state.streak, account.balance, exitBarIndex)
        } catch {
          return null
        }

        const { updatedTrade, gachaRes, pnlIDR } = result

        set(s => ({
          trades: s.trades.map(t => t.id === tradeId ? updatedTrade : t),
          accounts: s.accounts.map(a =>
            a.id === trade.accountId
              ? { ...a, balance: Math.max(0, a.balance + pnlIDR), equity: Math.max(0, a.equity + pnlIDR) }
              : a
          ),
          streak: gachaRes.streak,
          pendingGacha: gachaRes,
          // Pause replay when trade closes so user sees gacha
          replayRunning: false,
        }))

        return gachaRes
      },

      updateTradeTP: (tradeId, tp) => {
        set(s => ({ trades: s.trades.map(t => t.id === tradeId ? { ...t, takeProfit: tp } : t) }))
      },

      updateTradeSL: (tradeId, sl) => {
        set(s => ({ trades: s.trades.map(t => t.id === tradeId ? { ...t, stopLoss: sl } : t) }))
      },

      cancelTrade: (tradeId) => {
        set(s => ({ trades: s.trades.filter(t => t.id !== tradeId) }))
      },

      // ---- Chart / Replay ----
      activeSymbol: 'XAUUSD',
      activeTimeframe: '15m',
      bars: [],
      currentBarIndex: 0,
      isReplayMode: false,
      replaySpeed: 1,
      replayRunning: false,

      setActiveSymbol: (s) => set({ activeSymbol: s, bars: [], currentBarIndex: 0, isReplayMode: false, replayRunning: false }),
      setActiveTimeframe: (tf) => set({ activeTimeframe: tf, bars: [], currentBarIndex: 0 }),
      setBars: (bars) => set(s => ({
        bars,
        currentBarIndex: s.isReplayMode
          ? Math.max(0, bars.length - 100) // start replay from 100 bars before end
          : bars.length - 1,
      })),
      setCurrentBarIndex: (i) => set({ currentBarIndex: i }),

      toggleReplayMode: () => set(s => ({
        isReplayMode: !s.isReplayMode,
        replayRunning: false,
        // Start from 100 bars before end for replay
        currentBarIndex: s.isReplayMode
          ? s.bars.length - 1
          : Math.max(0, s.bars.length - 100),
      })),

      setReplayRunning: (v) => set({ replayRunning: v }),
      setReplaySpeed: (v) => set({ replaySpeed: v }),

      jumpToBar: (index) => set(s => ({
        currentBarIndex: Math.max(0, Math.min(index, s.bars.length - 1)),
      })),

      // ===== THE KEY FUNCTION: Fully atomic stepReplay =====
      stepReplay: () => {
        const state = get()
        const nextIdx = state.currentBarIndex + 1

        if (nextIdx >= state.bars.length) {
          set({ replayRunning: false })
          return
        }

        // If there's a pending gacha not yet dismissed, don't advance
        if (state.pendingGacha) return

        const currentBar = state.bars[nextIdx]

        // Find open trades for active account
        const openTrades = state.trades.filter(
          t => t.status === 'OPEN' && t.accountId === state.activeAccountId
        )

        // Check each open trade for SL/TP hits on this bar
        let closedAny = false
        let updatedTrades = state.trades.map(t => ({ ...t }))
        let updatedAccounts = state.accounts.map(a => ({ ...a }))
        let newStreak = state.streak
        let latestGacha: GachaResult | null = null

        for (const trade of openTrades) {
          const hit = checkSLTP(trade.direction, currentBar, trade.stopLoss, trade.takeProfit)
          if (!hit) continue

          const exitPrice = getExitPrice(hit, trade.direction, trade.stopLoss, trade.takeProfit, currentBar.close)
          const account = updatedAccounts.find(a => a.id === trade.accountId)
          if (!account) continue

          let closeResult: ReturnType<typeof computeClose>
          try {
            closeResult = computeClose(trade, exitPrice, hit, newStreak, account.balance, nextIdx)
          } catch {
            continue
          }

          const { updatedTrade, gachaRes, pnlIDR } = closeResult
          updatedTrades = updatedTrades.map(t => t.id === trade.id ? updatedTrade : t)
          updatedAccounts = updatedAccounts.map(a =>
            a.id === trade.accountId
              ? { ...a, balance: Math.max(0, a.balance + pnlIDR), equity: Math.max(0, a.equity + pnlIDR) }
              : a
          )
          newStreak = gachaRes.streak
          latestGacha = gachaRes
          closedAny = true
        }

        set({
          currentBarIndex: nextIdx,
          trades: updatedTrades,
          accounts: updatedAccounts,
          streak: newStreak,
          ...(closedAny ? { pendingGacha: latestGacha, replayRunning: false } : {}),
        })
      },

      // ===== GACHA JUMP: teleport to random bar, process all hits along the way =====
      gachaJump: (minBarsAhead = 10, maxBarsAhead = 100) => {
        const state = get()
        if (state.bars.length === 0) return

        const barsAhead = Math.floor(minBarsAhead + Math.random() * (maxBarsAhead - minBarsAhead))
        const targetIdx = Math.min(state.currentBarIndex + barsAhead, state.bars.length - 1)

        // Process each bar between current and target
        let updatedTrades = state.trades.map(t => ({ ...t }))
        let updatedAccounts = state.accounts.map(a => ({ ...a }))
        let newStreak = state.streak
        let latestGacha: GachaResult | null = null
        let closedAny = false
        let finalIdx = targetIdx

        for (let idx = state.currentBarIndex + 1; idx <= targetIdx; idx++) {
          const bar = state.bars[idx]
          const openTrades = updatedTrades.filter(
            t => t.status === 'OPEN' && t.accountId === state.activeAccountId
          )

          for (const trade of openTrades) {
            const hit = checkSLTP(trade.direction, bar, trade.stopLoss, trade.takeProfit)
            if (!hit) continue

            const exitPrice = getExitPrice(hit, trade.direction, trade.stopLoss, trade.takeProfit, bar.close)
            const account = updatedAccounts.find(a => a.id === trade.accountId)
            if (!account) continue

            try {
              const closeResult = computeClose(trade, exitPrice, hit, newStreak, account.balance, idx)
              updatedTrades = updatedTrades.map(t => t.id === trade.id ? closeResult.updatedTrade : t)
              updatedAccounts = updatedAccounts.map(a =>
                a.id === trade.accountId
                  ? { ...a, balance: Math.max(0, a.balance + closeResult.pnlIDR), equity: Math.max(0, a.equity + closeResult.pnlIDR) }
                  : a
              )
              newStreak = closeResult.gachaRes.streak
              latestGacha = closeResult.gachaRes
              closedAny = true
              finalIdx = idx // stop visual at the hit bar
            } catch { /* continue */ }
          }
          if (closedAny) break // Stop jumping after first hit
        }

        set({
          currentBarIndex: finalIdx,
          replayRunning: false,
          trades: updatedTrades,
          accounts: updatedAccounts,
          streak: newStreak,
          isReplayMode: true, // ensure replay mode is on
          ...(closedAny ? { pendingGacha: latestGacha } : {}),
        })
      },

      // ---- Drawing ----
      activeTool: null,
      drawings: [],
      setActiveTool: (tool) => set({ activeTool: tool }),
      addDrawing: (d) => set(s => ({ drawings: [...s.drawings, d] })),
      removeDrawing: (id) => set(s => ({ drawings: s.drawings.filter(d => d.id !== id) })),
      clearDrawings: () => set({ drawings: [] }),

      // ---- Gacha ----
      pendingGacha: null,
      streak: 0,
      setPendingGacha: (g) => set({ pendingGacha: g }),

      // ---- Order Form ----
      orderSide: 'BUY',
      orderType: 'MARKET',
      lotSize: 0.01,
      takeProfit: null,
      stopLoss: null,
      riskPercent: 1,
      setOrderSide: (s) => set({ orderSide: s }),
      setOrderType: (t) => set({ orderType: t }),
      setLotSize: (v) => set({ lotSize: v }),
      setTakeProfit: (v) => set({ takeProfit: v }),
      setStopLoss: (v) => set({ stopLoss: v }),
      setRiskPercent: (v) => set({ riskPercent: v }),
    }),

    {
      name: 'forexsim-v2',   // bump version to clear old broken state
      partialize: (state) => ({
        accounts: state.accounts,
        activeAccountId: state.activeAccountId,
        trades: state.trades,
        activeSymbol: state.activeSymbol,
        activeTimeframe: state.activeTimeframe,
        drawings: state.drawings,
        streak: state.streak,
        replaySpeed: state.replaySpeed,
      }),
    }
  )
)

// ============================================================
// SELECTORS
// ============================================================

export const useActiveAccount = () => {
  const accounts = useTradingStore(s => s.accounts)
  const activeAccountId = useTradingStore(s => s.activeAccountId)
  return accounts.find(a => a.id === activeAccountId) ?? null
}

export const useOpenTrades = (accountId?: string) => {
  const trades = useTradingStore(s => s.trades)
  const activeAccountId = useTradingStore(s => s.activeAccountId)
  const accId = accountId ?? activeAccountId
  return trades.filter(t => t.status === 'OPEN' && t.accountId === accId)
}

export const useClosedTrades = (accountId?: string) => {
  const trades = useTradingStore(s => s.trades)
  const activeAccountId = useTradingStore(s => s.activeAccountId)
  const accId = accountId ?? activeAccountId
  return trades.filter(t => t.status === 'CLOSED' && t.accountId === accId)
}
