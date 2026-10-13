'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store/auth-store'
import { useTradingStore } from '@/lib/store/trading-store'

export default function RegisterPage() {
  const router = useRouter()
  const register = useAuthStore(s => s.register)
  const addAccount = useTradingStore(s => s.addAccount)

  const [form, setForm] = useState({ username: '', email: '', password: '', confirmPassword: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function update(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (form.password !== form.confirmPassword) {
      setError('Password tidak cocok')
      return
    }

    setLoading(true)
    // Small delay for UX
    await new Promise(r => setTimeout(r, 400))

    const result = register(form.username, form.email, form.password)

    if (!result.ok) {
      setError(result.error ?? 'Terjadi kesalahan')
      setLoading(false)
      return
    }

    // Auto-create first porto account
    addAccount({
      name: 'Porto 1',
      currency: 'IDR',
      balance: 1_000_000,
      initialBalance: 1_000_000,
      leverage: 100,
      isActive: true,
    })

    router.push('/dashboard')
  }

  return (
    <div className="auth-root">
      <div className="auth-bg" />
      <div className="auth-card">
        <div style={{ marginBottom: '28px' }}>
          <a href="/" className="logo" style={{ marginBottom: '24px', display: 'flex' }}>
            <div className="logo-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M3 17l4-8 4 4 4-6 4 10" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="logo-text">ForexSim</span>
          </a>
          <h1 className="auth-title">Buat Akun ForexSim</h1>
          <p className="auth-sub">Gratis selamanya · Data tersimpan lokal di browser kamu</p>
        </div>

        <form onSubmit={handleRegister}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              id="register-username"
              className="input"
              placeholder="trader_keren"
              value={form.username}
              onChange={e => update('username', e.target.value)}
              required minLength={3} autoFocus
            />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              id="register-email"
              type="email"
              className="input"
              placeholder="email@kamu.com"
              value={form.email}
              onChange={e => update('email', e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              id="register-password"
              type="password"
              className="input"
              placeholder="Min. 6 karakter"
              value={form.password}
              onChange={e => update('password', e.target.value)}
              required minLength={6}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Konfirmasi Password</label>
            <input
              id="register-confirm-password"
              type="password"
              className="input"
              placeholder="Ulangi password"
              value={form.confirmPassword}
              onChange={e => update('confirmPassword', e.target.value)}
              required
            />
          </div>

          {error && (
            <div style={{
              padding: '10px 14px', borderRadius: '8px', marginBottom: '14px',
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              color: '#f87171', fontSize: '13px',
            }}>
              ⚠️ {error}
            </div>
          )}

          <button
            id="register-submit-btn"
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', padding: '13px', marginBottom: '10px', fontSize: '14px' }}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                <div style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                Membuat akun...
              </span>
            ) : '🚀 Buat Akun & Mulai Trading'}
          </button>

          <button
            id="register-demo-btn"
            type="button"
            className="btn btn-ghost"
            onClick={() => router.push('/dashboard')}
            style={{ width: '100%', padding: '11px', fontSize: '13px' }}
          >
            🎮 Langsung Coba (Tanpa Akun)
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '13px', color: 'var(--text-secondary)' }}>
          Sudah punya akun?{' '}
          <Link href="/login" style={{ color: 'var(--accent-blue)', fontWeight: 600, textDecoration: 'none' }}>
            Masuk
          </Link>
        </div>

        <div style={{
          marginTop: '20px', padding: '10px 14px', borderRadius: '8px',
          background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)',
          fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center',
        }}>
          🔒 Data kamu tersimpan 100% di browser · Tidak ada server yang menyimpan data kamu
        </div>
      </div>
    </div>
  )
}
