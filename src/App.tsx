import { useState, useEffect } from 'react'
import { useAppStore } from './stores/appStore'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import Trends from './pages/Trends'
import AddExpense from './pages/AddExpense'
import BulkImport from './pages/BulkImport'
import './index.css'

type Page = 'dashboard' | 'transactions' | 'trends' | 'profile'
type Modal = 'add' | 'import' | null

export default function App() {
  const [page, setPage] = useState<Page>('dashboard')
  const [modal, setModal] = useState<Modal>(null)
  const { loadTransactions, loading, error } = useAppStore()

  useEffect(() => { loadTransactions() }, [])

  if (modal === 'add') return <AddExpense onBack={() => setModal(null)} />
  if (modal === 'import') return <BulkImport onBack={() => setModal(null)} />

  return (
    <div className="shell">
      <div className="content">
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, color: 'var(--color-text-secondary)', fontSize: 14 }}>
            Loading transactions...
          </div>
        )}
        {error && (
          <div style={{ margin: 16, padding: 12, background: '#FCEBEB', borderRadius: 8, color: '#A32D2D', fontSize: 13 }}>
            Error loading data: {error}
          </div>
        )}
        {!loading && page === 'dashboard' && <Dashboard />}
        {!loading && page === 'transactions' && <Transactions />}
        {!loading && page === 'trends' && <Trends />}
        {!loading && page === 'profile' && (
          <div className="page">
            <div className="topbar"><span className="topbar-title">Profile</span></div>
            <div style={{ padding: '20px 16px' }}>
              <div className="card" style={{ marginBottom: 12 }}>
                <div style={{ fontWeight: 500, marginBottom: 4 }}>About SplitTrack</div>
                <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Personal expense tracker for Kevin & Josephine. Data stored in Google Sheets.</div>
              </div>
              <div className="card">
                <div style={{ fontWeight: 500, marginBottom: 8 }}>Quick actions</div>
                <div onClick={() => setModal('import')}
                  style={{ padding: '10px 0', fontSize: 14, color: 'var(--color-text-primary)', cursor: 'pointer', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
                  Import from bank screenshot
                </div>
                <div onClick={() => loadTransactions()}
                  style={{ padding: '10px 0', fontSize: 14, color: 'var(--color-text-primary)', cursor: 'pointer' }}>
                  Refresh data from Google Sheets
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* FAB */}
      <button className="fab" onClick={() => setModal('add')}>
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <path d="M11 4v14M4 11h14" stroke="white" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </button>

      {/* Bottom nav */}
      <nav className="bottom-nav">
        <button className={`nav-btn${page === 'dashboard' ? ' active' : ''}`} onClick={() => setPage('dashboard')}>
          <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
            <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
            <rect x="12" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
            <rect x="3" y="12" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
            <rect x="12" y="12" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
          </svg>
          <span className="nav-label">Dashboard</span>
        </button>
        <button className={`nav-btn${page === 'transactions' ? ' active' : ''}`} onClick={() => setPage('transactions')}>
          <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
            <path d="M4 6h14M4 11h14M4 16h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <span className="nav-label">Transactions</span>
        </button>
        <div style={{ width: 52 }} />
        <button className={`nav-btn${page === 'trends' ? ' active' : ''}`} onClick={() => setPage('trends')}>
          <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
            <path d="M4 16l4-5 4 3 4-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="nav-label">Trends</span>
        </button>
        <button className={`nav-btn${page === 'profile' ? ' active' : ''}`} onClick={() => setPage('profile')}>
          <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
            <circle cx="11" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M4 19c0-3.314 3.134-6 7-6s7 2.686 7 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <span className="nav-label">Profile</span>
        </button>
      </nav>
    </div>
  )
}
