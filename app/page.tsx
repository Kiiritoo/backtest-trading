'use client'

import Link from 'next/link'

const features = [
  {
    icon: '📊',
    title: 'Chart Profesional',
    desc: 'Candlestick chart dengan 8 timeframe, drawing tools lengkap (line, trendline, fibonacci, text), dan analisa teknikal real-time.',
    color: 'linear-gradient(135deg, #3b82f6, #60a5fa)',
    accent: 'linear-gradient(90deg, #3b82f6, #60a5fa)',
  },
  {
    icon: '🎯',
    title: 'Backtest Replay',
    desc: 'Replay historical data bar-by-bar dengan kontrol kecepatan. Entry trade di titik mana pun dan lihat hasilnya secara real-time.',
    color: 'linear-gradient(135deg, #8b5cf6, #c4b5fd)',
    accent: 'linear-gradient(90deg, #8b5cf6, #c4b5fd)',
  },
  {
    icon: '🎰',
    title: 'Gacha Reward System',
    desc: 'Setiap trade menghasilkan reward! Dapat bonus balance, multiplier profit, atau kartu perlindungan legendaris. 4 tingkat rarity.',
    color: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
    accent: 'linear-gradient(90deg, #f59e0b, #fbbf24)',
  },
  {
    icon: '🏦',
    title: 'Multi Account',
    desc: 'Buat beberapa akun dengan setting berbeda: leverage 1:100 sampai 1:1000, IDR atau USD, untuk berbagai strategi.',
    color: 'linear-gradient(135deg, #10b981, #34d399)',
    accent: 'linear-gradient(90deg, #10b981, #34d399)',
  },
  {
    icon: '🧮',
    title: 'Risk Calculator',
    desc: 'Auto-hitung lot size dari risk percentage. Set 1% risk dan lot otomatis dihitung berdasarkan SL distance dan balance kamu.',
    color: 'linear-gradient(135deg, #ef4444, #f87171)',
    accent: 'linear-gradient(90deg, #ef4444, #f87171)',
  },
  {
    icon: '📈',
    title: 'Trade Journal',
    desc: 'Rekam semua trade dengan analytics lengkap: equity curve, win rate, best streak, average RR, dan breakdown per pair.',
    color: 'linear-gradient(135deg, #06b6d4, #22d3ee)',
    accent: 'linear-gradient(90deg, #06b6d4, #22d3ee)',
  },
]

const stats = [
  { value: '9+', label: 'Pair Tersedia' },
  { value: '8', label: 'Timeframe' },
  { value: '16', label: 'Gacha Cards' },
  { value: '∞', label: 'Akun Simulasi' },
]

export default function LandingPage() {
  return (
    <div className="landing-root">
      {/* Navbar */}
      <nav className="landing-nav">
        <a href="/" className="logo">
          <div className="logo-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M3 17l4-8 4 4 4-6 4 10" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="logo-text">ForexSim</span>
        </a>

        <div className="flex items-center gap-2">
          <Link href="/login" className="btn btn-ghost btn-sm">Masuk</Link>
          <Link href="/register" className="btn btn-primary btn-sm" id="nav-register-btn">Daftar Gratis</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero">
        <div className="hero-bg" />
        <div className="hero-content">
          <div className="hero-badge">
            <span>🎰</span>
            <span>Backtest + Gacha = Pengalaman Trading Unik</span>
          </div>

          <h1 className="hero-title">
            Latih Trading Forex<br />
            <span className="gradient-text">Tanpa Risiko Nyata</span>
          </h1>

          <p className="hero-sub">
            Platform backtesting forex profesional dengan sistem gacha yang gamify trading kamu.
            Replay historical data, entry trade real, dan dapatkan reward setiap kali close posisi.
          </p>

          <div className="hero-cta">
            <Link href="/register" className="btn-hero-primary" id="hero-start-btn">
              <span>🚀</span>
              Mulai Gratis Sekarang
            </Link>
            <Link href="/trade" className="btn-hero-secondary" id="hero-demo-btn">
              <span>👀</span>
              Lihat Demo
            </Link>
          </div>

          {/* Mini stats */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '40px',
            marginTop: '60px',
            paddingTop: '40px',
            borderTop: '1px solid var(--border-subtle)',
          }}>
            {stats.map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '28px', fontWeight: 900, fontFamily: 'JetBrains Mono, monospace' }}>{s.value}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="features-section">
        <h2 className="section-title">Semua yang Kamu Butuhkan</h2>
        <p className="section-sub">Platform trading simulator paling lengkap untuk belajar forex</p>
        <div className="features-grid">
          {features.map((f, i) => (
            <div
              key={i}
              className="feature-card"
              style={{ '--card-accent': f.accent } as React.CSSProperties}
            >
              <div className="feature-icon" style={{ background: f.color + '22' }}>
                <span style={{ fontSize: '28px' }}>{f.icon}</span>
              </div>
              <h3 className="feature-title">{f.title}</h3>
              <p className="feature-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section style={{ padding: '80px 48px', textAlign: 'center' }}>
        <div style={{
          background: 'radial-gradient(ellipse at center, rgba(59,130,246,0.08) 0%, transparent 70%)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '24px',
          padding: '60px',
          maxWidth: '700px',
          margin: '0 auto',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎰</div>
          <h2 className="section-title" style={{ marginBottom: '12px' }}>Ready to Trade?</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', fontSize: '15px', lineHeight: 1.7 }}>
            Daftar gratis, buat akun simulasi IDR, dan mulai backtest strategi kamu sekarang.
            Setiap trade = peluang dapat kartu legendaris!
          </p>
          <Link href="/register" className="btn-hero-primary" id="cta-register-btn">
            <span>⚡</span>
            Buat Akun Gratis
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        padding: '24px 48px',
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        color: 'var(--text-muted)',
        fontSize: '12px',
      }}>
        <span>© 2025 ForexSim. Simulasi trading untuk tujuan edukasi.</span>
        <span>Data tidak real-time. Bukan untuk trading nyata.</span>
      </footer>
    </div>
  )
}
