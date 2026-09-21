import { useEffect, useState } from 'react'
import { listenBudgets } from '../services/budgets'

/** Load + live-subscribe to a user's budgets for a given month. */
export function useBudgets(uid, monthKey) {
  const [state, setState] = useState({ loading: true, budgets: [] })

  useEffect(() => {
    if (!uid || !monthKey) {
      setState({ loading: false, budgets: [] })
      return undefined
    }
    setState((s) => ({ ...s, loading: true }))
    const unsub = listenBudgets(uid, monthKey, (budgets) => {
      setState({ loading: false, budgets })
    })
    return unsub
  }, [uid, monthKey])

  return state
}
