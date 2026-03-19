import { useState, useRef } from 'react'
import { useAppStore } from '../stores/appStore'
import { appendTransactions } from '../lib/sheets'
import { scanReceiptImage, fileToBase64, ScannedTransaction } from '../lib/claude'
import { ALL_CATEGORIES, CATEGORY_ICONS, CATEGORY_COLORS, Category, PaidBy } from '../types'

interface Props { onBack: () => void }

interface ImportRow extends ScannedTransaction {
  checked: boolean
  splitMode: 'mine' | 'split' | 'skip'
}

export default function BulkImport({ onBack }: Props) {
  const { activePerson, addTransactions } = useAppStore()
  const [stage, setStage] = useState<'upload' | 'processing' | 'review'>('upload')
  const [progress, setProgress] = useState(0)
  const [progressLabel, setProgressLabel] = useState('')
  const [rows, setRows] = useState<ImportRow[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const processFile = async (file: File) => {
    setStage('processing')
    setError(null)
    try {
      setProgress(20); setProgressLabel('Reading image...')
      const { base64, mimeType } = await fileToBase64(file)
      setProgress(50); setProgressLabel('Extracting transactions with AI...')
      const scanned = await scanReceiptImage(base64, mimeType)
      setProgress(85); setProgressLabel('Categorising...')
      const importRows: ImportRow[] = scanned.map(tx => ({
        ...tx,
        checked: tx.amount > 0,
        splitMode: tx.amount < 0 ? 'skip' : 'mine',
      }))
      setProgress(100); setProgressLabel(`Done — ${importRows.length} transactions found`)
      setTimeout(() => { setRows(importRows); setStage('review') }, 500)
    } catch (e) {
      setError((e as Error).message)
      setStage('upload')
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  const toggleRow = (i: number) => setRows(r => r.map((row, idx) => idx === i ? { ...row, checked: !row.checked } : row))
  const setSplit = (i: number, mode: 'mine' | 'split' | 'skip') => setRows(r => r.map((row, idx) => idx === i ? { ...row, splitMode: mode } : row))
  const cycleCategory = (i: number) => setRows(r => r.map((row, idx) => {
    if (idx !== i) return row
    const ci = ALL_CATEGORIES.indexOf(row.category as Category)
    return { ...row, category: ALL_CATEGORIES[(ci + 1) % ALL_CATEGORIES.length] }
  }))

  const selected = rows.filter(r => r.checked && r.amount > 0)
  const total = selected.reduce((s, r) => s + r.amount, 0)

  const confirm = async () => {
    setSaving(true)
    setError(null)
    try {
      const month = new Date().getMonth() + 1
      const txs = selected.map(r => ({
        month,
        date: r.date,
        description: r.description,
        category: r.category as Category,
        paid_by: activePerson as PaidBy,
        amount: r.amount,
        type: 'Expense' as const,
        split: r.splitMode === 'split',
        split_type: 'equal' as const,
        expense_kevin: r.splitMode === 'split'
          ? r.amount / 2
          : activePerson === 'Kevin' ? r.amount : 0,
        expense_josephine: r.splitMode === 'split'
          ? r.amount / 2
          : activePerson === 'Josephine' ? r.amount : 0,
        notes: null,
      }))
      await appendTransactions(txs)
      addTransactions(txs.map((tx, i) => ({ ...tx, id: `import-${Date.now()}-${i}` })))
      onBack()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page" style={{ paddingBottom: 100 }}>
      <div className="topbar">
        <button className="topbar-cancel" onClick={onBack}>Cancel</button>
        <span className="topbar-title">Import from screenshot</span>
        <div style={{ width: 48 }} />
      </div>

      {stage === 'upload' && (
        <>
          <div className="upload-zone" onClick={() => fileRef.current?.click()}>
            <div className="upload-icon">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 13V4M10 4L7 7M10 4l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M4 14v1a2 2 0 002 2h8a2 2 0 002-2v-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)' }}>Upload bank screenshot</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', textAlign: 'center' }}>Take a screenshot of your banking app and upload it here</div>
            <div className="upload-btn">Choose photo</div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
          {error && <div style={{ margin: '0 16px', color: 'var(--color-text-danger)', fontSize: 13 }}>{error}</div>}
        </>
      )}

      {stage === 'processing' && (
        <div style={{ margin: '0 16px', background: 'var(--color-background-secondary)', borderRadius: 'var(--border-radius-lg)', padding: 16 }}>
          <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 8 }}>{progressLabel}</div>
          <div style={{ height: 3, background: 'var(--color-border-tertiary)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: 3, background: 'var(--color-text-primary)', borderRadius: 2, width: `${progress}%`, transition: 'width 0.4s ease' }} />
          </div>
        </div>
      )}

      {stage === 'review' && (
        <>
          <div style={{ padding: '0 20px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {rows.length} transactions found
            </span>
          </div>

          <div style={{ margin: '0 16px', background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-lg)', overflow: 'hidden' }}>
            {rows.map((row, i) => (
              <div key={i} style={{ padding: '12px 14px', borderBottom: '0.5px solid var(--color-border-tertiary)', display: 'flex', gap: 10, opacity: row.splitMode === 'skip' ? 0.4 : 1 }}>
                <div
                  onClick={() => toggleRow(i)}
                  style={{ width: 20, height: 20, borderRadius: '50%', border: `1.5px solid ${row.checked ? 'var(--color-text-primary)' : 'var(--color-border-secondary)'}`, background: row.checked ? 'var(--color-text-primary)' : 'none', cursor: 'pointer', flexShrink: 0, marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {row.checked && <span style={{ color: 'var(--color-background-primary)', fontSize: 10, fontWeight: 700 }}>✓</span>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>{row.description}</span>
                    <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)', flexShrink: 0 }}>
                      {row.amount < 0 ? '+' : '-'}€{Math.abs(row.amount).toFixed(2)}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>{row.date}</div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                    <div onClick={() => cycleCategory(i)}
                      style={{ padding: '4px 10px', borderRadius: 100, fontSize: 11, fontWeight: 500, background: (CATEGORY_COLORS[row.category as Category] || '#888') + '22', color: 'var(--color-text-secondary)', cursor: 'pointer', border: '0.5px solid var(--color-border-tertiary)' }}>
                      {CATEGORY_ICONS[row.category as Category] || '📦'} {row.category}
                    </div>
                    {row.amount > 0 && (
                      <>
                        <div onClick={() => setSplit(i, 'mine')}
                          style={{ padding: '4px 10px', borderRadius: 100, fontSize: 11, fontWeight: 500, cursor: 'pointer', background: row.splitMode === 'mine' ? '#E6F1FB' : 'var(--color-background-secondary)', color: row.splitMode === 'mine' ? '#185FA5' : 'var(--color-text-tertiary)', border: `0.5px solid ${row.splitMode === 'mine' ? '#B5D4F4' : 'var(--color-border-tertiary)'}` }}>
                          Mine only
                        </div>
                        <div onClick={() => setSplit(i, 'split')}
                          style={{ padding: '4px 10px', borderRadius: 100, fontSize: 11, fontWeight: 500, cursor: 'pointer', background: row.splitMode === 'split' ? '#EAF3DE' : 'var(--color-background-secondary)', color: row.splitMode === 'split' ? '#3B6D11' : 'var(--color-text-tertiary)', border: `0.5px solid ${row.splitMode === 'split' ? '#C0DD97' : 'var(--color-border-tertiary)'}` }}>
                          50/50 split
                        </div>
                      </>
                    )}
                    {row.amount < 0 && (
                      <div style={{ padding: '4px 10px', borderRadius: 100, fontSize: 11, background: 'var(--color-background-secondary)', color: 'var(--color-text-tertiary)' }}>Income / skip</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {error && <div style={{ margin: '8px 16px 0', color: 'var(--color-text-danger)', fontSize: 13 }}>{error}</div>}
        </>
      )}

      {stage === 'review' && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, maxWidth: 390, margin: '0 auto', background: 'var(--color-background-primary)', borderTop: '0.5px solid var(--color-border-tertiary)', padding: '12px 16px 28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Importing <strong style={{ color: 'var(--color-text-primary)' }}>{selected.length}</strong></div>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Total <strong style={{ color: 'var(--color-text-primary)' }}>€{total.toFixed(2)}</strong></div>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Split <strong style={{ color: 'var(--color-text-primary)' }}>{selected.filter(r => r.splitMode === 'split').length}</strong></div>
          </div>
          <button className="save-btn" onClick={confirm} disabled={selected.length === 0 || saving}>
            {saving ? 'Saving...' : `Confirm import (${selected.length})`}
          </button>
        </div>
      )}
    </div>
  )
}
