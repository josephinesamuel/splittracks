import { Transaction, DebtSummary, MonthlyBreakdown, FIXED_CATEGORIES } from '../types'

/**
 * DEBT ENGINE — mirrors Excel "Tabel hutang" formula exactly.
 *
 * Excel formula (Dashboard rows 17-22):
 *   exp_k   = SUMIFS(expense_kevin, type, "<>Bayar hutang")  [from debt start date]
 *   exp_j   = SUMIFS(expense_jo, type, "<>Bayar hutang")
 *   paid_k  = SUMIFS(amount, paid_by="Kevin", type="Expense")
 *   paid_j  = SUMIFS(amount, paid_by="Josephine", type="Expense")
 *   bh_k    = SUMIFS(amount, paid_by="Kevin", type="Bayar hutang")
 *   bh_j    = SUMIFS(amount, paid_by="Josephine", type="Bayar hutang")
 *
 *   sisa_kevin = MAX(0, exp_k - paid_k + hutang_lama_k - bh_k + bh_j)
 *   sisa_jo    = MAX(0, exp_j - paid_j - hutang_lama_k - bh_j + bh_k)
 *   net = sisa_jo - sisa_kevin
 *     positive → Josephine owes Kevin
 *     negative → Kevin owes Josephine
 *
 * DEBT_START_DATE: Excel starts from 18 Nov 2025 (row 82 of Transactions sheet).
 * All transactions before this are considered settled history.
 * HUTANG_LAMA_KEVIN = €120 carried-over from before the start date (hardcoded in Excel).
 */

const DEBT_START_DATE = '2025-11-18'
const HUTANG_LAMA_KEVIN = 120.0

function isInDebtPeriod(tx: Transaction): boolean {
  return tx.date >= DEBT_START_DATE
}

export function calculateDebt(transactions: Transaction[]): DebtSummary {
  const debtTxs = transactions.filter(isInDebtPeriod)

  let expense_kevin = 0
  let expense_josephine = 0
  let paid_kevin = 0
  let paid_josephine = 0
  let bh_kevin = 0
  let bh_josephine = 0

  for (const tx of debtTxs) {
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

  // Excel formula:
  const sisa_kevin = Math.max(0, expense_kevin - paid_kevin + HUTANG_LAMA_KEVIN - bh_kevin + bh_josephine)
  const sisa_josephine = Math.max(0, expense_josephine - paid_josephine - HUTANG_LAMA_KEVIN - bh_josephine + bh_kevin)

  // net > 0 = Josephine owes Kevin, net < 0 = Kevin owes Josephine
  const net = round2(sisa_josephine - sisa_kevin)

  return {
    expense_kevin: round2(expense_kevin),
    expense_josephine: round2(expense_josephine),
    paid_kevin: round2(paid_kevin),
    paid_josephine: round2(paid_josephine),
    hutang_lama: HUTANG_LAMA_KEVIN,
    hutang_dibayar: round2(bh_kevin + bh_josephine),
    net,
  }
}

/**
 * Per-category breakdown for a specific month/year.
 * Used by dashboard category list and trends page.
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
