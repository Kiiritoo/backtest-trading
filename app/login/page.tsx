'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store/auth-store'

export default function LoginPage() {
  const router = useRouter()
  const login = useAuthStore(s => s.login)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    await new Promise(r => setTimeout(r, 300))

    const result = login(email, password)
    if (!result.ok) {
      setError(result.error ?? 'Login gagal')
      setLoading(false)
      return
    }
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
          <h1 className="auth-title">Selamat datang kembali</h1>
          <p className="auth-sub">Masuk untuk melanjutkan sesi trading kamu</p>
        </div>

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              id="login-email"
              type="email"
              className="input"
              placeholder="email@kamu.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required autoFocus
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              id="login-password"
              type="password"
              className="input"
              placeholder="Password kamu"
              value={password}
              onChange={e => setPassword(e.target.value)}
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
            id="login-submit-btn"
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', padding: '13px', marginBottom: '10px', fontSize: '14px' }}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                <div style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                Masuk...
              </span>
            ) : '🔑 Masuk'}
          </button>

          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => router.push('/dashboard')}
            style={{ width: '100%', padding: '11px', fontSize: '13px' }}
            id="login-demo-btn"
          >
            🎮 Langsung Coba (Tanpa Login)
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '13px', color: 'var(--text-secondary)' }}>
          Belum punya akun?{' '}
          <Link href="/register" style={{ color: 'var(--accent-blue)', fontWeight: 600, textDecoration: 'none' }}>
            Daftar Gratis
          </Link>
        </div>
      </div>
    </div>
  )
}
