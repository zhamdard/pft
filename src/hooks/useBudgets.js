import { useEffect, useState } from 'react'
import { listenBudgets } from '../services/budgets'
import { useDataHealth } from '../context/DataHealthContext'

/**
 * Load + live-subscribe to a user's budgets for a given month.
 * Returns { loading, budgets, error } — see useTransactions for why the
 * error is surfaced rather than swallowed.
 */
export function useBudgets(uid, monthKey) {
  const [state, setState] = useState({ loading: true, budgets: [], error: null })
  const { reportError, retryToken } = useDataHealth()

  useEffect(() => {
    if (!uid || !monthKey) {
      reportError('budgets', null)
      setState({ loading: false, budgets: [], error: null })
      return undefined
    }

    reportError('budgets', null)
    setState((s) => ({ ...s, loading: true, error: null }))

    const unsub = listenBudgets(uid, monthKey, (budgets, error) => {
      reportError('budgets', error || null)
      setState((prev) => ({
        loading: false,
        budgets: error ? prev.budgets : budgets,
        error: error || null,
      }))
    })
    return unsub
  }, [uid, monthKey, reportError, retryToken])

  return state
}
