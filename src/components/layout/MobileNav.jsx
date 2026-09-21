import { Plus } from 'lucide-react'
import { NAV_ITEMS } from './appNav'

/**
 * Bottom navigation used on small screens. A center "quick add"
 * button floats between the first two and last two destinations.
 */
export default function MobileNav({ view, setView, onAdd }) {
  const left = NAV_ITEMS.slice(0, 2)
  const right = NAV_ITEMS.slice(2)

  const Item = ({ item }) => {
    const active = view === item.key
    return (
      <button
        onClick={() => setView(item.key)}
        className={`flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium transition cursor-pointer
          ${active ? 'text-indigo-600' : 'text-slate-400'}`}
      >
        <item.icon size={21} strokeWidth={active ? 2.2 : 1.8} />
        {item.label}
      </button>
    )
  }

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-slate-200/80 bg-white/95 backdrop-blur pb-[env(safe-area-inset-bottom)] lg:hidden"
      aria-label="Primary"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0px)' }}
    >
      {left.map((i) => (
        <Item key={i.key} item={i} />
      ))}

      <div className="relative flex flex-1 items-center justify-center py-1">
        <button
          onClick={() => onAdd('expense')}
          aria-label="Add transaction"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 transition hover:bg-indigo-700 active:scale-95 cursor-pointer"
        >
          <Plus size={24} strokeWidth={2.4} />
        </button>
      </div>

      {right.map((i) => (
        <Item key={i.key} item={i} />
      ))}
    </nav>
  )
}
