import { Plus } from 'lucide-react'
import { MOBILE_TABS } from './appNav'

/**
 * Bottom navigation for phones: four destinations either side of a raised
 * "add" button — the layout Monzo, Revolut and Starling all use.
 *
 * Every destination is at least 3.5rem tall so it clears the 44px minimum tap
 * target, and the bar pads itself for the home indicator on notched iPhones
 * (`.safe-bottom`) so nothing sits under it.
 */
export default function MobileNav({ view, setView, onAdd }) {
  const left = MOBILE_TABS.slice(0, 2)
  const right = MOBILE_TABS.slice(2)

  const Item = ({ item }) => {
    const active = view === item.key
    return (
      <button
        type="button"
        onClick={() => setView(item.key)}
        aria-current={active ? 'page' : undefined}
        className={`flex min-h-[3.5rem] flex-1 flex-col items-center justify-center gap-0.5 px-1 pb-1.5 pt-2
          text-[10px] font-semibold leading-none transition cursor-pointer
          ${active ? 'text-indigo-600' : 'text-slate-400 active:text-slate-600'}`}
      >
        <item.icon size={21} strokeWidth={active ? 2.3 : 1.8} />
        <span className="mt-1 max-w-full truncate">{item.label}</span>
      </button>
    )
  }

  return (
    <nav
      className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-slate-200/80 bg-white/95 backdrop-blur lg:hidden"
      aria-label="Primary"
    >
      <div className="flex items-stretch">
        {left.map((i) => (
          <Item key={i.key} item={i} />
        ))}

        <div className="relative flex w-16 shrink-0 items-start justify-center">
          <button
            type="button"
            onClick={() => onAdd('expense')}
            aria-label="Add transaction"
            className="-mt-5 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white
              shadow-lg shadow-indigo-600/30 ring-4 ring-white transition active:scale-95 cursor-pointer"
          >
            <Plus size={26} strokeWidth={2.4} />
          </button>
        </div>

        {right.map((i) => (
          <Item key={i.key} item={i} />
        ))}
      </div>
    </nav>
  )
}
