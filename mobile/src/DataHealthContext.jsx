/**
 * Data health for the native app.
 *
 * This mirrors the web `src/context/DataHealthContext.jsx` rather than
 * importing it. The two are byte-for-byte the same behaviour, and the reason
 * is not laziness: that file imports `react`, and this app's React (19.2.3)
 * must not be mixed with the web app's (19.3) — two copies of React is what
 * makes every hook call throw "Invalid hook call" and the screen go blank.
 *
 * The boundary is deliberate and documented in mobile/README.md: hooks and
 * context are React-bound UI glue and live here; everything platform-neutral
 * (services, utils, categories) stays shared with the web app.
 *
 * Tracks read/write problems reported by data hooks so the shell can show ONE
 * clear explanation instead of a mysteriously empty page.
 */
import { createContext, useCallback, useContext, useMemo, useState } from 'react'

const DataHealthContext = createContext(null)

const noop = () => {}

const EMPTY = {
  errors: {},
  errorList: [],
  reportError: noop,
  retry: noop,
  retryToken: 0,
}

export function DataHealthProvider({ children }) {
  const [errors, setErrors] = useState({})
  const [retryToken, setRetryToken] = useState(0)

  const reportError = useCallback((scope, error) => {
    setErrors((prev) => {
      const current = prev[scope] || null
      const sameCode = (current?.code ?? null) === (error?.code ?? null)
      const sameMessage = (current?.message ?? null) === (error?.message ?? null)
      if (sameCode && sameMessage) return prev // no change → no re-render loop

      const next = { ...prev }
      if (error) next[scope] = error
      else delete next[scope]
      return next
    })
  }, [])

  const retry = useCallback(() => setRetryToken((n) => n + 1), [])

  const value = useMemo(
    () => ({
      errors,
      errorList: Object.entries(errors).map(([scope, error]) => ({ scope, error })),
      reportError,
      retry,
      retryToken,
    }),
    [errors, reportError, retry, retryToken],
  )

  return <DataHealthContext.Provider value={value}>{children}</DataHealthContext.Provider>
}

/** Safe to call from any component — returns no-ops outside the provider. */
export function useDataHealth() {
  return useContext(DataHealthContext) || EMPTY
}