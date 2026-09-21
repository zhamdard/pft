import { Plus } from 'lucide-react'

/** Large floating action button for quick entry on mobile. */
export default function FloatingAdd({ onClick, className = '' }) {
  return (
    <button
      onClick={onClick}
      aria-label="Add transaction"
      className={`fixed bottom-28 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white
        shadow-lg shadow-indigo-600/40 transition hover:bg-indigo-700 active:scale-95 lg:hidden ${className}`}
    >
      <Plus size={26} strokeWidth={2.4} />
    </button>
  )
}
