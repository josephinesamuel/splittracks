import { create } from 'zustand'
import { Transaction, Person } from '../types'
import { fetchTransactions } from '../lib/sheets'

interface AppStore {
  transactions: Transaction[]
  loading: boolean
  error: string | null
  activePerson: Person
  activeMonth: number
  activeYear: number
  setActivePerson: (p: Person) => void
  setActiveMonth: (month: number, year: number) => void
  loadTransactions: () => Promise<void>
  addTransaction: (tx: Transaction) => void
  addTransactions: (txs: Transaction[]) => void
}

const now = new Date()

export const useAppStore = create<AppStore>((set, get) => ({
  transactions: [],
  loading: false,
  error: null,
  activePerson: 'Kevin',
  activeMonth: now.getMonth() + 1,
  activeYear: now.getFullYear(),

  setActivePerson: (p) => set({ activePerson: p }),

  setActiveMonth: (month, year) => set({ activeMonth: month, activeYear: year }),

  loadTransactions: async () => {
    set({ loading: true, error: null })
    try {
      const transactions = await fetchTransactions()
      set({ transactions, loading: false })
    } catch (e) {
      set({ error: (e as Error).message, loading: false })
    }
  },

  addTransaction: (tx) =>
    set((s) => ({ transactions: [tx, ...s.transactions] })),

  addTransactions: (txs) =>
    set((s) => ({ transactions: [...txs, ...s.transactions] })),
}))
