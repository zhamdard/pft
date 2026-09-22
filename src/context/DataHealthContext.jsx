import { createContext, useCallback, useContext, useMemo, useState } from 'react'

/**
 * Tracks Firestore read/write problems reported by data hooks so the shell
 * can show ONE clear explanation instead of a mysteriously empty page.
 *
 * Hooks call reportError('transactions', err) — passing null clears it.
 * `retry()` bumps a token that data hooks include in their effect deps,
 * which tears down and recreates the Firestore listeners.
 */
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
