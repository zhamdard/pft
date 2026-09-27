import { monthKeyOf, shiftMonth, shortMonthLabel } from './date.js'

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

/**
 * The extra numbers a dashboard shows beside the balance: the biggest single
 * expense of the month, how many entries it holds, and how it compares with the
 * month before it. Pure, so it can be unit-tested without a browser.
 */
export function monthInsights(transactions, monthKey, prevKey = null) {
  const current = monthTotals(transactions, monthKey)
  const previous = prevKey ? monthTotals(transactions, prevKey) : null

  let largestExpense = null
  let entries = 0
  for (const t of transactions) {
    if (!t.date || monthKeyOf(t.date) !== monthKey) continue
    entries += 1
    if (t.type !== 'expense') continue
    if (!largestExpense || (Number(t.amount) || 0) > (Number(largestExpense.amount) || 0)) {
      largestExpense = t
    }
  }

  /** Percentage change, or null when there is nothing sensible to compare. */
  const change = (now, before) => {
    if (before === null || before === undefined) return null
    if (!before) return now ? 100 : null
    return Math.round(((now - before) / before) * 100)
  }

  return {
    ...current,
    entries,
    largestExpense,
    previous,
    incomeChange: change(current.income, previous?.income),
    expenseChange: change(current.expense, previous?.expense),
    netChange: change(current.net, previous?.net),
    savingsRate: current.income > 0 ? Math.round((current.net / current.income) * 100) : null,
  }
}

/** Reusable fill colors for charts per category. */
export function categoryColorMap(entries) {
  const map = {}
  entries.forEach((e) => {
    map[e.category] = e.color
  })
  return map
}
