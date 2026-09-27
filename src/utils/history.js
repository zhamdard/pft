/**
 * Money-history helpers.
 *
 * Everything on the History screen — the 12-month rolling ledger, the
 * cumulative balance that climbs and falls as you scroll, and the
 * best/worst-month callouts — comes from these pure functions so the numbers
 * can be unit-tested without a browser.
 */

import { monthKeyOf, shiftMonth, shortMonthLabel, formatMonthKey } from './date.js'
import { monthTotals, categoryAgg } from './stats.js'

/** Savings rate as a rounded percentage (null when there was no income). */
export function savingsRate(net, income) {
  if (!income) return null
  return Math.round((net / income) * 100)
}

/**
 * One row per month, oldest → newest.
 * Each row carries the totals plus the biggest spending category, which is
 * what turns a boring table into a story ("December: rent blew the budget").
 */
export function monthHistory(transactions, count = 12, endMonthKey = null) {
  const current = endMonthKey || monthKeyOf(new Date())
  const keys = Array.from({ length: count }, (_, i) => shiftMonth(current, i - (count - 1)))

  return keys.map((key) => {
    const { income, expense, net } = monthTotals(transactions, key)
    const byCategory = categoryAgg(transactions, 'expense', key)
    const top = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0]
    let entries = 0
    for (const t of transactions) {
      if (t.date && monthKeyOf(t.date) === key) entries += 1
    }
    return {
      key,
      label: shortMonthLabel(key),
      fullLabel: formatMonthKey(key),
      year: key.slice(0, 4),
      income,
      expense,
      net,
      entries,
      savingsRate: savingsRate(net, income),
      topCategory: top ? top[0] : null,
      topAmount: top ? top[1] : 0,
    }
  })
}

/**
 * Adds the running balance to each month — the number that makes the history
 * list feel like a bank statement. `startingBalance` is the balance before the
 * first visible month (derived from everything older than the window).
 */
export function withRunningBalance(rows, startingBalance = 0) {
  let running = startingBalance
  return rows.map((row) => {
    running += row.net
    return { ...row, running }
  })
}

/** Everything before the visible window, so the running balance starts true. */
export function balanceBefore(transactions, monthKey) {
  let balance = 0
  for (const t of transactions) {
    if (!t.date) continue
    if (monthKeyOf(t.date) >= monthKey) continue
    const amount = Number(t.amount) || 0
    balance += t.type === 'income' ? amount : -amount
  }
  return balance
}

/** Headline numbers for the history screen. */
export function historyTotals(rows) {
  const months = rows.filter((r) => r.entries > 0)
  const income = rows.reduce((s, r) => s + r.income, 0)
  const expense = rows.reduce((s, r) => s + r.expense, 0)
  const net = income - expense

  const byNet = [...months].sort((a, b) => b.net - a.net)
  const byIncome = [...months].sort((a, b) => b.income - a.income)
  const byExpense = [...months].sort((a, b) => b.expense - a.expense)

  return {
    income,
    expense,
    net,
    months: months.length,
    averageIncome: months.length ? income / months.length : 0,
    averageExpense: months.length ? expense / months.length : 0,
    averageNet: months.length ? net / months.length : 0,
    savingsRate: savingsRate(net, income),
    bestMonth: byNet[0] || null,
    worstMonth: byNet[byNet.length - 1] || null,
    highestIncomeMonth: byIncome[0] || null,
    highestExpenseMonth: byExpense[0] || null,
  }
}

/** Largest single transactions of a type — "where the money actually went". */
export function biggestTransactions(transactions, type = 'expense', count = 5) {
  return transactions
    .filter((t) => t.type === type)
    .sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0))
    .slice(0, count)
}

/** Month-over-month change, as a percentage (null when there's no comparison). */
export function changePercent(current, previous) {
  if (!previous) return null
  return Math.round(((current - previous) / previous) * 100)
}

/** The series a "balance over time" chart needs: cumulative net per month. */
export function balanceSeries(rows) {
  return rows.map((r) => ({ key: r.key, label: r.label, balance: r.running ?? r.net }))
}
