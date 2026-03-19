import { Transaction, DebtSummary, MonthlyBreakdown, FIXED_CATEGORIES } from '../types'

/**
 * DEBT ENGINE — simplified, starts fresh from current month.
 *
 * Logic:
 * - Only counts Expense transactions
 * - No carried-over debt from previous months
 * - net = (paid_kevin - expense_kevin) - (paid_josephine - expense_josephine)
 * - net > 0  → Josephine owes Kevin
 * - net < 0  → Kevin owes Josephine
 *
 * Bayar hutang rows: counted separately — they reduce the net debt directly.
 */
export function calculateDebt(transactions: Transaction[]): DebtSummary {
  let expense_kevin = 0
  let expense_josephine = 0
  let paid_kevin = 0
  let paid_josephine = 0
  let bh_kevin = 0
  let bh_josephine = 0

  for (const tx of transactions) {
    if (tx.type === 'Expense') {
      if (tx.expense_kevin != null) expense_kevin += tx.expense_kevin
      if (tx.expense_josephine != null) expense_josephine += tx.expense_josephine
      if (tx.paid_by === 'Kevin') paid_kevin += tx.amount
      else if (tx.paid_by === 'Josephine') paid_josephine += tx.amount
    } else if (tx.type === 'Bayar hutang') {
      if (tx.paid_by === 'Kevin') bh_kevin += tx.amount
      else if (tx.paid_by === 'Josephine') bh_josephine += tx.amount
    }
    // Income: ignored
  }

  // Kevin credit = paid_kevin - expense_kevin
  // Positive = Kevin overpaid = Josephine owes Kevin
  // Note: kevin_credit and jo_credit always sum to ~0 (same debt, two perspectives)
  // So net = kevin_credit only — do NOT subtract jo_credit (that double-counts)
  const kevin_credit = paid_kevin - expense_kevin

  // Bayar hutang directly reduces the outstanding balance
  const net = round2(kevin_credit - bh_josephine + bh_kevin)

  return {
    expense_kevin: round2(expense_kevin),
    expense_josephine: round2(expense_josephine),
    paid_kevin: round2(paid_kevin),
    paid_josephine: round2(paid_josephine),
    hutang_lama: 0,
    hutang_dibayar: round2(bh_kevin + bh_josephine),
    net,
  }
}

/**
 * Per-category breakdown for a specific month/year.
 */
export function getMonthlyBreakdown(
  transactions: Transaction[],
  month: number,
  year: number
): MonthlyBreakdown {
  const monthTx = transactions.filter(
    tx =>
      tx.type === 'Expense' &&
      tx.month === month &&
      new Date(tx.date).getFullYear() === year
  )

  const kevin: Partial<Record<string, number>> = {}
  const josephine: Partial<Record<string, number>> = {}

  for (const tx of monthTx) {
    if (tx.expense_kevin != null && tx.expense_kevin > 0) {
      kevin[tx.category] = (kevin[tx.category] || 0) + tx.expense_kevin
    }
    if (tx.expense_josephine != null && tx.expense_josephine > 0) {
      josephine[tx.category] = (josephine[tx.category] || 0) + tx.expense_josephine
    }
  }

  const total_kevin = Object.values(kevin).reduce((a: number, b) => a + (b ?? 0), 0)
  const total_josephine = Object.values(josephine).reduce((a: number, b) => a + (b ?? 0), 0)

  return {
    month,
    year,
    kevin,
    josephine,
    projection_kevin: round2(getMonthlyProjection(kevin, month, year)),
    projection_josephine: round2(getMonthlyProjection(josephine, month, year)),
    total_kevin: round2(total_kevin),
    total_josephine: round2(total_josephine),
  }
}

/**
 * Monthly projection — mirrors Excel formula:
 * Fixed (Accommodation, Gym, Insurance, Miscellaneous) → actual spend as-is
 * Variable → (spent / days_elapsed) * days_in_month
 */
export function getMonthlyProjection(
  cats: Partial<Record<string, number>>,
  month: number,
  year: number
): number {
  const today = new Date()
  const isCurrentMonth = today.getMonth() + 1 === month && today.getFullYear() === year
  const daysInMonth = new Date(year, month, 0).getDate()
  const daysElapsed = isCurrentMonth ? today.getDate() : daysInMonth

  let fixed = 0
  let variable = 0

  for (const [cat, val] of Object.entries(cats)) {
    if (!val) continue
    if ((FIXED_CATEGORIES as string[]).includes(cat)) fixed += val
    else variable += val
  }

  if (daysElapsed === 0) return fixed
  return fixed + (variable / daysElapsed) * daysInMonth
}

/** Get one person's expense share from a transaction */
export function getPersonExpense(tx: Transaction, person: 'Kevin' | 'Josephine'): number {
  return person === 'Kevin' ? (tx.expense_kevin ?? 0) : (tx.expense_josephine ?? 0)
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
