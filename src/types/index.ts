export type TransactionType = 'Expense' | 'Bayar hutang' | 'Income'
export type PaidBy = 'Kevin' | 'Josephine'
export type SplitType = 'equal' | 'percentage' | 'fixed'
export type Person = 'Kevin' | 'Josephine'

export type Category =
  | 'Accomodation'
  | 'Equipment'
  | 'Food'
  | 'Groceries'
  | 'Gym'
  | 'Insurance'
  | 'Miscelaneous'
  | 'Shopping'
  | 'Skincare'
  | 'Transport'
  | 'Utilities'

export const FIXED_CATEGORIES: Category[] = [
  'Accomodation', 'Gym', 'Insurance', 'Miscelaneous'
]

export const VARIABLE_CATEGORIES: Category[] = [
  'Equipment', 'Food', 'Groceries', 'Shopping',
  'Skincare', 'Transport', 'Utilities'
]

export const ALL_CATEGORIES: Category[] = [
  'Accomodation', 'Equipment', 'Food', 'Groceries', 'Gym',
  'Insurance', 'Miscelaneous', 'Shopping', 'Skincare', 'Transport', 'Utilities'
]

export const CATEGORY_ICONS: Record<Category, string> = {
  Accomodation: '🏠',
  Equipment: '💻',
  Food: '🍜',
  Groceries: '🛒',
  Gym: '💪',
  Insurance: '🛡️',
  Miscelaneous: '📦',
  Shopping: '🛍️',
  Skincare: '✨',
  Transport: '🚌',
  Utilities: '⚡',
}

export const CATEGORY_COLORS: Record<Category, string> = {
  Accomodation: '#5DCAA5',
  Equipment: '#378ADD',
  Food: '#EF9F27',
  Groceries: '#63991a',
  Gym: '#7F77DD',
  Insurance: '#D85A30',
  Miscelaneous: '#888780',
  Shopping: '#D4537E',
  Skincare: '#F09595',
  Transport: '#85B7EB',
  Utilities: '#FAC775',
}

export interface Transaction {
  id: string
  month: number
  date: string
  description: string
  category: Category
  paid_by: PaidBy
  amount: number
  type: TransactionType
  split: boolean
  split_type: SplitType
  expense_kevin: number | null
  expense_josephine: number | null
  notes: string | null
  row_index?: number // Google Sheets row index for updates
}

export interface DebtSummary {
  expense_kevin: number
  expense_josephine: number
  paid_kevin: number
  paid_josephine: number
  hutang_lama: number
  hutang_dibayar: number
  net: number // positive = Josephine owes Kevin, negative = Kevin owes Josephine
}

export interface MonthlyBreakdown {
  month: number
  year: number
  kevin: Partial<Record<Category, number>>
  josephine: Partial<Record<Category, number>>
  projection_kevin: number
  projection_josephine: number
  total_kevin: number
  total_josephine: number
}

export interface NewTransactionForm {
  amount: string
  description: string
  date: string
  category: Category | null
  paid_by: PaidBy
  type: TransactionType
  split: boolean
  split_type: SplitType
  kevin_pct: number
  josephine_pct: number
  kevin_fixed: string
  josephine_fixed: string
  notes: string
}
