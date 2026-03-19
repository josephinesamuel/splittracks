import { useMemo } from 'react'
import { useAppStore } from '../stores/appStore'
import { getMonthlyBreakdown } from '../utils/debtEngine'
import { CATEGORY_ICONS, CATEGORY_COLORS, Category } from '../types'

const MONTHS: Record<number, string> = {
  1:'Jan',2:'Feb',3:'Mar',4:'Apr',5:'May',6:'Jun',
  7:'Jul',8:'Aug',9:'Sep',10:'Oct',11:'Nov',12:'Dec'
}
const MONTHS_FULL: Record<number, string> = {
  1:'January',2:'February',3:'March',4:'April',5:'May',6:'June',
  7:'July',8:'August',9:'September',10:'October',11:'November',12:'December'
}

export default function Trends() {
  const { transactions, activePerson, setActivePerson, activeMonth, activeYear } = useAppStore()

  // Get all unique month/year combos from data
  const monthKeys = useMemo(() => {
    const seen = new Set<string>()
    transactions.forEach(tx => {
      const year = new Date(tx.date).getFullYear()
      seen.add(`${year}-${tx.month}`)
    })
    return [...seen]
      .sort((a, b) => b.localeCompare(a))
      .slice(0, 6)
      .reverse()
      .map(k => { const [y, m] = k.split('-'); return { year: parseInt(y), month: parseInt(m) } })
  }, [transactions])

  const breakdowns = useMemo(() =>
    monthKeys.map(({ month, year }) => getMonthlyBreakdown(transactions, month, year)),
    [transactions, monthKeys]
  )

  const currentBreakdown = useMemo(() =>
    getMonthlyBreakdown(transactions, activeMonth, activeYear),
    [transactions, activeMonth, activeYear]
  )

  const amounts = breakdowns.map(b =>
    activePerson === 'Kevin' ? b.projection_kevin : b.projection_josephine
  )
  const actuals = breakdowns.map(b =>
    activePerson === 'Kevin' ? b.total_kevin : b.total_josephine
  )
  const maxAmt = Math.max(...amounts, 1)

  const avg = actuals.length ? Math.round(actuals.reduce((a, b) => a + b, 0) / actuals.length) : 0
  const maxActual = Math.max(...actuals)
  const maxIdx = actuals.indexOf(maxActual)

  const catAmounts = activePerson === 'Kevin' ? currentBreakdown.kevin : currentBreakdown.josephine
  const sortedCats = Object.entries(catAmounts)
    .filter(([, v]) => (v || 0) > 0)
    .sort((a, b) => (b[1] || 0) - (a[1] || 0))
    .slice(0, 5) as [Category, number][]
  const maxCat = sortedCats[0]?.[1] || 1

  return (
    <div className="page">
      <div className="topbar">
        <span className="topbar-title">Trends</span>
      </div>

      <div className="person-toggle">
        <button className={`ptab${activePerson === 'Kevin' ? ' on' : ''}`} onClick={() => setActivePerson('Kevin')}>Kevin</button>
        <button className={`ptab${activePerson === 'Josephine' ? ' on' : ''}`} onClick={() => setActivePerson('Josephine')}>Josephine</button>
      </div>

      {/* Stat cards */}
      <div className="stat-grid" style={{ marginBottom: 12 }}>
        <div className="stat-card">
          <div className="stat-label">Monthly avg</div>
          <div className="stat-value">€{avg.toLocaleString()}</div>
          <div className="stat-proj">last {actuals.length} months</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Highest month</div>
          <div className="stat-value">€{Math.round(maxActual).toLocaleString()}</div>
          <div className="stat-proj">{monthKeys[maxIdx] ? MONTHS_FULL[monthKeys[maxIdx].month] : '—'}</div>
        </div>
      </div>

      {/* Bar chart */}
      <div className="card" style={{ margin: '0 16px 16px' }}>
        <div className="section-label" style={{ padding: 0, marginBottom: 16 }}>Monthly spend</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120 }}>
          {breakdowns.map((b, i) => {
            const actual = activePerson === 'Kevin' ? b.total_kevin : b.total_josephine
            const proj = activePerson === 'Kevin' ? b.projection_kevin : b.projection_josephine
            const actualH = Math.round((actual / maxAmt) * 100)
            const projH = Math.round((proj / maxAmt) * 100)
            const isCurrent = b.month === activeMonth && b.year === activeYear
            return (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
                <span style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}>€{Math.round(actual / 100) / 10}k</span>
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: `${projH}px` }}>
                  {proj > actual && (
                    <div style={{ width: '100%', height: projH - actualH, background: 'var(--color-text-primary)', opacity: 0.25, borderRadius: '4px 4px 0 0' }} />
                  )}
                  <div style={{ width: '100%', height: actualH, background: isCurrent ? '#378ADD' : 'var(--color-text-primary)', borderRadius: proj > actual ? 0 : '4px 4px 0 0' }} />
                </div>
                <span style={{ fontSize: 10, color: isCurrent ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)', fontWeight: isCurrent ? 500 : 400 }}>
                  {MONTHS[b.month]}
                </span>
              </div>
            )
          })}
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--color-text-secondary)' }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--color-text-primary)' }} /> Actual
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--color-text-secondary)' }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--color-text-primary)', opacity: 0.25 }} /> Projected
          </div>
        </div>
      </div>

      {/* Top categories */}
      <div className="section-label">Top categories · {MONTHS_FULL[activeMonth]}</div>
      <div className="card" style={{ margin: '0 16px', padding: '8px 14px' }}>
        {sortedCats.length === 0 ? (
          <div style={{ padding: '16px 0', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 14 }}>No data</div>
        ) : sortedCats.map(([cat, val]) => (
          <div key={cat} className="cat-row" style={{ padding: '10px 0', border: 'none', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
            <div className="cat-icon" style={{ background: (CATEGORY_COLORS[cat] || '#888') + '22', width: 28, height: 28, borderRadius: 7, fontSize: 12 }}>
              {CATEGORY_ICONS[cat] || '📦'}
            </div>
            <div className="cat-info">
              <div style={{ fontSize: 13, color: 'var(--color-text-primary)', marginBottom: 3 }}>{cat}</div>
              <div className="cat-bar-wrap">
                <div className="cat-bar" style={{ width: `${Math.round(val / maxCat * 100)}%`, background: CATEGORY_COLORS[cat] || '#888' }} />
              </div>
            </div>
            <div className="cat-amount">€{Math.round(val)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
