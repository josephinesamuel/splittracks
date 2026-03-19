import { Transaction, TransactionType, PaidBy, SplitType, Category } from '../types'

const SHEET_ID = import.meta.env.VITE_SHEET_ID
const API_KEY = import.meta.env.VITE_SHEETS_API_KEY
const SHEET_NAME = 'Transactions'
const BASE_URL = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}`
const DATA_START_ROW = 3

// Google Sheets API with UNFORMATTED_VALUE returns mixed types:
// numbers for date/amount cells, strings for text cells, booleans for checkboxes
type CellValue = string | number | boolean | null | undefined

function parseDate(val: CellValue): string {
  if (val === null || val === undefined || val === '') return ''
  // Number = Excel serial date (e.g. 45945 = 2025-10-15)
  if (typeof val === 'number') {
    const date = new Date(Math.round(val - 25569) * 86400 * 1000)
    return date.toISOString().split('T')[0]
  }
  const str = String(val).trim()
  if (!str) return ''
  // Serial number as string (e.g. "45945" or "45945.0")
  if (/^\d+(\.\d+)?$/.test(str)) {
    const serial = parseFloat(str)
    const date = new Date(Math.round(serial - 25569) * 86400 * 1000)
    return date.toISOString().split('T')[0]
  }
  // ISO or other date string
  try {
    const d = new Date(str)
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
  } catch { /* ignore */ }
  return str
}

function parseMoney(val: CellValue): number {
  if (val === null || val === undefined || val === '') return 0
  if (typeof val === 'number') return Number.isFinite(val) ? val : 0
  if (typeof val === 'boolean') return 0
  const cleaned = String(val).trim().replace(/[^0-9.-]/g, '')
  if (!cleaned) return 0
  const num = Number(cleaned)
  return Number.isFinite(num) ? num : 0
}

function parseStr(val: CellValue): string {
  if (val === null || val === undefined) return ''
  return String(val).trim()
}

function parseBool(val: CellValue): boolean {
  if (typeof val === 'boolean') return val
  if (typeof val === 'number') return val === 1
  return String(val).toLowerCase() === 'true'
}

function rowToTransaction(row: CellValue[], rowIndex: number): Transaction | null {
  if (!row[0] && !row[1]) return null
  try {
    const month = typeof row[0] === 'number' ? row[0] : parseInt(String(row[0]))
    const date = parseDate(row[1])
    const description = parseStr(row[2])
    const category = parseStr(row[3]) as Category
    const paid_by = parseStr(row[4]) as PaidBy
    const amount = parseMoney(row[5])
    const type = (parseStr(row[6]) || 'Expense') as TransactionType
    const split = parseBool(row[7])
    const expense_kevin = row[8] !== null && row[8] !== undefined && row[8] !== '' ? parseMoney(row[8]) : null
    const expense_josephine = row[9] !== null && row[9] !== undefined && row[9] !== '' ? parseMoney(row[9]) : null
    const notes = row[10] ? parseStr(row[10]) : null

    if (!date || !description || isNaN(amount) || isNaN(month)) return null

    // Infer split_type
    let split_type: SplitType = 'equal'
    if (split && expense_kevin != null && expense_josephine != null) {
      if (Math.abs(expense_kevin - amount / 2) > 0.01) {
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
  // UNFORMATTED_VALUE returns raw numbers for dates/amounts instead of formatted strings
  const url = `${BASE_URL}/values/${encodeURIComponent(range)}?valueRenderOption=UNFORMATTED_VALUE&key=${API_KEY}`

  console.log('Fetching sheets, SHEET_ID:', SHEET_ID ? 'set' : 'MISSING', 'API_KEY:', API_KEY ? 'set' : 'MISSING')

  const res = await fetch(url)
  if (!res.ok) throw new Error(`Sheets API error: ${res.status} ${res.statusText}`)
  const data = await res.json()
  const rows: CellValue[][] = data.values || []

  console.log('Raw rows from API:', rows.length)
  if (rows[0]) console.log('First row sample:', rows[0])

  const parsed = rows
    .map((row, i) => rowToTransaction(row, DATA_START_ROW + i))
    .filter((tx): tx is Transaction => tx !== null)

  console.log('Parsed transactions:', parsed.length)
  if (parsed[0]) console.log('First parsed tx:', parsed[0])

  return parsed
}

export async function appendTransaction(tx: Omit<Transaction, 'id' | 'row_index'>): Promise<void> {
  const range = `${SHEET_NAME}!A:L`
  const url = `${BASE_URL}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&key=${API_KEY}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ values: [transactionToRow(tx)] }),
  })
  if (!res.ok) throw new Error(`Sheets append error: ${res.status}`)
}

export async function appendTransactions(txs: Omit<Transaction, 'id' | 'row_index'>[]): Promise<void> {
  const range = `${SHEET_NAME}!A:L`
  const url = `${BASE_URL}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&key=${API_KEY}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ values: txs.map(transactionToRow) }),
  })
  if (!res.ok) throw new Error(`Sheets append error: ${res.status}`)
}
