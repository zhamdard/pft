import { useEffect, useState } from 'react'
import { listenTransactions } from '../services/transactions'

/** Load + live-subscribe to a user's transactions. */
export function useTransactions(uid) {
  const [state, setState] = useState({ loading: true, transactions: [] })

  useEffect(() => {
    if (!uid) {
      setState({ loading: false, transactions: [] })
      return undefined
    }
    setState((s) => ({ ...s, loading: true }))
    const unsub = listenTransactions(uid, (transactions) => {
      setState({ loading: false, transactions })
    })
    return unsub
  }, [uid])

  return state
}
