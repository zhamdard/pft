import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react'

const ToastContext = createContext(null)

const STYLES = {
  success: { icon: <CheckCircle2 size={18} />, accent: 'text-emerald-600', ring: 'ring-emerald-200' },
  error: { icon: <AlertTriangle size={18} />, accent: 'text-rose-600', ring: 'ring-rose-200' },
  info: { icon: <Info size={18} />, accent: 'text-slate-600', ring: 'ring-slate-200' },
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const idRef = useRef(0)

  const dismiss = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id))
  }, [])

  const toast = useCallback(
    (message, type = 'success') => {
      const id = ++idRef.current
      setToasts((t) => [...t, { id, message, type }])
      setTimeout(() => dismiss(id), 3600)
    },
    [dismiss],
  )

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Sits above the phone's bottom nav (and its home indicator); on desktop
       * there is no nav, so it drops to the normal corner offset. The wrapper
       * ignores pointer events so it never blocks a tap underneath. */}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 px-4
          pb-[calc(5.75rem+env(safe-area-inset-bottom,0px))] lg:pb-6"
      >
        {toasts.map((t) => {
          const s = STYLES[t.type]
          return (
            <div
              key={t.id}
              role="status"
              className={`pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-lg ring-1 ${s.ring} animate-[slideUp_.2s_ease]`}
            >
              <span className={s.accent}>{s.icon}</span>
              <p className="flex-1 text-sm font-medium text-slate-700">{t.message}</p>
              <button
                onClick={() => dismiss(t.id)}
                className="text-slate-300 hover:text-slate-500 transition cursor-pointer"
                aria-label="Dismiss"
              >
                <X size={16} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
