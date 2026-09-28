import { Menu } from 'lucide-react'
import { Brand } from './Brand'
import { NAV_ITEMS } from './appNav'

/**
 * Slim sticky header, mobile only.
 *
 * Carries the section name and the menu button. The menu matters: the bottom
 * bar deliberately holds only four tabs, so Budgets, Data studio and Settings —
 * plus signing out — live here, reachable one-handed.
 */
export function TopBar({ view, onMenu }) {
  const label = NAV_ITEMS.find((n) => n.key === view)?.label || ''

  return (
    <header className="safe-top sticky top-0 z-20 border-b border-slate-200/70 bg-slate-50/85 backdrop-blur lg:hidden">
      <div className="flex items-center gap-2 px-4 py-2">
        <Brand compact />
        <span className="ml-auto truncate text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          {label}
        </span>
        <button
          type="button"
          onClick={onMenu}
          aria-label="Open menu"
          className="-mr-1.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-500
            transition active:bg-slate-200/70 cursor-pointer"
        >
          <Menu size={20} />
        </button>
      </div>
    </header>
  )
}
