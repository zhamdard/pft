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
