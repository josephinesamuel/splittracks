import { useMemo } from 'react'
import { useAppStore } from '../stores/appStore'
import { calculateDebt, getMonthlyProjection } from '../utils/debtEngine'
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

  // Filter by month number AND year extracted from date string
  // tx.month is the number from column A (reliable)
  // year is extracted from tx.date first 4 chars (reliable if date is ISO format)
  // Fallback: if date is missing/malformed, use tx.month only for current year
  // const monthTransactions = useMemo(() => {
  //   return transactions.filter(tx => {
  //     if (tx.month !== activeMonth) return false
  //     // Extract year from date string — handles "2026-03-01", "2026-03-01T00:00:00.000Z"
  //     const yearFromDate = tx.date ? parseInt(tx.date.substring(0, 4)) : activeYear
  //     return yearFromDate === activeYear
  //   })
  // }, [transactions, activeMonth, activeYear])
  const monthTransactions = useMemo(() => {
    const filtered = transactions.filter(tx => {
      if (tx.month !== activeMonth) return false
      const yearFromDate = tx.date ? parseInt(tx.date.substring(0, 4)) : activeYear
      return yearFromDate === activeYear
    })
  
    // ADD THESE:
    console.log('=== DASHBOARD DEBUG ===')
    console.log('activeMonth:', activeMonth, 'activeYear:', activeYear)
    console.log('total transactions:', transactions.length)
    console.log('filtered monthTransactions:', filtered.length)
    console.log('first tx sample:', transactions[0])
    console.log('first tx month:', transactions[0]?.month, 'type:', typeof transactions[0]?.month)
    console.log('first tx date:', transactions[0]?.date, 'type:', typeof transactions[0]?.date)
    console.log('=======================')
  
    return filtered
  }, [transactions, activeMonth, activeYear])

  // Debt from current month only
  const debt = useMemo(() => calculateDebt(monthTransactions), [monthTransactions])

  // Category breakdown built directly from monthTransactions
  const kevinCats = useMemo(() => {
    const cats: Record<string, number> = {}
    for (const tx of monthTransactions) {
      if (tx.type !== 'Expense') continue
      if (tx.expense_kevin != null && tx.expense_kevin > 0) {
        cats[tx.category] = (cats[tx.category] || 0) + tx.expense_kevin
      }
    }
    return cats
  }, [monthTransactions])

  const joCats = useMemo(() => {
    const cats: Record<string, number> = {}
    for (const tx of monthTransactions) {
      if (tx.type !== 'Expense') continue
      if (tx.expense_josephine != null && tx.expense_josephine > 0) {
        cats[tx.category] = (cats[tx.category] || 0) + tx.expense_josephine
      }
    }
    return cats
  }, [monthTransactions])

  const kevinTotal: number = useMemo(
    () => Object.values(kevinCats).reduce((a: number, b: number) => a + b, 0),
    [kevinCats]
  )

  const joTotal: number = useMemo(
    () => Object.values(joCats).reduce((a: number, b: number) => a + b, 0),
    [joCats]
  )

  const kevinProj: number = useMemo(
    () => getMonthlyProjection(kevinCats, activeMonth, activeYear),
    [kevinCats, activeMonth, activeYear]
  )

  const joProj: number = useMemo(
    () => getMonthlyProjection(joCats, activeMonth, activeYear),
    [joCats, activeMonth, activeYear]
  )

  const personPaid: number = useMemo(
    () => monthTransactions
      .filter(tx => tx.type === 'Expense' && tx.paid_by === activePerson)
      .reduce((s: number, tx) => s + tx.amount, 0),
    [monthTransactions, activePerson]
  )

  const personCats: Record<string, number> = activePerson === 'Kevin' ? kevinCats : joCats
  const personTotal: number = activePerson === 'Kevin' ? kevinTotal : joTotal
  const personProj: number = activePerson === 'Kevin' ? kevinProj : joProj

  const netAbs = Math.abs(debt.net)
  const isSettled = netAbs < 0.01
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

  const sortedCats = (Object.entries(personCats) as [Category, number][])
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])

  const maxCat = sortedCats[0]?.[1] || 1

  return (
    <div className="page">
      <div className="topbar">
        <span className="topbar-title">SplitTrack</span>
        <div className="month-switcher">
          <button className="month-btn" onClick={() => changeMonth(-1)}>‹</button>
          <span className="month-label">{months[activeMonth - 1]} {activeYear}</span>
          <button className="month-btn" onClick={() => changeMonth(1)}>›</button>
        </div>
      </div>

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

      <div className="card" style={{ margin: '0 16px 12px' }}>
        <div className="section-label" style={{ padding: 0, marginBottom: 8 }}>
          Current balance
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
            const color = CATEGORY_COLORS[cat as Category] || '#888'
            const isFixed = (FIXED_CATEGORIES as string[]).includes(cat)
            return (
              <div key={cat} className="cat-row">
                <div className="cat-icon" style={{ background: color + '22' }}>
                  {CATEGORY_ICONS[cat as Category] || '📦'}
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
