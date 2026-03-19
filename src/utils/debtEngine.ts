import { Transaction, DebtSummary, MonthlyBreakdown, FIXED_CATEGORIES } from '../types'

export function calculateDebt(transactions: Transaction[]): DebtSummary {
  let expense_kevin = 0
  let expense_josephine = 0
  let paid_kevin = 0
  let paid_josephine = 0
  let hutang_dibayar_kevin = 0
  let hutang_dibayar_josephine = 0

  for (const tx of transactions) {
    if (tx.type === 'Expense') {
      if (tx.expense_kevin != null) expense_kevin += tx.expense_kevin
      if (tx.expense_josephine != null) expense_josephine += tx.expense_josephine
      // Track who paid out
      if (tx.paid_by === 'Kevin') paid_kevin += tx.amount
      else if (tx.paid_by === 'Josephine') paid_josephine += tx.amount
    } else if (tx.type === 'Bayar hutang') {
      // Debt payments reduce balance directly — not counted as expense
      if (tx.paid_by === 'Josephine') hutang_dibayar_josephine += tx.amount
      else if (tx.paid_by === 'Kevin') hutang_dibayar_kevin += tx.amount
    }
    // Income type: ignore for debt calculation
  }

  // net > 0 = Josephine owes Kevin, net < 0 = Kevin owes Josephine
  // Kevin overpaid by (paid_kevin - expense_kevin), Josephine underpaid by (expense_josephine - paid_josephine)
  const net = (paid_kevin - expense_kevin) - (paid_josephine - expense_josephine) - hutang_dibayar_josephine + hutang_dibayar_kevin

  return {
    expense_kevin: round2(expense_kevin),
    expense_josephine: round2(expense_josephine),
    paid_kevin: round2(paid_kevin),
    paid_josephine: round2(paid_josephine),
    hutang_lama: 0, // carried over from previous period, set separately
    hutang_dibayar: round2(hutang_dibayar_josephine + hutang_dibayar_kevin),
    net: round2(net),
  }
}

export function getMonthlyBreakdown(
  transactions: Transaction[],
  month: number,
  year: number
): MonthlyBreakdown {
  const monthTx = transactions.filter(
    tx => tx.month === month && tx.type === 'Expense' &&
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

  const total_kevin = Object.values(kevin).reduce(
    (a: number, b) => a + (b ?? 0),
    0
  )
  
  const total_josephine = Object.values(josephine).reduce(
    (a: number, b) => a + (b ?? 0),
    0
  )

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
    if ((FIXED_CATEGORIES as string[]).includes(cat)) {
      fixed += val
    } else {
      variable += val
    }
  }

  return fixed + (variable / daysElapsed) * daysInMonth
}

export function getPersonExpense(tx: Transaction, person: 'Kevin' | 'Josephine'): number {
  return person === 'Kevin'
    ? (tx.expense_kevin ?? 0)
    : (tx.expense_josephine ?? 0)
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
