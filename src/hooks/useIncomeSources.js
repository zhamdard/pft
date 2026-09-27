import { useCallback, useMemo } from 'react'
import { useUser } from '../context/UserContext'
import { blankIncomeSource } from '../utils/earnings'

/**
 * Pay sources ("My job — monthly on the 25th", "Freelance — irregular").
 *
 * They live inside the user's settings document (`settings.incomeSources`),
 * which means they sync through the same Google account as the transactions:
 * set your pay schedule up on the phone, and it's already there on the laptop.
 *
 * The whole array is written back on every change — it's a handful of small
 * objects, and a single atomic write keeps the list impossible to corrupt.
 */
export function useIncomeSources() {
  const { settings, settingsLoading, updateSettings } = useUser()

  const sources = useMemo(
    () => (Array.isArray(settings?.incomeSources) ? settings.incomeSources : []),
    [settings],
  )

  const persist = useCallback((next) => updateSettings({ incomeSources: next }), [updateSettings])

  const addSource = useCallback(
    (overrides = {}) => {
      const source = blankIncomeSource(overrides)
      persist([...sources, source])
      return source
    },
    [persist, sources],
  )

  const updateSource = useCallback(
    (id, patch) => {
      persist(sources.map((s) => (s.id === id ? { ...s, ...patch } : s)))
    },
    [persist, sources],
  )

  const removeSource = useCallback(
    (id) => {
      persist(sources.filter((s) => s.id !== id))
    },
    [persist, sources],
  )

  const replaceAll = useCallback((next) => persist(Array.isArray(next) ? next : []), [persist])

  return {
    sources,
    loading: settingsLoading,
    addSource,
    updateSource,
    removeSource,
    replaceAll,
  }
}
