import { Wallet } from 'lucide-react'
import { NAV_ITEMS } from './appNav'

export function Brand({ compact = false }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-600/30">
        <Wallet size={18} strokeWidth={2.2} />
      </span>
      {!compact && (
        <div className="leading-tight">
          <p className="text-[15px] font-extrabold tracking-tight text-slate-900">PFT</p>
          <p className="text-[11px] font-medium text-slate-400">Finance Tracker</p>
        </div>
      )}
    </div>
  )
}
