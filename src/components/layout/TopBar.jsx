import { Brand } from './Brand'
import { NAV_ITEMS } from './appNav'

/** Slim sticky header shown on mobile only. */
export function TopBar({ view }) {
  const label = NAV_ITEMS.find((n) => n.key === view)?.label || ''
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200/70 bg-slate-50/85 px-4 py-3 backdrop-blur lg:hidden">
      <Brand compact />
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</span>
    </header>
  )
}
