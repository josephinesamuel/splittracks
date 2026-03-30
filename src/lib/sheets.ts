import { Transaction, TransactionType, PaidBy, SplitType, Category } from '../types'

const SHEET_ID = import.meta.env.VITE_SHEET_ID
const API_KEY = import.meta.env.VITE_SHEETS_API_KEY
const SHEET_NAME = 'Transactions'
const BASE_URL = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}`

// Row 1 = totals, Row 2 = headers, data starts at Row 3
const DATA_START_ROW = 3

/**
 * Robustly parse money values from Google Sheets.
 * Handles: "8.50", "€8.50", "1,234.56", empty strings.
 */
function parseMoney(value?: string): number {
  if (!value) return 0
  const cleaned = String(value).trim().replace(/[^0-9.-]/g, '')
  if (!cleaned) return 0
  const num = Number(cleaned)
  return Number.isFinite(num) ? num : 0
}

function rowToTransaction(row: string[], rowIndex: number): Transaction | null {
  if (!row[0] && !row[1]) return null
  try {
    const month = parseInt(row[0])
    const date = parseDate(row[1])
    const description = row[2] || ''
    const category = row[3] as Category
    const paid_by = row[4] as PaidBy
    const amount = parseMoney(row[5])
    const type = (row[6] || 'Expense') as TransactionType
    const split = row[7]?.toString().toLowerCase() === 'true'
    const expense_kevin = row[8] ? parseMoney(row[8]) : null
    const expense_josephine = row[9] ? parseMoney(row[9]) : null
    const notes = row[10] || null

    if (!date || !description || isNaN(amount)) return null

    // Infer split_type from stored values
    let split_type: SplitType = 'equal'
    if (split && expense_kevin != null && expense_josephine != null) {
      const expectedHalf = amount / 2
      if (Math.abs(expense_kevin - expectedHalf) > 0.01) {
        split_type = 'fixed'
      }
    }

    return {
      id: `row-${rowIndex}`,
      row_index: rowIndex,
      month,
      date,
      description,
      category,
      paid_by,
      amount,
      type,
      split,
      split_type,
      expense_kevin,
      expense_josephine,
      notes,
    }
  } catch {
    return null
  }
}

function parseDate(val: string): string {
  if (!val) return ''
  const trimmed = val.trim()
  // Handle Excel serial date numbers
  if (/^\d+$/.test(trimmed)) {
    const serial = parseInt(trimmed)
    const date = new Date((serial - 25569) * 86400 * 1000)
    return date.toISOString().split('T')[0]
  }
  // Handle DD/MM/YYYY format (European, as used in the sheet)
  const ddmmyyyy = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (ddmmyyyy) {
    return `${ddmmyyyy[3]}-${ddmmyyyy[2].padStart(2, '0')}-${ddmmyyyy[1].padStart(2, '0')}`
  }
  try {
    const d = new Date(trimmed)
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
  } catch {}
  return trimmed
}

function transactionToRow(tx: Omit<Transaction, 'id' | 'row_index'>): string[] {
  return [
    String(tx.month),
    tx.date,
    tx.description,
    tx.category,
    tx.paid_by,
    String(tx.amount),
    tx.type,
    String(tx.split),
    tx.expense_kevin != null ? String(tx.expense_kevin) : '',
    tx.expense_josephine != null ? String(tx.expense_josephine) : '',
    tx.notes || '',
    '', // Cash? column — always empty
  ]
}

export async function fetchTransactions(): Promise<Transaction[]> {
  const range = `${SHEET_NAME}!A3:L`
  const url = `${BASE_URL}/values/${encodeURIComponent(range)}?key=${API_KEY}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Sheets API error: ${res.status} ${res.statusText}`)
  const data = await res.json()
  const rows: string[][] = data.values || []
  return rows
    .map((row, i) => rowToTransaction(row, DATA_START_ROW + i))
    .filter((tx): tx is Transaction => tx !== null)
}

export async function appendTransaction(
  tx: Omit<Transaction, 'id' | 'row_index'>
): Promise<void> {
  const range = `${SHEET_NAME}!A:L`
  const url = `${BASE_URL}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&key=${API_KEY}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ values: [transactionToRow(tx)] }),
  })
  if (!res.ok) throw new Error(`Sheets append error: ${res.status}`)
}

export async function appendTransactions(
  txs: Omit<Transaction, 'id' | 'row_index'>[]
): Promise<void> {
  const range = `${SHEET_NAME}!A:L`
  const url = `${BASE_URL}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&key=${API_KEY}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ values: txs.map(transactionToRow) }),
  })
  if (!res.ok) throw new Error(`Sheets append error: ${res.status}`)
}
