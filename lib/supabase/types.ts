// Supabase types - will be generated from DB schema
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          created_at: string
          username: string
          email: string
          avatar_url: string | null
          total_trades: number
          win_rate: number
          best_streak: number
          current_streak: number
          total_pnl: number
        }
        Insert: {
          id: string
          username: string
          email: string
          avatar_url?: string | null
        }
        Update: Partial<Database['public']['Tables']['profiles']['Row']>
      }
      accounts: {
        Row: {
          id: string
          user_id: string
          created_at: string
          name: string
          currency: 'IDR' | 'USD' | 'EUR'
          balance: number
          equity: number
          initial_balance: number
          leverage: number
          is_active: boolean
        }
        Insert: {
          user_id: string
          name: string
          currency: 'IDR' | 'USD' | 'EUR'
          balance: number
          initial_balance: number
          leverage: number
        }
        Update: Partial<Database['public']['Tables']['accounts']['Row']>
      }
      trades: {
        Row: {
          id: string
          account_id: string
          created_at: string
          closed_at: string | null
          symbol: string
          direction: 'BUY' | 'SELL'
          lot_size: number
          entry_price: number
          exit_price: number | null
          take_profit: number | null
          stop_loss: number | null
          pnl: number | null
          pnl_currency: number | null
          status: 'OPEN' | 'CLOSED' | 'PENDING'
          close_reason: 'TP' | 'SL' | 'MANUAL' | null
          timeframe: string
          gacha_reward: Json | null
        }
        Insert: {
          account_id: string
          symbol: string
          direction: 'BUY' | 'SELL'
          lot_size: number
          entry_price: number
          take_profit?: number | null
          stop_loss?: number | null
          timeframe: string
          status?: 'OPEN' | 'CLOSED' | 'PENDING'
        }
        Update: Partial<Database['public']['Tables']['trades']['Row']>
      }
      gacha_inventory: {
        Row: {
          id: string
          user_id: string
          created_at: string
          card_id: string
          rarity: 'common' | 'rare' | 'epic' | 'legendary'
          is_active: boolean
          expires_at: string | null
        }
        Insert: {
          user_id: string
          card_id: string
          rarity: 'common' | 'rare' | 'epic' | 'legendary'
        }
        Update: Partial<Database['public']['Tables']['gacha_inventory']['Row']>
      }
    }
  }
}
