/**
 * Data hooks for the native app.
 *
 * Mirrors the web `src/hooks/useTransactions.js` rather than importing it,
 * for the same reason as DataHealthContext: those files import `react`, and
 * mixing this app's React 19.2.3 with the web app's 19.3 produces two copies
 * of React, which throws "Invalid hook call" and renders a blank screen.
 *
 * What stays shared is the part that matters — `services/transactions.js` does
 * the actual Firestore query, mapping and error handling, and that is
 * platform-neutral. Only this thin useState/useEffect glue lives per app.
 *
 * Returns { loading, transactions, error }. `error` is a Firestore error
 * (rules, missing database, offline) so the UI can explain what to fix instead
 * of quietly rendering an empty list.
 */
import { useEffect, useState } from 'react'
import { listenTransactions } from '../../src/services/transactions'
import { useDataHealth } from './DataHealthContext'

export function useTransactions(uid) {
  const [state, setState] = useState({ loading: true, transactions: [], error: null })
  const { reportError, retryToken } = useDataHealth()

  useEffect(() => {
    if (!uid) {
      reportError('transactions', null)
      setState({ loading: false, transactions: [], error: null })
      return undefined
    }

    reportError('transactions', null)
    setState((s) => ({ ...s, loading: true, error: null }))

    const unsub = listenTransactions(uid, (transactions, error) => {
      reportError('transactions', error || null)
      setState((prev) => ({
        loading: false,
        // Keep whatever we already showed if the read failed.
        transactions: error ? prev.transactions : transactions,
        error: error || null,
      }))
    })
    return unsub
  }, [uid, reportError, retryToken])

  return state
}