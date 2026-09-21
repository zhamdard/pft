import { monthKeyOf, shiftMonth, shortMonthLabel } from './date'

/** Sum income and expenses for transactions belonging to a month. */
export function monthTotals(transactions, monthKey) {
  let income = 0
  let expense = 0
  for (const t of transactions) {
    if (!t.date) continue
    if (monthKeyOf(t.date) !== monthKey) continue
    const amt = Number(t.amount) || 0
    if (t.type === 'income') income += amt
    else expense += amt
  }
  return { income, expense, net: income - expense }
}

/** All-time totals across every transaction. */
export function allTimeTotals(transactions) {
  let income = 0
  let expense = 0
  for (const t of transactions) {
    const amt = Number(t.amount) || 0
    if (t.type === 'income') income += amt
    else expense += amt
  }
  return { income, expense, net: income - expense }
}

/** expense/income aggregates per category id, e.g. { food: 120.5 }. */
export function categoryAgg(transactions, type = 'expense', monthKey = null) {
  const out = {}
  for (const t of transactions) {
    if (t.type !== type) continue
    if (monthKey && (!t.date || monthKeyOf(t.date) !== monthKey)) continue
    const amt = Number(t.amount) || 0
    out[t.category] = (out[t.category] || 0) + amt
  }
  return out
}

/** Series used by the cash-flow chart: last `count` months, oldest → newest. */
export function cashflowSeries(transactions, count = 6) {
  const current = monthKeyOf(new Date())
  const keys = Array.from({ length: count }, (_, i) => shiftMonth(current, i - (count - 1)))
  return keys.map((key) => {
    const { income, expense } = monthTotals(transactions, key)
    return { key, label: shortMonthLabel(key), income, expense }
  })
}

/** Reusable fill colors for charts per category. */
export function categoryColorMap(entries) {
  const map = {}
  entries.forEach((e) => {
    map[e.category] = e.color
  })
  return map
}
