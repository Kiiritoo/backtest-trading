import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface User {
  id: string
  username: string
  email: string
  passwordHash: string // simple hash for local auth
  createdAt: string
}

interface AuthStore {
  users: User[]
  currentUserId: string | null
  register: (username: string, email: string, password: string) => { ok: boolean; error?: string }
  login: (email: string, password: string) => { ok: boolean; error?: string }
  logout: () => void
  getCurrentUser: () => User | null
}

function simpleHash(str: string): string {
  // Very simple hash for local demo purposes (NOT for production)
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i)
  }
  return (hash >>> 0).toString(16)
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      users: [],
      currentUserId: null,

      register: (username, email, password) => {
        const { users } = get()
        if (!username || username.length < 3)
          return { ok: false, error: 'Username minimal 3 karakter' }
        if (!email.includes('@'))
          return { ok: false, error: 'Email tidak valid' }
        if (password.length < 6)
          return { ok: false, error: 'Password minimal 6 karakter' }
        if (users.find(u => u.email.toLowerCase() === email.toLowerCase()))
          return { ok: false, error: 'Email sudah terdaftar' }
        if (users.find(u => u.username.toLowerCase() === username.toLowerCase()))
          return { ok: false, error: 'Username sudah dipakai' }

        const newUser: User = {
          id: crypto.randomUUID(),
          username: username.trim(),
          email: email.toLowerCase().trim(),
          passwordHash: simpleHash(password),
          createdAt: new Date().toISOString(),
        }
        set(s => ({ users: [...s.users, newUser], currentUserId: newUser.id }))
        return { ok: true }
      },

      login: (email, password) => {
        const { users } = get()
        const user = users.find(u => u.email.toLowerCase() === email.toLowerCase())
        if (!user) return { ok: false, error: 'Email tidak ditemukan' }
        if (user.passwordHash !== simpleHash(password))
          return { ok: false, error: 'Password salah' }
        set({ currentUserId: user.id })
        return { ok: true }
      },

      logout: () => set({ currentUserId: null }),

      getCurrentUser: () => {
        const { users, currentUserId } = get()
        return users.find(u => u.id === currentUserId) ?? null
      },
    }),
    { name: 'forexsim-auth-v2' }
  )
)
