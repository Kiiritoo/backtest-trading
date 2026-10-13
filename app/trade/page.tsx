'use client'

import dynamic from 'next/dynamic'

// Chart must be client-only (uses window)
const TradingTerminal = dynamic(() => import('@/components/trading/TradingTerminal'), {
  ssr: false,
  loading: () => (
    <div style={{
      height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-primary)', flexDirection: 'column', gap: '16px',
    }}>
      <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid var(--border-subtle)', borderTopColor: 'var(--accent-blue)', animation: 'spin 0.8s linear infinite' }} />
      <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Loading terminal...</span>
    </div>
  ),
})

export default function TradePage() {
  return <TradingTerminal />
}
