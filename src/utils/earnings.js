/**
 * Pay & earnings engine.
 *
 * The tracker supports the very different rhythms people actually get paid in:
 * once a month, twice a month, every two weeks, weekly, per day worked,
 * per hour, or irregularly (gig work, tips, one-off jobs).
 *
 * Everything here is pure (no React, no Firestore) so it can be unit-tested.
 * Income sources are stored in the user's settings document as
 * `settings.incomeSources`, so they sync with the same Google account as the
 * transactions and survive a device change.
 */

import { monthKeyOf, shiftMonth, toDate, todayISO } from './date.js'

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
export const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export const PAY_FREQUENCIES = [
  { id: 'monthly', label: 'Monthly', perYear: 12, hint: 'One payment a month (e.g. the 25th)' },
  { id: 'semi-monthly', label: 'Twice a month', perYear: 24, hint: 'Two fixed days (e.g. 1st & 15th)' },
  { id: 'biweekly', label: 'Every 2 weeks', perYear: 26, hint: 'Fixed weekday, 14-day cycle' },
  { id: 'weekly', label: 'Weekly', perYear: 52, hint: 'Same weekday every week' },
  { id: 'daily', label: 'Per day worked', perYear: 365, hint: 'Daily wage × days worked' },
  { id: 'hourly', label: 'Per hour', perYear: null, hint: 'Hourly rate × hours worked' },
  { id: 'irregular', label: 'Irregular', perYear: null, hint: 'Gig work, tips, one-off jobs' },
]

export const FREQUENCY_MAP = Object.fromEntries(PAY_FREQUENCIES.map((f) => [f.id, f]))

export function frequencyMeta(id) {
  return FREQUENCY_MAP[id] || FREQUENCY_MAP.monthly
}

export const PAY_DAYS_OF_MONTH = Array.from({ length: 31 }, (_, i) => i + 1)
export const DAYS_PER_WEEK_OPTIONS = [1, 2, 3, 4, 5, 6, 7]

export function newSourceId() {
  return `src_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`
}

/** A blank income source, ready to be edited in the form. */
export function blankIncomeSource(overrides = {}) {
  return {
    id: newSourceId(),
    name: 'My job',
    category: 'salary',
    amount: 0,
    frequency: 'monthly',
    day: 1,
    days: [1, 15],
    weekday: 5,
    anchor: null,
    daysPerWeek: 5,
    hoursPerWeek: 40,
    active: true,
    ...overrides,
  }
}

/** "1st", "2nd", "3rd", "15th" … */
export function ordinal(n) {
  const num = Number(n) || 1
  const mod100 = num % 100
  if (mod100 >= 11 && mod100 <= 13) return `${num}th`
  switch (num % 10) {
    case 1:
      return `${num}st`
    case 2:
      return `${num}nd`
    case 3:
      return `${num}rd`
    default:
      return `${num}th`
  }
}

/* ------------------------------------------------------------------ */
/* Date maths for pay schedules                                        */
/* ------------------------------------------------------------------ */

function isoOf(year, monthIndex, day) {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function addDays(date, n) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + n)
}

function monthWindow(key) {
  const [y, m] = key.split('-').map(Number)
  return { start: new Date(y, m - 1, 1), end: new Date(y, m, 0) }
}

/** How many days a "yyyy-MM" month has (handles leap years). */
export function daysInMonth(key) {
  const { end } = monthWindow(key)
  return end.getDate()
}

function clampDay(day, key) {
  const days = daysInMonth(key)
  return Math.min(Math.max(1, Number(day) || 1), days)
}

/** First date on/after `key`'s 1st that falls on `weekday` (0 = Sunday). */
function firstWeekdayOf(key, weekday) {
  const { start } = monthWindow(key)
  const offset = (Number(weekday) + 7 - start.getDay()) % 7
  return addDays(start, offset)
}

/** Walks a fixed-step lattice (every 7 or 14 days) and keeps the dates in a month. */
function latticeDates(anchor, stepDays, key) {
  const out = []
  if (!anchor) return out
  const { start, end } = monthWindow(key)
  let cur = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate())
  const gap = Math.ceil((start - cur) / 86400000)
  if (gap > 0) cur = addDays(cur, Math.ceil(gap / stepDays) * stepDays)
  let guard = 0
  while (cur <= end && guard < 10) {
    if (cur >= start) out.push(isoOf(cur.getFullYear(), cur.getMonth(), cur.getDate()))
    cur = addDays(cur, stepDays)
    guard += 1
  }
  return out
}

/**
 * Every dated payment a source produces inside one month.
 * Only "calendar" frequencies have dates; daily/hourly/irregular are
 * projected instead because the real dates come from what you actually logged.
 */
