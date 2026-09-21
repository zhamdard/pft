import { ChevronLeft, ChevronRight } from 'lucide-react'
import { formatMonthKey, thisMonthKey, shiftMonth } from '../utils/date'

/** Month picker with ‹ › controls. */
export default function MonthSwitch({ monthKey, onChange, className = '' }) {
  const canGoFwd = monthKey !== thisMonthKey()

  return (
    <div className={`inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm ${className}`}>
      <button
        aria-label="Previous month"
        onClick={() => onChange(shiftMonth(monthKey, -1))}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 cursor-pointer"
      >
        <ChevronLeft size={18} />
      </button>
      <span className="min-w-[9rem] select-none text-center text-sm font-semibold text-slate-800 tabular">
        {formatMonthKey(monthKey)}
      </span>
      <button
        aria-label="Next month"
        disabled={!canGoFwd}
        onClick={() => onChange(shiftMonth(monthKey, 1))}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 disabled:opacity-30 cursor-pointer"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  )
}
