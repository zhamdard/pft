import { useEffect } from 'react'
import { X } from 'lucide-react'

/**
 * Lightweight modal: dimmed overlay, centered panel, Escape / overlay-click
 * to close. Renders nothing when closed.
 */
export default function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' }

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center sm:items-center sm:p-4">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Phones get a full-screen sheet: the soft keyboard can't cover a
       * full-height panel the way it covers a short centred dialog, and the
       * footer buttons stay reachable. From `sm` up it becomes a dialog again. */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative flex w-full flex-col bg-white shadow-2xl
          h-dvh rounded-none sm:h-auto sm:max-h-[90dvh] sm:rounded-2xl ${widths[size]}`}
      >
        <div className="safe-top flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5 sm:py-4">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="-mr-1.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-400
              transition active:bg-slate-100 cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-5">{children}</div>

        {footer ? (
          <div className="safe-bottom flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-slate-100 px-4 py-3 sm:px-5 sm:py-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  )
}
