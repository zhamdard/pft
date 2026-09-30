/**
 * Audit mock for src/hooks/useIncomeSources.js.
 *
 * Three sources covering the three shapes that render differently: a fixed
 * monthly salary, a biweekly one, and an hourly one (whose label is the longest
 * — "Per hour" style text is what breaks compact rows).
 *
 * Relative imports here resolve as if this file lived in src/hooks/, which is
 * exactly right: '../context/UserContext' picks up the mocked provider and
 * '../utils/earnings' is the real helper.
 */
import { useCallback, useState } from 'react'
import { useUser } from '../context/UserContext'
import { blankIncomeSource } from '../utils/earnings'

const EMPTY = typeof location !== 'undefined' && new URLSearchParams(location.search).get('empty') === '1'

const FIXTURES = [
  {
    id: 'src-salary',
    name: 'Northwind Trading — monthly salary',
    frequency: 'monthly',
    amount: 3400,
    day: 1,
    days: [1],
    weekday: 5,
    daysPerWeek: 5,
    hoursPerWeek: 40,
    active: true,
  },
  {
    id: 'src-side',
    name: 'Weekend consulting',
    frequency: 'biweekly',
    amount: 620,
    day: 15,
    days: [1, 15],
    weekday: 5,
    daysPerWeek: 2,
    hoursPerWeek: 8,
    active: true,
  },
  {
    id: 'src-hourly',
    name: 'Evening tutoring (hourly)',
    frequency: 'hourly',
    amount: 22.5,
    day: 1,
    days: [1],
    weekday: 2,
    daysPerWeek: 3,
    hoursPerWeek: 12,
    active: false,
  },
]

export function useIncomeSources() {
  const { updateSettings } = useUser()
  const [sources, setSources] = useState(() => (EMPTY ? [] : FIXTURES))

  const persist = useCallback(
    (next) => {
      setSources(next)
      return updateSettings({ incomeSources: next })
    },
    [updateSettings],
  )

  return {
    sources,
    loading: false,
    addSource: useCallback(
      (overrides = {}) => {
        const source = blankIncomeSource(overrides)
        persist([...sources, source])
        return source
      },
      [persist, sources],
    ),
    updateSource: useCallback(
      (id, patch) => persist(sources.map((s) => (s.id === id ? { ...s, ...patch } : s))),
      [persist, sources],
    ),
    removeSource: useCallback((id) => persist(sources.filter((s) => s.id !== id)), [persist, sources]),
    replaceAll: useCallback((next) => persist(Array.isArray(next) ? next : []), [persist]),
  }
}