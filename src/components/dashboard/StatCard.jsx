import { ArrowDownRight, ArrowUpRight, Wallet, PiggyBank } from 'lucide-react'

const TONES = {
  income: { icon: ArrowUpRight, chip: 'bg-emerald-50 text-emerald-600' },
  expense: { icon: ArrowDownRight, chip: 'bg-rose-50 text-rose-600' },
  net: { icon: Wallet, chip: 'bg-indigo-50 text-indigo-600' },
  saved: { icon: PiggyBank, chip: 'bg-amber-50 text-amber-600' },
}

export default function StatCard({ label, value, sub, tone = 'net' }) {
  const T = TONES[tone] || TONES.net
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-200/50 sm:p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${T.chip}`}>
          <T.icon size={16} />
        </span>
      </div>
      <p className="tabular mt-2 truncate text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
        {value}
      </p>
      {sub ? <p className="mt-1 text-xs font-medium text-slate-400">{sub}</p> : null}
    </div>
  )
}

