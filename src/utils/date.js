/** Shared date helpers. All transaction dates are stored as "yyyy-mm-dd" (local tz). */

/** "2026-09" key for a Date or ISO string. */
export function monthKeyOf(value) {
  const d = toDate(value)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function thisMonthKey() {
  return monthKeyOf(new Date())
}

/** ISO date today as "yyyy-mm-dd". */
export function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`
}

export function toDate(value) {
  if (!value) return new Date()
  if (value instanceof Date) return value
  // "yyyy-mm-dd" → parse as local
  const parts = String(value).split('-').map(Number)
  if (parts.length === 3) return new Date(parts[0], parts[1] - 1, parts[2])
  return new Date(value)
}

/** Shift a "yyyy-MM" key by n months. */
export function shiftMonth(key, n) {
  const [y, m] = key.split('-').map(Number)
  const d = new Date(y, m - 1 + n, 1)
  return monthKeyOf(d)
}

/** "2026-09" → "September 2026" */
export function formatMonthKey(key) {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })
}

/** Short month label for charts: "Sep", "Oct", ... */
export function shortMonthLabel(key) {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m - 1, 1)
    .toLocaleDateString('en-US', { month: 'short' })
    .replace('.', '')
}

/** "2026-09-21" → "Mon, 21 Sep" (omit year if current year). */
export function formatShortDate(iso) {
  const d = toDate(iso)
  const opts = { weekday: 'short', day: 'numeric', month: 'short' }
  if (d.getFullYear() !== new Date().getFullYear()) opts.year = 'numeric'
  return d.toLocaleDateString('en-US', opts)
}
