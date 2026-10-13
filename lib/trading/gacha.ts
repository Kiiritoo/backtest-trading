export type GachaRarity = 'common' | 'rare' | 'epic' | 'legendary'

export interface GachaCard {
  id: string
  name: string
  icon: string
  rarity: GachaRarity
  description: string
  effect: string
  effectValue: number
  type: 'balance_bonus' | 'multiplier' | 'insight' | 'protection' | 'streak_bonus' | 'risk_reducer'
}

// Card pool
export const GACHA_CARDS: GachaCard[] = [
  // === COMMON ===
  {
    id: 'small_bonus',
    name: 'Lucky Coin',
    icon: '🪙',
    rarity: 'common',
    description: 'Keberuntungan kecil dari pasar. Kamu dapat bonus tambahan.',
    effect: '+Rp 50.000 ke Balance',
    effectValue: 50000,
    type: 'balance_bonus',
  },
  {
    id: 'market_tip',
    name: 'Market Whisper',
    icon: '📰',
    rarity: 'common',
    description: 'Kamu mendapat insight dasar tentang kondisi pasar saat ini.',
    effect: 'Insight: Volatilitas rendah terdeteksi',
    effectValue: 0,
    type: 'insight',
  },
  {
    id: 'fee_refund',
    name: 'Fee Cashback',
    icon: '💰',
    rarity: 'common',
    description: 'Spread dari trade terakhirmu dikembalikan.',
    effect: 'Spread refund x1',
    effectValue: 1,
    type: 'balance_bonus',
  },
  {
    id: 'small_protection',
    name: 'Safety Net',
    icon: '🛡️',
    rarity: 'common',
    description: 'Loss berikutnya dikurangi sedikit.',
    effect: 'Loss -10% untuk 1 trade',
    effectValue: 0.10,
    type: 'protection',
  },

  // === RARE ===
  {
    id: 'profit_boost',
    name: 'Bull Surge',
    icon: '🐂',
    rarity: 'rare',
    description: 'Profit dari trade berikutnya ditingkatkan!',
    effect: 'Profit x1.5 untuk 1 trade',
    effectValue: 1.5,
    type: 'multiplier',
  },
  {
    id: 'medium_bonus',
    name: 'Gold Rush',
    icon: '⭐',
    rarity: 'rare',
    description: 'Pasar memberimu hadiah ekstra!',
    effect: '+Rp 250.000 ke Balance',
    effectValue: 250000,
    type: 'balance_bonus',
  },
  {
    id: 'risk_reduction',
    name: 'Risk Shield',
    icon: '🔮',
    rarity: 'rare',
    description: 'Margin required berkurang untuk trade berikutnya.',
    effect: 'Margin -25% untuk 3 trade',
    effectValue: 0.25,
    type: 'risk_reducer',
  },
  {
    id: 'analyst_note',
    name: 'Analyst Insight',
    icon: '🔍',
    rarity: 'rare',
    description: 'Kamu mendapat analisa profesional tentang pair ini.',
    effect: 'Tampilkan level support & resistance',
    effectValue: 1,
    type: 'insight',
  },

  // === EPIC ===
  {
    id: 'double_profit',
    name: 'Market Dominator',
    icon: '👑',
    rarity: 'epic',
    description: 'Kamu dominasi market! Profit berlipat ganda.',
    effect: 'Profit x2 untuk 2 trade',
    effectValue: 2,
    type: 'multiplier',
  },
  {
    id: 'big_bonus',
    name: 'Epic Windfall',
    icon: '💎',
    rarity: 'epic',
    description: 'Rejeki nomplok dari pasar! Bonus besar untukmu.',
    effect: '+Rp 1.000.000 ke Balance',
    effectValue: 1000000,
    type: 'balance_bonus',
  },
  {
    id: 'loss_immunity',
    name: 'Teflon Trade',
    icon: '🧲',
    rarity: 'epic',
    description: 'Trade berikutnya dilindungi dari loss maksimal.',
    effect: 'Max loss -50% untuk 1 trade',
    effectValue: 0.5,
    type: 'protection',
  },
  {
    id: 'streak_starter',
    name: 'Momentum Builder',
    icon: '🔥',
    rarity: 'epic',
    description: 'Streak bonusmu dipercepat!',
    effect: 'Streak count +3',
    effectValue: 3,
    type: 'streak_bonus',
  },

  // === LEGENDARY ===
  {
    id: 'god_mode',
    name: '⚡ Market Oracle',
    icon: '🌟',
    rarity: 'legendary',
    description: 'Kamu menjadi Oracle pasar. Profit seluruh session berlipat!',
    effect: 'Semua profit x3 untuk 5 trade',
    effectValue: 3,
    type: 'multiplier',
  },
  {
    id: 'mega_bonus',
    name: '💫 Legendary Jackpot',
    icon: '🎰',
    rarity: 'legendary',
    description: 'JACKPOT! Bonus balance terbesar yang bisa kamu dapat!',
    effect: '+Rp 5.000.000 ke Balance',
    effectValue: 5000000,
    type: 'balance_bonus',
  },
  {
    id: 'invincible',
    name: '🛡️ Untouchable',
    icon: '⚡',
    rarity: 'legendary',
    description: 'Kamu tak terkalahkan. Trade berikutnya tidak bisa loss!',
    effect: 'Loss = 0 untuk 1 trade',
    effectValue: 0,
    type: 'protection',
  },
]

