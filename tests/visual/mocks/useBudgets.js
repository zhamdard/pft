/**
 * Audit mock for src/hooks/useBudgets.js.
 *
 * Mirrors the shape the real Firestore listeners emit: { id, categoryId,
 * monthKey, amount }. Having budgets set means the dashboard renders its
 * BudgetProgress list and the budgets page renders progress bars — both of
 * which are layout-sensitive on a phone.
 */
import { useMemo } from 'react'

const EMPTY = typeof location !== 'undefined' && new URLSearchParams(location.search).get('empty') === '1'

/** categoryId → monthly limit. Deliberately includes an over-budget row. */
const LIMITS = {
  housing: 1500,
  groceries: 400,
  food: 200,
  transport: 300,
  utilities: 180,
  health: 120,
  fun: 90,
  shopping: 150,
  travel: 250,
}

export function useBudgets(uid, monthKey) {
  const budgets = useMemo(() => {
    if (EMPTY || !monthKey) return []
    return Object.entries(LIMITS).map(([categoryId, amount]) => ({
      id: `${categoryId}_${monthKey}`,
      categoryId,
      monthKey,
      amount,
    }))
  }, [monthKey])

  return { loading: false, budgets, error: null }
}

export function useAllBudgets() {
  const budgets = useMemo(() => (EMPTY ? [] : Object.keys(LIMITS)), [])
  return { loading: false, budgets }
}