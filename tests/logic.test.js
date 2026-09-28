/**
 * PFT logic tests — zero dependencies, run with: npm test
 *
 * Covers the pure functions that decide how the UI behaves when something
 * goes wrong, because those are exactly the ones that must not be wrong.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { sortByDateDesc, tsMillis } from '../src/utils/sort.js'
import { describeAuthError } from '../src/utils/authErrors.js'
import { describeFirestoreError, summariseError } from '../src/utils/firestoreErrors.js'
import { monthInsights } from '../src/utils/stats.js'
import { balanceBefore, monthHistory, withRunningBalance } from '../src/utils/history.js'
import { NAV_ITEMS, MOBILE_TABS, MORE_NAV_ITEMS } from '../src/components/layout/appNav.js'

/* ------------------------------------------------------------------ */
/* Sorting — must equal what the old Firestore double-orderBy did      */
/* ------------------------------------------------------------------ */

const fakeTimestamp = (ms) => ({ toMillis: () => ms })

test('sorts transactions newest date first', () => {
  const input = [
    { id: 'a', date: '2026-01-05' },
    { id: 'b', date: '2026-03-02' },
    { id: 'c', date: '2026-02-14' },
  ]
  assert.deepEqual(
    sortByDateDesc(input).map((t) => t.id),
    ['b', 'c', 'a'],
  )
})

test('breaks ties on the same date by createdAt, newest first', () => {
  const input = [
    { id: 'older', date: '2026-03-01', createdAt: fakeTimestamp(1000) },
    { id: 'newer', date: '2026-03-01', createdAt: fakeTimestamp(9000) },
  ]
  assert.deepEqual(
    sortByDateDesc(input).map((t) => t.id),
    ['newer', 'older'],
  )
})

test('handles missing dates and missing createdAt without throwing', () => {
  const input = [
    { id: 'no-date' },
    { id: 'dated', date: '2026-03-01', createdAt: fakeTimestamp(5) },
    { id: 'also-dated', date: '2026-03-01' },
  ]
  const out = sortByDateDesc(input)
  assert.equal(out.length, 3)
  assert.equal(out[0].id, 'dated') // dated + createdAt wins the tie
  assert.equal(out[2].id, 'no-date') // undated sinks to the bottom
})

test('does not mutate the array it is given', () => {
  const input = [{ id: 'a', date: '2026-01-01' }, { id: 'b', date: '2026-02-01' }]
  const snapshot = input.map((t) => t.id)
  sortByDateDesc(input)
  assert.deepEqual(input.map((t) => t.id), snapshot)
})

test('tsMillis understands Firestore Timestamps, Dates and numbers', () => {
  assert.equal(tsMillis(fakeTimestamp(4242)), 4242)
  assert.equal(tsMillis(new Date(5000)), 5000)
  assert.equal(tsMillis(700), 700)
  assert.equal(tsMillis(null), 0)
  assert.equal(tsMillis(undefined), 0)
})

/* ------------------------------------------------------------------ */
/* Firestore errors — every failure must become actionable guidance    */
/* ------------------------------------------------------------------ */

test('missing rules are explained as a rules problem', () => {
  const info = describeFirestoreError({ code: 'permission-denied' })
  assert.match(info.title, /rules/i)
  assert.ok(info.steps.length >= 2, 'must tell the user what to click')
  assert.match(info.steps.join(' '), /Publish/i)
})

test('a missing database is explained as a setup problem', () => {
  const info = describeFirestoreError({ code: 'not-found' })
  assert.match(info.title, /database/i)
  assert.match(info.steps.join(' '), /Create database/i)
})

test('offline reads are reported as a connection problem', () => {
  const info = describeFirestoreError({ code: 'unavailable' })
  assert.match(info.title, /reach|connection|database/i)
})

test('an unknown code still produces a usable message', () => {
  const info = describeFirestoreError({ code: 'weird/thing', message: 'boom' })
  assert.ok(info.title)
  assert.ok(info.detail)
  assert.ok(info.steps.length > 0)
})

test('a totally unknown error object does not crash the UI', () => {
  for (const bad of [undefined, null, {}, 'nope']) {
    const info = describeFirestoreError(bad)
    assert.ok(info.title, `title missing for ${String(bad)}`)
    assert.ok(Array.isArray(info.steps))
  }
})

test('summariseError renders a one-liner for the diagnostics report', () => {
  assert.equal(summariseError({ code: 'permission-denied', message: 'nope' }), 'permission-denied — nope')
  assert.equal(summariseError(null), 'no error')
})

/* ------------------------------------------------------------------ */
/* Auth errors — the fix for "nothing happened" must stay explained    */
/* ------------------------------------------------------------------ */

test('a popup that closes with no result is described, not ignored', () => {
  const info = describeAuthError({ code: 'auth/popup-closed-by-user' })
  assert.ok(info.title)
  assert.match(info.title, /cancel|sign-in/i)
})

test('an unauthorized domain points at the Firebase setting', () => {
  const info = describeAuthError({ code: 'auth/unauthorized-domain' })
  assert.match(info.steps.join(' '), /Authorized domains/i)
})

test('a disabled Google provider tells the user where to enable it', () => {
  const info = describeAuthError({ code: 'auth/operation-not-allowed' })
  assert.match(info.steps.join(' '), /Google/i)
  assert.match(info.steps.join(' '), /enable/i)
})

test('private-mode storage blocking is explained', () => {
  const info = describeAuthError({ code: 'auth/web-storage-unsupported' })
  assert.match(info.detail, /private|storage|cookie/i)
})

