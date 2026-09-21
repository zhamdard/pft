import { formatShortDate } from '../../utils/date'
import { formatMoney } from '../../utils/money'
import { getCategory } from '../../data/categories'

export function RecentRow({ tx, currency, onClick }) {
  const cat = getCategory(tx.type, tx.category)
  const income = tx.type === 'income'
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition hover:bg-slate-50 cursor-pointer"
    >
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg"
        style={{ background: `${cat.color}1f` }}
      >
        {cat.emoji}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-800">
          {tx.description || cat.label}
        </p>
        <p className="text-xs text-slate-400">{cat.label}</p>
      </div>
      <div className="text-right">
        <p className={`tabular text-sm font-bold ${income ? 'text-emerald-600' : 'text-slate-800'}`}>
          {income ? '+' : '−'}
          {formatMoney(tx.amount, currency)}
        </p>
        <p className="text-xs text-slate-400">{formatShortDate(tx.date)}</p>
      </div>
    </button>
  )
}

export default function RecentList({ transactions, currency, onEdit }) {
  return (
    <div className="divide-y divide-slate-50">
      {transactions.map((tx) => (
        <RecentRow key={tx.id} tx={tx} currency={currency} onClick={() => onEdit(tx)} />
      ))}
    </div>
  )
}
