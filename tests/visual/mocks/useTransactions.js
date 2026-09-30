/**
 * Audit mock for src/hooks/useTransactions.js.
 *
 * Generates a deterministic 8-month ledger that deliberately stresses the
 * layout: long descriptions, every expense category, and amounts that get wide
 * (5 figures plus cents) so cramped grid cells reveal themselves.
 *
 * ?empty=1 in the URL returns nothing, so the empty states can be audited too.
 */
import { useMemo } from 'react'

const EMPTY = typeof location !== 'undefined' && new URLSearchParams(location.search).get('empty') === '1'

const EXPENSE = [
  ['food', 'Lunch at the deli near the office'],
  ['groceries', 'Weekly grocery run — Costco (bulk)'],
  ['transport', 'Fuel'],
  ['housing', 'Rent'],
  ['utilities', 'Electricity + water + internet bundle'],
  ['health', 'Pharmacy'],
  ['fun', 'Cinema tickets'],
  ['shopping', 'Running shoes'],
  ['education', 'Online course subscription'],
  ['travel', 'Train tickets'],
  ['personal', 'Haircut'],
  ['other-expense', 'Misc'],
]

const AMOUNTS = [12.4, 184.95, 1480, 62.3, 9.99, 12450.75, 33.33, 240.5, 7.25]

/** Deterministic pseudo-random so every run lays out identically. */
function seeded(n) {
  const x = Math.sin(n * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

function build() {
  const out = []
  let id = 0
  const now = new Date()

  for (let back = 0; back < 8; back += 1) {
    const base = new Date(now.getFullYear(), now.getMonth() - back, 1)
    const year = base.getFullYear()
    const month = base.getMonth() + 1
    const day = (d) => `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`

    // Salary — one big income per month.
    out.push({
      id: `s${back}`,
      type: 'income',
      category: 'salary',
      amount: 3200 + Math.round(seeded(back + 1) * 400),
      date: day(1),
      description: 'Monthly salary — Northwind Trading Co.',
    })

    // A second, irregular income every other month.
    if (back % 2 === 0) {
      out.push({
        id: `f${back}`,
        type: 'income',
        category: 'freelance',
        amount: 450 + Math.round(seeded(back + 2) * 900),
        date: day(14),
        description: 'Freelance invoice',
      })
    }

    const count = 6 + Math.floor(seeded(back + 3) * 5)
    for (let i = 0; i < count; i += 1) {
      const [category, description] = EXPENSE[Math.floor(seeded(back * 31 + i) * EXPENSE.length)]
      const amount = AMOUNTS[Math.floor(seeded(back * 17 + i * 7) * AMOUNTS.length)]
      out.push({
        id: `t${id++}`,
        type: 'expense',
        category,
        amount,
        date: day(1 + Math.floor(seeded(back * 13 + i * 3) * 27)),
        description,
      })
    }
  }

  return out
}

export function useTransactions() {
  const transactions = useMemo(() => (EMPTY ? [] : build()), [])
  return { loading: false, transactions, error: null }
}