// Rarity weights (total = 1000)
const RARITY_WEIGHTS = {
  common: 550,    // 55%
  rare: 300,      // 30%
  epic: 120,      // 12%
  legendary: 30,  // 3%
}

// Streak bonuses affect legendary rate
function getWeightsForStreak(streak: number): typeof RARITY_WEIGHTS {
  if (streak >= 5) {
    return { common: 400, rare: 350, epic: 180, legendary: 70 }
  }
  if (streak >= 3) {
    return { common: 480, rare: 320, epic: 150, legendary: 50 }
  }
  return RARITY_WEIGHTS
}

export function rollGacha(
  tradeResult: 'profit' | 'loss',
  streak: number,
  balance: number
): GachaCard {
  const weights = getWeightsForStreak(streak)

  // Loss trades have worse odds (but still get something)
  const effectiveWeights = tradeResult === 'loss'
    ? {
        common: Math.min(700, weights.common + 100),
        rare: Math.max(200, weights.rare - 50),
        epic: Math.max(80, weights.epic - 30),
        legendary: Math.max(10, weights.legendary - 20),
      }
    : weights

  const total = Object.values(effectiveWeights).reduce((a, b) => a + b, 0)
  let roll = Math.floor(Math.random() * total)

  let rarity: GachaRarity = 'common'
  for (const [r, w] of Object.entries(effectiveWeights)) {
    roll -= w
    if (roll < 0) { rarity = r as GachaRarity; break }
  }

  // Pick a card of that rarity
  const pool = GACHA_CARDS.filter(c => c.rarity === rarity)
  const card = pool[Math.floor(Math.random() * pool.length)]
  return card
}

export function getStreakMessage(streak: number, isWin: boolean): string {
  if (!isWin) return ''
  if (streak >= 10) return '🌟 LEGENDARY STREAK! Kamu tak terkalahkan!'
  if (streak >= 7) return '🔥 EPIC STREAK! Terus pertahankan!'
  if (streak >= 5) return '⚡ SUPER HOT! 5 Wins beruntun!'
  if (streak >= 3) return '🎯 Hot Streak! 3 Wins berturut-turut!'
  if (streak === 2) return '✨ Double Win!'
  return ''
}

export interface GachaResult {
  card: GachaCard
  pnl: number
  pnlIDR: number
  tradeResult: 'profit' | 'loss'
  streak: number
  streakMessage: string
  bonusApplied: number  // bonus IDR applied to balance
}
