import { LogOut } from 'lucide-react'
import { NAV_ITEMS } from './appNav'
import { Brand } from './Brand'
import { useUser } from '../../context/UserContext'

export default function Sidebar({ view, setView }) {
  const { user, logOut } = useUser()

  if (!user) return null

  const displayName = user.displayName || 'Cashflow'
  const email = user.email || ''
  const initial = (displayName[0] || '?').toUpperCase()

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200/80 bg-white lg:flex">
      <div className="px-6 pb-2 pt-6">
        <Brand />
      </div>

      <nav className="mt-4 flex-1 space-y-1 px-3" aria-label="Primary">
        {NAV_ITEMS.map((item) => {
          const active = view === item.key
          return (
            <button
              key={item.key}
              onClick={() => setView(item.key)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition cursor-pointer
                ${
                  active
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
            >
              <item.icon size={18} strokeWidth={active ? 2.2 : 1.8} />
              {item.label}
            </button>
          )
        })}
      </nav>

      <div className="border-t border-slate-100 p-3">
        <div className="flex items-center gap-3 rounded-xl px-2 py-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
            {initial}
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-semibold text-slate-800">{displayName}</p>
            <p className="truncate text-xs text-slate-400">{email}</p>
          </div>
        </div>
        <button
          onClick={logOut}
          className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </aside>
  )
}
