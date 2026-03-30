import { useState } from 'react'
import { useAppStore } from '../stores/appStore'
import { appendTransaction } from '../lib/sheets'
import { ALL_CATEGORIES, CATEGORY_ICONS, Category, NewTransactionForm, TransactionType, PaidBy, SplitType } from '../types'

interface Props { onBack: () => void }

const defaultForm = (): NewTransactionForm => ({
  amount: '',
  description: '',
  date: new Date().toISOString().split('T')[0],
  category: null,
  paid_by: 'Kevin',
  type: 'Expense',
  split: false,
  split_type: 'equal',
  kevin_pct: 50,
  josephine_pct: 50,
  kevin_fixed: '',
  josephine_fixed: '',
  notes: '',
})

export default function AddExpense({ onBack }: Props) {
  const { addTransaction } = useAppStore()
  const [form, setForm] = useState<NewTransactionForm>(defaultForm())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (updates: Partial<NewTransactionForm>) => setForm(f => ({ ...f, ...updates }))
  const amt = parseFloat(form.amount) || 0

  const kevinAmt = () => {
    if (!form.split) return form.paid_by === 'Kevin' ? amt : form.paid_by === 'Shared' ? amt / 2 : 0
    if (form.split_type === 'equal') return amt / 2
    if (form.split_type === 'percentage') return (form.kevin_pct / 100) * amt
    return parseFloat(form.kevin_fixed) || 0
  }

  const josephineAmt = () => {
    if (!form.split) return form.paid_by === 'Josephine' ? amt : form.paid_by === 'Shared' ? amt / 2 : 0
    if (form.split_type === 'equal') return amt / 2
    if (form.split_type === 'percentage') return (form.josephine_pct / 100) * amt
    return parseFloat(form.josephine_fixed) || 0
  }

  const pctValid = form.split_type === 'percentage' ? (form.kevin_pct + form.josephine_pct) === 100 : true
  const fixedValid = form.split_type === 'fixed'
    ? Math.abs((parseFloat(form.kevin_fixed) || 0) + (parseFloat(form.josephine_fixed) || 0) - amt) < 0.01
    : true

  const canSave = amt > 0 && form.description.trim() &&
    (form.type !== 'Expense' || form.category) &&
    pctValid && fixedValid

  const save = async () => {
    if (!canSave) return
    setSaving(true)
    setError(null)
    try {
      const month = parseInt(form.date.split('-')[1])
      const tx = {
        month,
        date: form.date,
        description: form.description.trim(),
        category: (form.category || 'Miscelaneous') as Category,
        paid_by: form.paid_by as PaidBy,
        amount: amt,
        type: form.type as TransactionType,
        split: form.type === 'Expense' ? form.split : false,
        split_type: (form.split ? form.split_type : 'equal') as SplitType,
        expense_kevin: form.type === 'Expense' ? Math.round(kevinAmt() * 100) / 100 : null,
        expense_josephine: form.type === 'Expense' ? Math.round(josephineAmt() * 100) / 100 : null,
        notes: form.notes.trim() || null,
      }
      await appendTransaction(tx)
      addTransaction({ ...tx, id: `new-${Date.now()}` })
      onBack()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const onPctChange = (person: 'kevin' | 'josephine', val: string) => {
    const v = Math.min(100, Math.max(0, parseInt(val) || 0))
    if (person === 'kevin') set({ kevin_pct: v, josephine_pct: 100 - v })
    else set({ josephine_pct: v, kevin_pct: 100 - v })
  }

  return (
    <div className="page">
      <div className="topbar">
        <button className="topbar-cancel" onClick={onBack}>Cancel</button>
        <span className="topbar-title">Add expense</span>
        <div style={{ width: 48 }} />
      </div>

      {/* Amount */}
      <div className="amount-block">
        <div className="amount-label">Total amount</div>
        <div className="amount-display">
          <span className="amount-currency">€</span>
          <input className="amount-input" type="number" placeholder="0.00" step="0.01" min="0"
            value={form.amount} onChange={e => set({ amount: e.target.value })} />
        </div>
      </div>

      <div className="form">
        {/* Type */}
        <div className="field">
          <div className="field-label">Type</div>
          <div className="type-toggle">
            {(['Expense', 'Bayar hutang', 'Income'] as TransactionType[]).map(t => (
              <div key={t} className={`type-btn${form.type === t ? ' selected' : ''}`} onClick={() => set({ type: t })}>
                {t === 'Bayar hutang' ? 'Debt payment' : t}
              </div>
            ))}
          </div>
        </div>

        {/* Description */}
        <div className="field">
          <div className="field-label">Description</div>
          <input type="text" placeholder="e.g. REWE groceries" value={form.description}
            onChange={e => set({ description: e.target.value })} />
        </div>

        {/* Date */}
        <div className="field">
          <div className="field-label">Date</div>
          <input type="date" value={form.date} onChange={e => set({ date: e.target.value })} />
        </div>

        {/* Category */}
        {form.type === 'Expense' && (
          <div className="field">
            <div className="field-label">Category</div>
            <div className="cat-grid">
              {ALL_CATEGORIES.map(c => (
                <div key={c} className={`cat-chip${form.category === c ? ' selected' : ''}`}
                  onClick={() => set({ category: c })}>
                  <span className="icon">{CATEGORY_ICONS[c]}</span>
                  <span className="name">{c}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Paid by */}
        <div className="field">
          <div className="field-label">Paid by</div>
          <div className="paidby-row">
            {(['Kevin', 'Josephine', 'Shared'] as PaidBy[]).map(p => (
              <div key={p} className={`paidby-btn${form.paid_by === p ? ' selected' : ''}`}
                onClick={() => set(
                  p === 'Shared'
                    ? { paid_by: p, split: true, split_type: form.split_type === 'equal' || form.split_type === 'percentage' || form.split_type === 'fixed' ? form.split_type : 'equal' }
                    : { paid_by: p }
                )}>
                {p}
              </div>
            ))}
          </div>
        </div>

        {/* Split */}
        {form.type === 'Expense' && (
          <div className="field">
            <div className="field-label">Split</div>
            <div className="split-toggle">
              {[
                { mode: 'none', label: 'Personal' },
                { mode: 'equal', label: '50 / 50' },
                { mode: 'percentage', label: 'Custom %' },
                { mode: 'fixed', label: 'Fixed €' },
              ].map(({ mode, label }) => (
                <button key={mode}
                  className={`split-btn${(!form.split && mode === 'none') || (form.split && form.split_type === mode) ? ' active' : ''}`}
                  onClick={() => {
                    if (mode === 'none') set({ split: false })
                    else set({ split: true, split_type: mode as SplitType })
                  }}>
                  {label}
                </button>
              ))}
            </div>

            {form.split && (
              <div className="split-detail">
                {form.split_type === 'equal' && (
                  <>
                    <div className="split-row"><span className="split-person">Kevin</span><span className="split-result">€{(amt / 2).toFixed(2)}</span></div>
                    <div className="split-row"><span className="split-person">Josephine</span><span className="split-result">€{(amt / 2).toFixed(2)}</span></div>
                  </>
                )}
                {form.split_type === 'percentage' && (
                  <>
                    <div className="split-row">
                      <span className="split-person">Kevin</span>
                      <div className="split-input-wrap">
                        <input type="number" value={form.kevin_pct} min="0" max="100" step="1"
                          onChange={e => onPctChange('kevin', e.target.value)} />
                        <span className="split-suffix">%</span>
                      </div>
                      <span className="split-result">€{((form.kevin_pct / 100) * amt).toFixed(2)}</span>
                    </div>
                    <div className="split-row">
                      <span className="split-person">Josephine</span>
                      <div className="split-input-wrap">
                        <input type="number" value={form.josephine_pct} min="0" max="100" step="1"
                          onChange={e => onPctChange('josephine', e.target.value)} />
                        <span className="split-suffix">%</span>
                      </div>
                      <span className="split-result">€{((form.josephine_pct / 100) * amt).toFixed(2)}</span>
                    </div>
                    <div className={`split-summary${!pctValid ? ' error' : ''}`}>
                      {pctValid ? 'Total: 100%' : `Must add up to 100% (currently ${form.kevin_pct + form.josephine_pct}%)`}
                    </div>
                  </>
                )}
                {form.split_type === 'fixed' && (
                  <>
                    <div className="split-row">
                      <span className="split-person">Kevin</span>
                      <div className="split-input-wrap">
                        <input type="number" placeholder="0.00" step="0.01" value={form.kevin_fixed}
                          onChange={e => set({ kevin_fixed: e.target.value })} />
                        <span className="split-suffix">€</span>
                      </div>
                    </div>
                    <div className="split-row">
                      <span className="split-person">Josephine</span>
                      <div className="split-input-wrap">
                        <input type="number" placeholder="0.00" step="0.01" value={form.josephine_fixed}
                          onChange={e => set({ josephine_fixed: e.target.value })} />
                        <span className="split-suffix">€</span>
                      </div>
                    </div>
                    <div className={`split-summary${!fixedValid ? ' error' : ''}`}>
                      {fixedValid ? 'Adds up correctly ✓' : `Difference: €${Math.abs((parseFloat(form.kevin_fixed)||0)+(parseFloat(form.josephine_fixed)||0)-amt).toFixed(2)}`}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Notes */}
        <div className="field">
          <div className="field-label">Notes</div>
          <input type="text" placeholder="Optional note" value={form.notes}
            onChange={e => set({ notes: e.target.value })} />
        </div>

        {error && <div style={{ color: 'var(--color-text-danger)', fontSize: 13, marginTop: 8 }}>{error}</div>}
      </div>

      <button className="save-btn" onClick={save} disabled={!canSave || saving}>
        {saving ? 'Saving...' : 'Save expense'}
      </button>
    </div>
  )
}
