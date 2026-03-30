import { useMemo } from 'react'
import { useAppStore } from '../stores/appStore'
import { calculateDebt, getMonthlyBreakdown } from '../utils/debtEngine'
import { CATEGORY_ICONS, CATEGORY_COLORS, FIXED_CATEGORIES, Category } from '../types'

export default function Dashboard() {
  const {
    transactions,
    activePerson,
    setActivePerson,
    activeMonth,
    activeYear,
    setActiveMonth,
  } = useAppStore()

  const months = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December',
  ]

  // Debt = ALL TIME across all transactions (not filtered by month)
  const debt = useMemo(() => calculateDebt(transactions), [transactions])

  // Monthly breakdown = only the selected month (for category display + projections)
  const breakdown = useMemo(
    () => getMonthlyBreakdown(transactions, activeMonth, activeYear),
    [transactions, activeMonth, activeYear]
  )

  // Active person's data for this month
  const personCats = activePerson === 'Kevin' ? breakdown.kevin : breakdown.josephine
  const personTotal = activePerson === 'Kevin' ? breakdown.total_kevin : breakdown.total_josephine
  const personProj = activePerson === 'Kevin' ? breakdown.projection_kevin : breakdown.projection_josephine

  // How much the active person physically paid out this month
  const personPaid = useMemo(() => {
    return transactions
      .filter(
        tx =>
          tx.type === 'Expense' &&
          tx.paid_by === activePerson &&
          tx.month === activeMonth &&
          new Date(tx.date).getFullYear() === activeYear
      )
      .reduce((s, tx) => s + tx.amount, 0)
  }, [transactions, activePerson, activeMonth, activeYear])

  // Debt display — always shows the same net regardless of active person
  // but the label adjusts to be relevant to whoever is viewing
  const netAbs = Math.abs(debt.net)
  const isSettled = netAbs < 0.01

  // Debt direction label — same truth for both, just context changes
  const oweText = isSettled
    ? 'All settled up'
    : debt.net > 0
    ? 'Josephine owes Kevin'
    : 'Kevin owes Josephine'

  const changeMonth = (dir: number) => {
    let m = activeMonth + dir
    let y = activeYear
    if (m < 1) { m = 12; y-- }
    if (m > 12) { m = 1; y++ }
    setActiveMonth(m, y)
  }

  const sortedCats = Object.entries(personCats)
    .filter(([, v]) => (v || 0) > 0)
    .sort((a, b) => (b[1] || 0) - (a[1] || 0)) as [Category, number][]

  const maxCat = sortedCats[0]?.[1] || 1

  return (
    <div className="page">

      {/* Topbar */}
      <div className="topbar">
        <span className="topbar-title">SplitTrack</span>
        <div className="month-switcher">
          <button className="month-btn" onClick={() => changeMonth(-1)}>‹</button>
          <span className="month-label">{months[activeMonth - 1]} {activeYear}</span>
          <button className="month-btn" onClick={() => changeMonth(1)}>›</button>
        </div>
      </div>

      {/* Person toggle */}
      <div className="person-toggle">
        <button
          className={`ptab${activePerson === 'Kevin' ? ' on' : ''}`}
          onClick={() => setActivePerson('Kevin')}
        >
          Kevin
        </button>
        <button
          className={`ptab${activePerson === 'Josephine' ? ' on' : ''}`}
          onClick={() => setActivePerson('Josephine')}
        >
          Josephine
        </button>
      </div>

      {/* Debt card — all-time running balance */}
      <div className="card" style={{ margin: '0 16px 12px' }}>
        <div className="section-label" style={{ padding: 0, marginBottom: 8 }}>
          Current balance (all time)
        </div>
        <div style={{ fontSize: 38, fontWeight: 500, letterSpacing: -1.5, color: 'var(--color-text-primary)' }}>
          €{netAbs.toFixed(2)}
        </div>
        <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 2 }}>
          {oweText}
        </div>
        <div className={`debt-badge${isSettled ? ' ok' : ' owe'}`} style={{ marginTop: 12 }}>
          {isSettled ? 'All settled up' : 'Net debt outstanding'}
        </div>
      </div>

      {/* Monthly stat cards */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">{activePerson}'s spend</div>
          <div className="stat-value">€{Math.round(personTotal).toLocaleString()}</div>
          <div className="stat-proj">proj. €{Math.round(personProj).toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Bills paid out</div>
          <div className="stat-value">€{Math.round(personPaid).toLocaleString()}</div>
          <div className="stat-proj">this month</div>
        </div>
      </div>

      {/* Category breakdown */}
      <div className="section-label" style={{ marginTop: 4 }}>
        {activePerson}'s breakdown · {months[activeMonth - 1]}
      </div>
      <div className="card" style={{ margin: '0 16px', padding: 0, overflow: 'hidden' }}>
        {sortedCats.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 14 }}>
            No expenses this month
          </div>
        ) : (
          sortedCats.map(([cat, val]) => {
            const pct = Math.round((val / maxCat) * 100)
            const color = CATEGORY_COLORS[cat] || '#888'
            const isFixed = (FIXED_CATEGORIES as string[]).includes(cat)
            return (
              <div key={cat} className="cat-row">
                <div className="cat-icon" style={{ background: color + '22' }}>
                  {CATEGORY_ICONS[cat] || '📦'}
                </div>
                <div className="cat-info">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 13, color: 'var(--color-text-primary)' }}>{cat}</span>
                    {isFixed && (
                      <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>fixed</span>
                    )}
                  </div>
                  <div className="cat-bar-wrap">
                    <div className="cat-bar" style={{ width: `${pct}%`, background: color }} />
                  </div>
                </div>
                <div className="cat-amount">€{Math.round(val).toLocaleString()}</div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
