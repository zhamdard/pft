import { useEffect, useState } from 'react'
import { listenTransactions } from '../services/transactions'
import { useDataHealth } from '../context/DataHealthContext'

/**
 * Load + live-subscribe to a user's transactions.
 * Returns { loading, transactions, error } — `error` is a Firestore error
 * (rules, missing database, offline) so the UI can explain what to fix
 * instead of quietly rendering an empty list.
 */
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

