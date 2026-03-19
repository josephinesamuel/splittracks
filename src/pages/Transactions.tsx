import { useState, useMemo } from 'react'
import { useAppStore } from '../stores/appStore'
import { CATEGORY_ICONS, CATEGORY_COLORS, ALL_CATEGORIES, Category } from '../types'
import { getPersonExpense } from '../utils/debtEngine'

type ViewTab = 'mine' | 'paid'
type FilterKey = 'month' | 'cat' | 'type' | 'split'

const MONTHS: Record<number, string> = {
  1:'January',2:'February',3:'March',4:'April',5:'May',6:'June',
  7:'July',8:'August',9:'September',10:'October',11:'November',12:'December'
}

export default function Transactions() {
  const { transactions, activePerson, setActivePerson } = useAppStore()
  const [view, setView] = useState<ViewTab>('mine')
  const [search, setSearch] = useState('')
  const [openDrawer, setOpenDrawer] = useState<FilterKey | null>(null)
  const [pendingFilters, setPendingFilters] = useState<Record<FilterKey, Set<string>>>({
    month: new Set(), cat: new Set(), type: new Set(), split: new Set()
  })
  const [appliedFilters, setAppliedFilters] = useState<Record<FilterKey, Set<string>>>({
    month: new Set(), cat: new Set(), type: new Set(), split: new Set()
  })

  const availableMonths = useMemo(() => {
    const months = new Set(transactions.map(t => t.month))
    return [...months].sort((a, b) => b - a)
  }, [transactions])

  const filtered = useMemo(() => {
    return transactions.filter(tx => {
      if (search && !tx.description.toLowerCase().includes(search.toLowerCase()) &&
          !tx.category.toLowerCase().includes(search.toLowerCase())) return false
      if (appliedFilters.month.size && !appliedFilters.month.has(String(tx.month))) return false
      if (appliedFilters.cat.size && !appliedFilters.cat.has(tx.category)) return false
      if (appliedFilters.type.size && !appliedFilters.type.has(tx.type)) return false
      if (appliedFilters.split.size) {
        const wantSplit = appliedFilters.split.has('Split')
        const wantPersonal = appliedFilters.split.has('Personal')
        if (wantSplit && !wantPersonal && !tx.split) return false
        if (wantPersonal && !wantSplit && tx.split) return false
      }
      if (view === 'mine') {
        if (tx.type === 'Bayar hutang') return false
        return getPersonExpense(tx, activePerson) > 0
      } else {
        return tx.paid_by === activePerson && tx.type === 'Expense'
      }
    })
  }, [transactions, search, appliedFilters, view, activePerson])

  const totalAmt = filtered.reduce((s, tx) =>
    s + (view === 'mine' ? getPersonExpense(tx, activePerson) : tx.amount), 0)

  // Group by date
  const grouped = useMemo(() => {
    const groups: Record<string, typeof filtered> = {}
    filtered.forEach(tx => {
      if (!groups[tx.date]) groups[tx.date] = []
      groups[tx.date].push(tx)
    })
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a))
  }, [filtered])

  const formatDate = (d: string) => {
    const date = new Date(d)
    return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
  }

  const toggleDrawer = (key: FilterKey) => {
    if (openDrawer === key) { setOpenDrawer(null); return }
    setPendingFilters(f => ({ ...f, [key]: new Set(appliedFilters[key]) }))
    setOpenDrawer(key)
  }

  const togglePending = (key: FilterKey, val: string) => {
    setPendingFilters(f => {
      const s = new Set(f[key])
      if (s.has(val)) s.delete(val); else s.add(val)
      return { ...f, [key]: s }
    })
  }

  const applyFilter = (key: FilterKey) => {
    setAppliedFilters(f => ({ ...f, [key]: new Set(pendingFilters[key]) }))
    setOpenDrawer(null)
  }

  const clearFilter = (key: FilterKey) => {
    setPendingFilters(f => ({ ...f, [key]: new Set() }))
  }

  const hasFilter = (key: FilterKey) => appliedFilters[key].size > 0

  const drawerOpts: Record<FilterKey, { val: string; label: string }[]> = {
    month: availableMonths.map(m => ({ val: String(m), label: MONTHS[m] || `Month ${m}` })),
    cat: ALL_CATEGORIES.map(c => ({ val: c, label: `${CATEGORY_ICONS[c as Category] || ''} ${c}` })),
    type: ['Expense', 'Bayar hutang', 'Income'].map(t => ({ val: t, label: t })),
    split: ['Split', 'Personal'].map(s => ({ val: s, label: s })),
  }

  return (
    <div className="page">
      <div className="topbar">
        <span className="topbar-title">Transactions</span>
      </div>

      <div className="person-toggle">
        <button className={`ptab${activePerson === 'Kevin' ? ' on' : ''}`} onClick={() => setActivePerson('Kevin')}>Kevin</button>
        <button className={`ptab${activePerson === 'Josephine' ? ' on' : ''}`} onClick={() => setActivePerson('Josephine')}>Josephine</button>
      </div>

      <div className="view-tabs">
        <button className={`vtab${view === 'mine' ? ' on' : ''}`} onClick={() => setView('mine')}>My expenses</button>
        <button className={`vtab${view === 'paid' ? ' on' : ''}`} onClick={() => setView('paid')}>Bills I paid</button>
      </div>

      <div className="search-wrap">
        <svg className="search-icon" width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.2"/>
          <path d="M10 10l2.5 2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
        <input className="search-input" placeholder="Search transactions..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Filter chips */}
      <div className="filter-bar">
        {(['month', 'cat', 'type', 'split'] as FilterKey[]).map(key => (
          <div key={key} className={`fchip${hasFilter(key) ? ' on' : ''}`} onClick={() => toggleDrawer(key)}>
            {key === 'cat' ? 'Category' : key.charAt(0).toUpperCase() + key.slice(1)} <span style={{ fontSize: 9, opacity: 0.6 }}>▾</span>
          </div>
        ))}
      </div>

      {/* Filter drawers */}
      {(['month', 'cat', 'type', 'split'] as FilterKey[]).map(key => (
        openDrawer === key && (
          <div key={key} className="filter-drawer open">
            <div className="drawer-section">
              <div className="drawer-label">{key === 'cat' ? 'Category' : key.charAt(0).toUpperCase() + key.slice(1)}</div>
              <div className="drawer-chips">
                {drawerOpts[key].map(o => (
                  <div key={o.val} className={`dchip${pendingFilters[key].has(o.val) ? ' on' : ''}`} onClick={() => togglePending(key, o.val)}>
                    {o.label}
                  </div>
                ))}
              </div>
            </div>
            <div className="drawer-actions">
              <button className="drawer-clear" onClick={() => clearFilter(key)}>Clear</button>
              <button className="drawer-apply" onClick={() => applyFilter(key)}>Apply</button>
            </div>
          </div>
        )
      ))}

      {/* Summary strip */}
      <div className="summary-strip">
        <div><div className="sl">{view === 'mine' ? 'My share' : 'Paid out'}</div><div className="sv">€{totalAmt.toFixed(2)}</div></div>
        <div><div className="sl">Transactions</div><div className="sv">{filtered.length}</div></div>
        <div><div className="sl">Showing</div><div className="sv">{activePerson}</div></div>
      </div>

      {/* Transaction list */}
      {grouped.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--color-text-secondary)', fontSize: 14 }}>
          No transactions found
        </div>
      ) : (
        grouped.map(([date, txs]) => (
          <div key={date} className="day-group">
            <div className="day-label">{formatDate(date)}</div>
            {txs.map(tx => {
              const color = CATEGORY_COLORS[tx.category as Category] || '#888'
              const icon = CATEGORY_ICONS[tx.category as Category] || '📦'
              const myExp = getPersonExpense(tx, activePerson)
              const dispAmt = view === 'mine' ? myExp : tx.amount
              const isDebt = tx.type === 'Bayar hutang'
              return (
                <div key={tx.id} className="tx-card">
                  <div className="tx-ico" style={{ background: isDebt ? '#E6F1FB' : color + '22' }}>
                    {isDebt ? '💸' : icon}
                  </div>
                  <div className="tx-inf">
                    <div className="tx-desc">{tx.description}</div>
                    <div className="tx-meta">
                      <span className="tx-badge">{tx.category}</span>
                      {isDebt
                        ? <span className="split-tag debt">Debt payment</span>
                        : tx.split
                          ? <span className="split-tag shared">Split</span>
                          : <span className="split-tag mine">Personal</span>
                      }
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 2 }}>
                      {view === 'mine'
                        ? tx.split ? `paid by ${tx.paid_by}` : `${tx.paid_by} only`
                        : tx.split ? `other half owed back` : `personal expense`
                      }
                    </div>
                  </div>
                  <div className="tx-right">
                    <div className="tx-amt">€{dispAmt.toFixed(2)}</div>
                  </div>
                </div>
              )
            })}
          </div>
        ))
      )}
    </div>
  )
}
