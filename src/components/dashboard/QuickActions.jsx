import { ArrowDownRight, ArrowUpRight, DatabaseZap, Wallet } from 'lucide-react'

/**
 * The row of round shortcuts that sits under the balance card in every banking
 * app. Four taps cover what people actually do daily: log what they spent, log
 * what they earned, tune their pay schedule, and get their data out.
 */
export default function QuickActions({ onAddExpense, onAddIncome, setView }) {
  const actions = [
    {
      key: 'expense',
      label: 'Add expense',
      icon: ArrowDownRight,
      tint: 'bg-rose-50 text-rose-600',
      onClick: onAddExpense,
    },
    {
      key: 'income',
      label: 'Add income',
      icon: ArrowUpRight,
      tint: 'bg-emerald-50 text-emerald-600',
      onClick: onAddIncome,
    },
    {
      key: 'earnings',
      label: 'My pay',
      icon: Wallet,
      tint: 'bg-indigo-50 text-indigo-600',
      onClick: () => setView('earnings'),
    },
    {
      key: 'data',
      label: 'Export',
      icon: DatabaseZap,
      tint: 'bg-amber-50 text-amber-600',
      onClick: () => setView('data'),
    },
  ]

  return (
    <div className="grid grid-cols-4 gap-2 sm:gap-3">
      {actions.map(({ key, label, icon: Icon, tint, onClick }) => (
        <button
          key={key}
          type="button"
          onClick={onClick}
          className="group flex flex-col items-center gap-2 rounded-2xl border border-slate-200/80 bg-white px-2 py-3.5
            shadow-sm shadow-slate-200/50 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md
            focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer"
        >
          <span
            className={`flex h-11 w-11 items-center justify-center rounded-full transition group-hover:scale-105 ${tint}`}
          >
            <Icon size={19} />
          </span>
          <span className="text-[11px] font-semibold leading-tight text-slate-600">{label}</span>
        </button>
      ))}
    </div>
  )
}
