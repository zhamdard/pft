import { useEffect, useMemo, useState } from 'react'
import { LoaderCircle, CheckCircle2 } from 'lucide-react'
import { Card, EmptyState } from '../components/ui/Primitives'
import MonthSwitch from '../components/MonthSwitch'
import { CATEGORIES } from '../data/categories'
import { thisMonthKey } from '../utils/date'
import { formatMoney, percent } from '../utils/money'
import { categoryAgg } from '../utils/stats'
import { saveBudget } from '../services/budgets'
import { useUser } from '../context/UserContext'
import { useBudgets } from '../hooks/useBudgets'
import { useToast } from '../components/ui/Toast'
import { Target } from 'lucide-react'

export default function Budgets({ transactions }) {
  const { user, currency } = useUser()
  const toast = useToast()
  const [monthKey, setMonthKey] = useState(thisMonthKey())
  const { budgets, loading } = useBudgets(user?.uid, monthKey)
  const [drafts, setDrafts] = useState({})
  const [saving, setSaving] = useState(null)

  const budgetMap = useMemo(() => {
    const m = {}
    budgets.forEach((b) => {
      if (b.amount > 0) m[b.categoryId] = b.amount
    })
    return m
  }, [budgets])

  const spentMap = useMemo(
    () => categoryAgg(transactions, 'expense', monthKey),
    [transactions, monthKey],
  )

  // Reflect fetched budgets into the input drafts.
  useEffect(() => {
    const d = {}
    CATEGORIES.expense.forEach((c) => {
      d[c.id] = budgetMap[c.id] ? String(budgetMap[c.id]) : ''
    })
    setDrafts(d)
  }, [budgets, monthKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const setDraft = (id, val) => setDrafts((d) => ({ ...d, [id]: val }))

  async function handleSave(categoryId) {
    const val = drafts[categoryId]
    const num = parseFloat(val)
    const amount = Number.isFinite(num) && num > 0 ? num : 0
    setSaving(categoryId)
    try {
      await saveBudget(user.uid, monthKey, categoryId, amount)
      toast(amount ? 'Budget set' : 'Budget removed', 'info')
    } catch (err) {
      console.error(err)
      toast('Could not save budget', 'error')
      // revert draft to last-known budget
      setDraft(categoryId, budgetMap[categoryId] ? String(budgetMap[categoryId]) : '')
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Budgets</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Set monthly limits per category to keep spending in check.
          </p>
        </div>
        <MonthSwitch monthKey={monthKey} onChange={setMonthKey} />
      </div>

      {loading && budgets.length === 0 ? (
        <Card className="p-10">
          <div className="flex justify-center text-slate-300">
            <LoaderCircle size={28} className="animate-spin" />
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {CATEGORIES.expense.map((cat) => {
            const spent = spentMap[cat.id] || 0
            const budget = budgetMap[cat.id] || 0
            const hasBudget = budget > 0
            const draft = drafts[cat.id] ?? ''
            const pct = hasBudget ? percent((spent / budget) * 100) : 0
            const over = hasBudget && spent > budget
            const near = hasBudget && !over && pct >= 80
            const bar = over ? 'bg-rose-500' : near ? 'bg-amber-500' : 'bg-indigo-500'
            return (
              <Card key={cat.id} className="p-5">
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg"
                    style={{ background: `${cat.color}1f` }}
                  >
                    {cat.emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800">{cat.label}</p>
                    <p className="text-xs text-slate-400">
                      {formatMoney(spent, currency)}
                      {hasBudget ? ` of ${formatMoney(budget, currency)}` : ' spent'}
                    </p>
                  </div>
                </div>

                <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${bar} transition-all`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-400">{currency}</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={draft}
                    onChange={(e) => setDraft(cat.id, e.target.value)}
                    onBlur={() => handleSave(cat.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') e.currentTarget.blur()
                    }}
                    placeholder="No limit"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800
                      placeholder:font-normal placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/60
                      focus:border-indigo-400 transition"
                  />
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center text-slate-300">
                    {saving === cat.id ? (
                      <LoaderCircle size={18} className="animate-spin text-indigo-500" />
                    ) : hasBudget ? (
                      <CheckCircle2 size={18} className="text-emerald-500" />
                    ) : null}
                  </span>
                </div>

                {over && (
                  <p className="mt-2 text-xs font-medium text-rose-600">
                    Over budget by {formatMoney(spent - budget, currency)}
                  </p>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {!loading && budgets.length === 0 && (
        <Card>
          <EmptyState
            icon={<Target size={24} />}
            title="No budgets set for this month"
            description="Enter a limit above a category to start tracking it."
          />
        </Card>
      )}
    </div>
  )
}

