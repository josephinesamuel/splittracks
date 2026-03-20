import { Transaction, TransactionType, PaidBy, SplitType, Category } from '../types'

const SHEET_ID = import.meta.env.VITE_SHEET_ID
const API_KEY = import.meta.env.VITE_SHEETS_API_KEY
const SHEET_NAME = 'Transactions'
const BASE_URL = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}`
const DATA_START_ROW = 3

// Google Sheets API with UNFORMATTED_VALUE returns mixed types
type Cell = string | number | boolean | null | undefined

function toStr(v: Cell): string {
  if (v === null || v === undefined) return ''
  return String(v).trim()
}

function toNum(v: Cell): number {
  if (v === null || v === undefined || v === '') return 0
  if (typeof v === 'boolean') return 0
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0
  const cleaned = String(v).replace(/[^0-9.-]/g, '')
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : 0
}

function toBool(v: Cell): boolean {
  if (typeof v === 'boolean') return v
  if (typeof v === 'number') return v === 1
  return String(v).toLowerCase() === 'true'
}

function toDate(v: Cell): string {
  if (v === null || v === undefined || v === '') return ''
  // Number = Excel serial date (e.g. 45945)
  if (typeof v === 'number') {
    const d = new Date(Math.round(v - 25569) * 86400 * 1000)
    return d.toISOString().split('T')[0]
  }
  const s = String(v).trim()
  if (!s) return ''
  // Serial as string e.g. "45945" or "45945.0"
  if (/^\d+(\.\d+)?$/.test(s)) {
    const d = new Date(Math.round(parseFloat(s) - 25569) * 86400 * 1000)
    return d.toISOString().split('T')[0]
  }
  try {
    const d = new Date(s)
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
  } catch { /* ignore */ }
  return s
}

function rowToTransaction(row: Cell[], rowIndex: number): Transaction | null {
  if (!row[0] && !row[1]) return null
  try {
    const month = typeof row[0] === 'number' ? row[0] : parseInt(toStr(row[0]))
    const date = toDate(row[1])
    const description = toStr(row[2])
    const category = toStr(row[3]) as Category
    const paid_by = toStr(row[4]) as PaidBy
    const amount = toNum(row[5])
    const type = (toStr(row[6]) || 'Expense') as TransactionType
    const split = toBool(row[7])
    const expense_kevin = (row[8] !== null && row[8] !== undefined && row[8] !== '') ? toNum(row[8]) : null
    const expense_josephine = (row[9] !== null && row[9] !== undefined && row[9] !== '') ? toNum(row[9]) : null
    const notes = (row[10] !== null && row[10] !== undefined && row[10] !== '') ? toStr(row[10]) : null

    if (!date || !description || isNaN(amount) || isNaN(month)) return null

    let split_type: SplitType = 'equal'
    if (split && expense_kevin != null && expense_josephine != null) {
      if (Math.abs(expense_kevin - amount / 2) > 0.01) split_type = 'fixed'
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
    '',
  ]
}

export async function fetchTransactions(): Promise<Transaction[]> {
  const range = `${SHEET_NAME}!A3:L`
  const url = `${BASE_URL}/values/${encodeURIComponent(range)}?valueRenderOption=UNFORMATTED_VALUE&key=${API_KEY}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Sheets API error: ${res.status} ${res.statusText}`)
  const data = await res.json()
  const rows: Cell[][] = data.values || []
  const parsed = rows
    .map((row, i) => rowToTransaction(row, DATA_START_ROW + i))
    .filter((tx): tx is Transaction => tx !== null)
  console.log(`Loaded ${parsed.length} transactions`)
  return parsed
}

export async function appendTransaction(tx: Omit<Transaction, 'id' | 'row_index'>): Promise<void> {
  const res = await fetch('/api/sheets-append', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rows: [transactionToRow(tx)] }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Sheets append error: ${res.status} — ${err}`)
  }
}

export async function appendTransactions(txs: Omit<Transaction, 'id' | 'row_index'>[]): Promise<void> {
  const res = await fetch('/api/sheets-append', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rows: txs.map(transactionToRow) }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Sheets append error: ${res.status} — ${err}`)
  }
}
