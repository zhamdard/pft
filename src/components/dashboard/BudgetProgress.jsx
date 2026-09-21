import { formatMoney, percent } from '../../utils/money'
import { getCategory } from '../../data/categories'

/**
 * Renders per-category monthly budget progress bars.
 * `budgets`: [{ amount, categoryId }] for the active month.
 * `spentByCategory`: { [categoryId]: amountSpent }
 */
export default function BudgetProgress({ budgets, spentByCategory, currency }) {
  const rows = budgets
    .map((b) => ({
      budget: b,
      spent: spentByCategory[b.categoryId] || 0,
      cat: getCategory('expense', b.categoryId),
    }))
    .filter((r) => r.budget.amount > 0)
    .sort((a, b) => b.spent - a.spent)

  if (rows.length === 0) return null

  return (
    <ul className="space-y-4">
      {rows.map(({ budget, spent, cat }) => {
        const pct = percent((spent / budget.amount) * 100)
        const over = spent > budget.amount
        const near = !over && pct >= 80
        const barColor = over ? 'bg-rose-500' : near ? 'bg-amber-500' : 'bg-indigo-500'
        return (
          <li key={budget.id}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 font-medium text-slate-700">
                <span>{cat.emoji}</span> {cat.label}
              </span>
              <span className="tabular text-xs text-slate-500">
                {formatMoney(spent, currency)}{' '}
                <span className="text-slate-300">/</span> {formatMoney(budget.amount, currency)}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${barColor} transition-all`}
                style={{ width: `${Math.min(pct, 100)}%` }}
              />
            </div>
            {over && (
              <p className="mt-1 text-xs font-medium text-rose-600">
                Over by {formatMoney(spent - budget.amount, currency)}
              </p>
            )}
          </li>
        )
      })}
    </ul>
  )
}
