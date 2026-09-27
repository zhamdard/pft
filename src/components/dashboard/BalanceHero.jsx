import { ArrowDownRight, ArrowUpRight, Eye, EyeOff, Sparkles } from 'lucide-react'
import { formatMoney } from '../../utils/money'

/**
 * The banking-style hero card.
 *
 * This is the one thing every popular money app gets right: the number you care
 * about, huge and unmissable, sitting on a coloured card. Everything else on the
 * dashboard is secondary to it.
 *
 * `tone` lets the card change character — indigo for the live dashboard,
 * slate for the history archive — without duplicating the layout.
 */
const TONES = {
  indigo: {
    card: 'bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-700 text-white',
    label: 'text-indigo-100',
    sub: 'text-indigo-200/90',
    chip: 'bg-white/15 text-white',
    divider: 'bg-white/15',
  },
  slate: {
    card: 'bg-gradient-to-br from-slate-800 via-slate-800 to-slate-900 text-white',
    label: 'text-slate-300',
    sub: 'text-slate-400',
    chip: 'bg-white/10 text-white',
    divider: 'bg-white/10',
  },
}

export default function BalanceHero({
  balance = 0,
  income = 0,
  expense = 0,
  expected = 0,
  currency = 'USD',
  label = 'Total balance',
  periodLabel = 'This month',
  tone = 'indigo',
  hidden = false,
  onToggleHidden,
  savingsRate = null,
  footer = null,
}) {
  const t = TONES[tone] || TONES.indigo
  const money = (n) => (hidden ? '••••••' : formatMoney(n, currency))

  return (
    <section
      className={`relative overflow-hidden rounded-3xl px-5 py-6 shadow-lg shadow-slate-900/10 sm:px-7 sm:py-7 ${t.card}`}
    >
      {/* Soft light bloom — decorative only, ignored by screen readers. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-24 h-56 w-56 rounded-full bg-white/10 blur-2xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 -left-10 h-48 w-48 rounded-full bg-white/5 blur-2xl"
      />

      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className={`text-xs font-medium uppercase tracking-wider ${t.label}`}>{label}</p>
            <button
              type="button"
              onClick={onToggleHidden}
              className="mt-1 flex items-center gap-2 text-left cursor-pointer group"
              aria-label={hidden ? 'Show amounts' : 'Hide amounts'}
            >
              <span className="text-3xl font-bold tracking-tight tabular-nums sm:text-4xl">
                {money(balance)}
              </span>
              {onToggleHidden && (
                <span className="opacity-60 transition group-hover:opacity-100">
                  {hidden ? <EyeOff size={16} /> : <Eye size={16} />}
                </span>
              )}
            </button>
          </div>

          {savingsRate !== null && savingsRate !== undefined && (
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${t.chip}`}>
              {savingsRate}% kept
            </span>
          )}
        </div>

        <div className={`my-5 h-px w-full ${t.divider}`} />

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <p className={`flex items-center gap-1 text-xs font-medium ${t.label}`}>
              <ArrowUpRight size={13} /> Money in
            </p>
            <p className="mt-0.5 text-base font-semibold tabular-nums">{money(income)}</p>
          </div>
          <div>
            <p className={`flex items-center gap-1 text-xs font-medium ${t.label}`}>
              <ArrowDownRight size={13} /> Money out
            </p>
            <p className="mt-0.5 text-base font-semibold tabular-nums">{money(expense)}</p>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <p className={`flex items-center gap-1 text-xs font-medium ${t.label}`}>
              <Sparkles size={13} /> Expected
            </p>
            <p className="mt-0.5 text-base font-semibold tabular-nums">
              {expected > 0 ? money(expected) : '—'}
            </p>
          </div>
        </div>

        <p className={`mt-4 text-xs ${t.sub}`}>{periodLabel}</p>
        {footer}
      </div>
    </section>
  )
}
