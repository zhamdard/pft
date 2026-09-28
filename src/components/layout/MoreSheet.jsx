import { LogOut } from 'lucide-react'
import Modal from '../ui/Modal'
import { useUser } from '../../context/UserContext'

/**
 * The phone "everything else" sheet, opened from the header menu.
 *
 * Holds the sections the bottom bar doesn't, plus who you're signed in as and
 * the sign-out button — which previously was only reachable by tapping the
 * seventh, squashed icon in a seven-item bottom bar.
 */
export default function MoreSheet({ open, onClose, view, setView, items }) {
  const { user, logOut } = useUser()

  const displayName = user?.displayName || 'Signed in'
  const email = user?.email || ''
  const initial = (displayName[0] || '?').toUpperCase()

  const go = (key) => {
    setView(key)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Menu" size="sm">
      <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
          {initial}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-800">{displayName}</p>
          <p className="truncate text-xs text-slate-400">{email}</p>
        </div>
      </div>

      <nav className="mt-3 space-y-1" aria-label="More sections">
        {items.map((item) => {
          const active = view === item.key
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => go(item.key)}
              aria-current={active ? 'page' : undefined}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold
                transition cursor-pointer ${
                  active ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 active:bg-slate-100'
                }`}
            >
              <item.icon size={19} strokeWidth={active ? 2.2 : 1.8} />
              {item.label}
            </button>
          )
        })}
      </nav>

      <button
        type="button"
        onClick={() => {
          onClose()
          logOut()
        }}
        className="mt-3 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-rose-600
          transition active:bg-rose-50 cursor-pointer"
      >
        <LogOut size={19} />
        Sign out
      </button>
    </Modal>
  )
}