export function paymentDates(source, key) {
  const freq = source?.frequency || 'monthly'
  switch (freq) {
    case 'monthly':
      return [isoOf(Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 1, clampDay(source.day, key))]
    case 'semi-monthly': {
      const days = (source.days?.length ? source.days : [1, 15])
        .map((d) => clampDay(d, key))
        .sort((a, b) => a - b)
      const [y, m] = key.split('-').map(Number)
      return [...new Set(days)].map((d) => isoOf(y, m - 1, d))
    }
    case 'biweekly':
      return latticeDates(source.anchor ? toDate(source.anchor) : firstWeekdayOf(key, source.weekday ?? 5), 14, key)
    case 'weekly':
      return latticeDates(source.anchor ? toDate(source.anchor) : firstWeekdayOf(key, source.weekday ?? 5), 7, key)
    default:
      return []
  }
}

/** Payments with amounts, ready to show in a list or log to the ledger. */
export function paymentsInMonth(source, key) {
  return paymentDates(source, key).map((date) => ({ sourceId: source.id, name: source.name, date, amount: Number(source.amount) || 0 }))
}

/** How many times a "calendar" frequency pays per month, on average. */
export function paymentsPerMonth(source) {
  switch (source?.frequency) {
    case 'semi-monthly':
      return (source.days?.length ? source.days.length : 2)
    case 'biweekly':
      return 26 / 12
    case 'weekly':
      return 52 / 12
    default:
      return 1
  }
}

/**
 * What one source is expected to bring in during a month.
 * Daily and hourly rates are scaled by the days in that specific month.
 */
export function monthlyProjection(source, key) {
  const amount = Number(source?.amount) || 0
  const days = daysInMonth(key)
  switch (source?.frequency) {
    case 'daily':
      return amount * (Number(source.daysPerWeek) || 5) * (days / 7)
    case 'hourly':
      // Rate per hour × hours a week × weeks in this month.
      return amount * (Number(source.hoursPerWeek) || 0) * (days / 7)
    case 'irregular':
      return 0
    default:
      return amount * paymentsPerMonth(source)
  }
}

/** Total expected income for a month from every active source. */
export function projectedIncome(sources = [], key) {
  return sources
    .filter((s) => s && s.active !== false)
    .reduce((sum, s) => sum + monthlyProjection(s, key), 0)
}

/* ------------------------------------------------------------------ */
/* Paydays you can act on                                              */
/* ------------------------------------------------------------------ */

/** Paydays from a source that are still ahead of `fromISO`, inside `key`. */
export function upcomingPayments(sources = [], key, fromISO = todayISO()) {
  const out = []
  for (const source of sources) {
    if (!source || source.active === false) continue
    for (const p of paymentsInMonth(source, key)) {
      if (p.date >= fromISO) out.push(p)
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * The next payday across every source, looking up to three months ahead so a
 * monthly salary paid on the 1st still shows up at the end of the month.
 * Daily / hourly / irregular sources have no fixed date, so they're skipped.
 */
export function nextPayday(sources = [], fromISO = todayISO()) {
  const startKey = monthKeyOf(toDate(fromISO))
  for (let i = 0; i < 4; i += 1) {
    const key = shiftMonth(startKey, i)
    const [next] = upcomingPayments(sources, key, fromISO)
    if (next) return { ...next, monthKey: key }
  }
  return null
}

/** Whole days until an ISO date (0 = today, negative = already passed). */
export function daysUntil(iso, fromISO = todayISO()) {
  if (!iso) return null
  const a = toDate(iso)
  const b = toDate(fromISO)
  return Math.round((a - b) / 86400000)
}

/**
 * A payday → a transaction you can save.
 *
 * `alreadyLogged` lets the screen grey out a payday you've already recorded,
 * which is what stops a salary being entered twice in one month.
 */
export function paymentToTransaction(payment = {}) {
  return {
    date: payment.date,
    type: 'income',
    category: payment.category || 'salary',
    amount: Number(payment.amount) || 0,
    description: payment.name ? `${payment.name}` : 'Pay',
  }
}

/** Paydays already covered by a logged income, matched by date + amount. */
export function loggedPaydays(sources = [], transactions = [], key) {
  const result = new Map()
  for (const source of sources) {
    if (!source) continue
    for (const p of paymentsInMonth(source, key)) {
      const hit = transactions.some(
        (t) =>
          t.type === 'income' &&
          t.date === p.date &&
          Math.abs((Number(t.amount) || 0) - (Number(p.amount) || 0)) < 0.01,
      )
      result.set(`${p.sourceId}|${p.date}`, hit)
    }
  }
  return result
}

