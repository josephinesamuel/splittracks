# SplitTrack — Claude Context

Personal expense-splitting app for Kevin and Josephine. Tracks shared expenses, individual spending, and running debt balance via Google Sheets as the database.

## Stack
- **Frontend**: React 18 + TypeScript, Vite, Zustand (state)
- **Backend/DB**: Google Sheets API (read) + Google Apps Script (write/append)
- **Deployment**: Vercel (API routes in `/api/`)
- **AI**: Claude API via `src/lib/claude.ts` for OCR receipt scanning

## Key env vars
```
VITE_SHEET_ID=<google sheet id>
VITE_SHEETS_API_KEY=<google api key>
GOOGLE_APPS_SCRIPT_URL=<apps script web app url>
VITE_ANTHROPIC_API_KEY=<claude api key>
```

## Google Sheet structure
Sheet ID: `1xcBzhFoTrjdjzoBrYVMtkg1xUwKIIouF1qKsGad64Ns`
Tabs: Dashboard, **Transactions**, Bagi Tugas, Meal plan, Utang HP Kevin, GOAL SETTING 2026

### Transactions tab columns (A–L)
| Col | Field | Notes |
|-----|-------|-------|
| A | Month | Integer (1–12) |
| B | Date | **DD/MM/YYYY format** in existing data |
| C | Description | Free text |
| D | Category | See `ALL_CATEGORIES` in types |
| E | Paid By | `Kevin`, `Josephine`, or `Shared` |
| F | Amount | `€X.XX` format |
| G | Type | `Expense`, `Bayar hutang`, `Income` |
| H | Split? | `TRUE` / `FALSE` |
| I | Expense Kevin | `€X.XX` or `—` if none |
| J | Expense Josephine | `€X.XX` or `—` if none |
| K | Notes | Optional |
| L | Cash? | Unused, always blank |

Row 1 = totals row, Row 2 = headers, data from Row 3.

## Debt engine (`src/utils/debtEngine.ts`)
- Tracks debt from `DEBT_START_DATE = '2025-11-18'` (row 82 in sheet)
- `HUTANG_LAMA_KEVIN = €120` — carried-over debt hardcoded from before start date
- `paid_by = 'Shared'` means both paid from a shared fund; **no net debt** created between Kevin and Josephine for these transactions
- Formula: `net > 0` = Josephine owes Kevin, `net < 0` = Kevin owes Josephine

## Data flow
1. **Read**: `fetchTransactions()` in `src/lib/sheets.ts` — direct Sheets API call (public read key)
2. **Write**: `appendTransaction()` → POST to `/api/sheets-append.js` → Google Apps Script → appends row
3. **State**: `useAppStore` (Zustand) in `src/stores/appStore.ts` — holds all transactions in memory

## Important quirks
- Dates in the sheet are `DD/MM/YYYY` — `parseDate()` handles this conversion to `YYYY-MM-DD`
- `parseMoney()` strips `€` prefix and handles `—` (em dash) as zero
- `split_type` is NOT stored in the sheet — it's inferred on read (equal vs fixed). Percentage splits are stored as fixed amounts.
- Monthly breakdown uses `tx.month` (from col A) for month filter, and parsed date year for year filter
- `Shared` paid_by: expense shares are counted for budgeting, but both Kevin and Josephine are credited as paying their own share (no debt created)

## Pages
- `Dashboard` — debt balance (all-time from start date) + monthly category breakdown per person
- `Transactions` — list view with filters
- `AddExpense` — manual entry form (supports Kevin / Josephine / Shared paid_by)
- `BulkImport` — upload bank screenshot → Claude OCR → review → batch append
- `Trends` — monthly spending trends

## People
- Kevin and Josephine — the only two tracked users (`Person` type)
- Default active person: Kevin
