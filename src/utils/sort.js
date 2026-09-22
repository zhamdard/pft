/**
 * Sorting helpers for transaction lists.
 *
 * Why this exists: Firestore needs a *composite* index to sort by two
 * different fields (`date` + `createdAt`). Building an app that silently
 * breaks until someone deploys an index is a bad trade for a personal
 * finance tracker, so the query sorts by `date` only (always indexed
 * automatically) and we break ties here, in the browser.
 */

/** Normalise a Firestore Timestamp / Date / number / string to milliseconds. */
export function tsMillis(value) {
  if (!value) return 0
  if (typeof value.toMillis === 'function') return value.toMillis() // Firestore Timestamp
  if (value instanceof Date) return value.getTime()
  if (typeof value === 'number') return value
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? 0 : parsed
}

/**
 * Newest first: by "yyyy-mm-dd" date, then by the time the row was written.
 * Returns a new array; does not mutate the input.
 */
export function sortByDateDesc(items) {
  return [...items].sort((a, b) => {
    const left = a?.date || ''
    const right = b?.date || ''
    if (left !== right) return left < right ? 1 : -1
    return tsMillis(b?.createdAt) - tsMillis(a?.createdAt)
  })
}
