import { CircleCheck, Info, TriangleAlert, WifiOff } from 'lucide-react'

/* ------------------------------------------------------------------ */
/* Alert                                                               */
/* ------------------------------------------------------------------ */
/* Shared notice panel. Used for setup problems, data errors and       */
/* sign-in failures so every message in the app looks and reads alike. */
/* ------------------------------------------------------------------ */

const TONES = {
  error: {
    wrap: 'border-rose-200 bg-rose-50',
    icon: 'text-rose-600',
    title: 'text-rose-900',
    body: 'text-rose-700/90',
    Icon: TriangleAlert,
  },
  warn: {
    wrap: 'border-amber-200 bg-amber-50',
    icon: 'text-amber-600',
    title: 'text-amber-900',
    body: 'text-amber-800/90',
    Icon: TriangleAlert,
  },
  info: {
    wrap: 'border-slate-200 bg-slate-50',
    icon: 'text-slate-500',
    title: 'text-slate-900',
    body: 'text-slate-600',
    Icon: Info,
  },
  offline: {
    wrap: 'border-sky-200 bg-sky-50',
    icon: 'text-sky-600',
    title: 'text-sky-900',
    body: 'text-sky-800/90',
    Icon: WifiOff,
  },
  success: {
    wrap: 'border-emerald-200 bg-emerald-50',
    icon: 'text-emerald-600',
    title: 'text-emerald-900',
    body: 'text-emerald-800/90',
    Icon: CircleCheck,
  },
}

export function Alert({
  tone = 'info',
  title,
  detail,
  steps,
  code,
  actions,
  onDismiss,
  className = '',
  children,
}) {
  const t = TONES[tone] || TONES.info
  const Icon = t.Icon

  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`rounded-2xl border p-4 ${t.wrap} ${className}`}>
      <div className="flex items-start gap-3">
        <Icon size={18} className={`mt-0.5 shrink-0 ${t.icon}`} />

        <div className="min-w-0 flex-1">
          {title && <p className={`text-sm font-semibold ${t.title}`}>{title}</p>}
          {detail && <p className={`mt-1 text-sm leading-relaxed ${t.body}`}>{detail}</p>}

          {steps?.length > 0 && (
            <ol className={`mt-3 space-y-1.5 text-sm ${t.body}`}>
              {steps.map((s, i) => (
                <li key={s} className="flex gap-2">
                  <span className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/70 text-[11px] font-bold">
                    {i + 1}
                  </span>
                  <span className="leading-relaxed">{s}</span>
                </li>
              ))}
            </ol>
          )}

          {children}

          {code && (
            <p className="mt-3 font-mono text-[11px] break-all opacity-60">
              {code}
            </p>
          )}

          {actions && <div className="mt-4 flex flex-wrap items-center gap-2">{actions}</div>}
        </div>

        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss"
            className="shrink-0 rounded-lg p-1 text-slate-400 transition hover:bg-white/60 hover:text-slate-600 cursor-pointer"
          >
            <span aria-hidden="true" className="block text-lg leading-none">
              ×
            </span>
          </button>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* CheckRow — a single line in a diagnostics checklist                 */
/* ------------------------------------------------------------------ */

const CHECK_STATES = {
  pass: { cls: 'text-emerald-600', mark: '✓' },
  warn: { cls: 'text-amber-600', mark: '!' },
  fail: { cls: 'text-rose-600', mark: '✕' },
  pending: { cls: 'text-slate-400', mark: '…' },
}

export function CheckRow({ state = 'pending', label, value }) {
  const s = CHECK_STATES[state] || CHECK_STATES.pending
  return (
    <li className="flex items-start gap-2.5 py-1.5 text-sm">
      <span
        className={`mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-[11px] font-bold shadow-sm ${s.cls}`}
        aria-hidden="true"
      >
        {s.mark}
      </span>
      <span className="min-w-0 flex-1">
        <span className="font-medium text-slate-700">{label}</span>
        {value && <span className="ml-2 break-all font-mono text-[11px] text-slate-500">{value}</span>}
      </span>
    </li>
  )
}