test('unknown auth errors fall back to something readable', () => {
  const info = describeAuthError({ code: 'auth/brand-new-code' })
  assert.ok(info.title)
  assert.ok(info.steps.length > 0)
  const generic = describeAuthError(new Error('plain error'))
  assert.ok(generic.title)
  assert.ok(generic.detail)
})

/* ------------------------------------------------------------------ */
/* Dashboard maths — the numbers people act on                        */
/* ------------------------------------------------------------------ */

const SAMPLE = [
  { id: 'mar-pay', date: '2026-03-05', type: 'income', category: 'salary', amount: 3000 },
  { id: 'mar-rent', date: '2026-03-07', type: 'expense', category: 'rent', amount: 1200 },
  { id: 'mar-food', date: '2026-03-20', type: 'expense', category: 'food', amount: 450 },
  { id: 'feb-pay', date: '2026-02-10', type: 'income', category: 'salary', amount: 2000 },
  { id: 'feb-rent', date: '2026-02-11', type: 'expense', category: 'rent', amount: 1000 },
]

test('monthInsights totals the month and compares it with the one before', () => {
  const i = monthInsights(SAMPLE, '2026-03', '2026-02')
  assert.equal(i.income, 3000)
  assert.equal(i.expense, 1650)
  assert.equal(i.net, 1350)
  assert.equal(i.entries, 3)
  assert.equal(i.savingsRate, 45) // 1350 / 3000
  assert.equal(i.incomeChange, 50) // 2000 -> 3000
  assert.equal(i.expenseChange, 65) // 1000 -> 1650
  assert.equal(i.previous.income, 2000)
})

test('monthInsights picks the biggest expense, ignoring income and other months', () => {
  const noise = [
    { id: 'huge-income', date: '2026-03-01', type: 'income', category: 'salary', amount: 99999 },
    { id: 'undated', type: 'expense', amount: 88888 },
    { id: 'other-month', date: '2026-01-02', type: 'expense', amount: 77777 },
    { id: 'real', date: '2026-03-02', type: 'expense', category: 'food', amount: 20 },
  ]
  const i = monthInsights(noise, '2026-03')
  assert.equal(i.largestExpense.id, 'real')
  assert.equal(i.entries, 2) // the undated row and the January row are excluded
  assert.equal(i.previous, null)
  assert.equal(i.incomeChange, null) // nothing to compare against
  assert.equal(i.savingsRate, 100)
})

test('monthInsights treats spending that appeared from nothing as a rise', () => {
  const i = monthInsights([{ date: '2026-03-01', type: 'expense', amount: 30 }], '2026-03', '2026-02')
  assert.equal(i.expenseChange, 100)
  assert.equal(i.incomeChange, null) // no income either month: not a percentage
  assert.equal(i.savingsRate, null) // no income means no rate
})

test('monthInsights survives an empty ledger', () => {
  const i = monthInsights([], '2026-03', '2026-02')
  assert.equal(i.income, 0)
  assert.equal(i.expense, 0)
  assert.equal(i.net, 0)
  assert.equal(i.entries, 0)
  assert.equal(i.largestExpense, null)
  assert.equal(i.savingsRate, null)
  assert.equal(i.expenseChange, null)
})

test('the running balance walks each month net up and down', () => {
  const rows = [
    { key: '2026-01', net: 100 },
    { key: '2026-02', net: -40 },
    { key: '2026-03', net: 10 },
  ]
  assert.deepEqual(
    withRunningBalance(rows, 500).map((r) => r.running),
    [600, 560, 570],
  )
})

test('balanceBefore adds up everything older than the window', () => {
  const older = [
    { date: '2025-11-01', type: 'income', amount: 1000 },
    { date: '2025-12-01', type: 'expense', amount: 250 },
    { date: '2026-01-01', type: 'income', amount: 999 }, // inside the window
    { type: 'expense', amount: 50 }, // undated — must not be counted
  ]
  assert.equal(balanceBefore(older, '2026-01'), 750)
})

test('monthHistory describes each month of the window', () => {
  const rows = monthHistory(SAMPLE, 12, '2026-03')
  assert.equal(rows.length, 12)
  const march = rows[rows.length - 1]
  assert.equal(march.key, '2026-03')
  assert.equal(march.income, 3000)
  assert.equal(march.expense, 1650)
  assert.equal(march.entries, 3)
  assert.equal(march.topCategory, 'rent')
  assert.equal(march.topAmount, 1200)
  assert.equal(march.savingsRate, 45)
  // Oldest month first, and months with no activity are still present.
  assert.equal(rows[0].key, '2025-04')
  assert.equal(rows[0].entries, 0)
})

/* ------------------------------------------------------------------ */
/* Navigation — the phone layout must not lose a destination           */
/* ------------------------------------------------------------------ */

test('the phone tab bar and the menu together cover every destination', () => {
  const reachable = [...MOBILE_TABS, ...MORE_NAV_ITEMS].map((i) => i.key)
  assert.deepEqual(
    [...reachable].sort(),
    NAV_ITEMS.map((i) => i.key).sort(),
    'a section is unreachable on a phone',
  )
  assert.equal(new Set(reachable).size, reachable.length, 'a section is listed twice')
})

test('the phone tab bar stays at four tabs so targets stay tappable', () => {
  // Seven tabs across a 375px screen is ~47px each — under the 44px minimum.
  assert.equal(MOBILE_TABS.length, 4)
})

test('each nav entry carries the icon and label the shells render', () => {
  for (const item of NAV_ITEMS) {
    assert.equal(typeof item.key, 'string', 'key must be a string')
    assert.ok(item.label, `missing label for ${item.key}`)
    assert.ok(item.icon, `missing icon for ${item.key}`)
  }
})

test('settings is reachable from the phone menu', () => {
  assert.ok(MORE_NAV_ITEMS.some((i) => i.key === 'settings'))
})
