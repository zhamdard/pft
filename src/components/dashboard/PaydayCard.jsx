import { useMemo } from 'react'
import { CalendarClock, ChevronRight, Plus, Repeat, TrendingUp } from 'lucide-react'
import { formatMoney } from '../../utils/money'
import { formatShortDate } from '../../utils/date'
import {
  daysUntil,
  frequencyMeta,
  nextPayday,
  projectedIncome,
  upcomingPayments,
} from '../../utils/earnings'

/** "Today", "Tomorrow", "in 6 days" — or nothing when there is no date. */
function countdown(iso) {
  const days = daysUntil(iso)
  if (days === null) return null
  if (days < 0) return 'Passed'
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  return `in ${days} days`
}

/**
 * Pay & income panel.
 *
 * This is the answer to "I don't always get paid the same way" — a monthly
 * salary, a daily wage, an hourly rate or irregular gig work all reduce to the
 * same two questions: *when* is the next payday, and *how much* should this
 * month bring in? Received-vs-expected then shows the gap at a glance.
 */
export default function PaydayCard({
  sources = [],
  monthKey,
  received = 0,
  currency = 'USD',
  hidden = false,
  setView,
}) {
  const active = useMemo(() => sources.filter((s) => s && s.active !== false), [sources])
  const expected = useMemo(() => projectedIncome(active, monthKey), [active, monthKey])
  const next = useMemo(() => nextPayday(active), [active])
  const remaining = useMemo(() => upcomingPayments(active, monthKey), [active, monthKey])

  const nextSource = next ? active.find((s) => s.id === next.sourceId) : null
  const flexibleOnly = active.length > 0 && expected === 0

  const pct = expected > 0 ? Math.min(100, Math.round((received / expected) * 100)) : 0
  const gap = expected - received

  return (
    <section className="flex h-full flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/50">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Pay &amp; income</h2>
          <p className="text-xs text-slate-400">
            {active.length === 1 ? '1 active source' : `${active.length} active sources`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setView?.('earnings')}
          className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer"
        >
          Manage <ChevronRight size={14} />
        </button>
      </div>

      {active.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-4 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500">
            <Repeat size={22} />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-800">Set up how you get paid</p>
            <p className="mt-0.5 max-w-xs text-xs text-slate-500">
              Monthly salary, a daily wage, an hourly rate or irregular gig work — add it once and
              PFT will forecast every payday for you.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setView?.('earnings')}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 cursor-pointer"
          >
            <Plus size={16} /> Add pay source
          </button>
        </div>
      ) : (
        <div className="flex flex-1 flex-col gap-4">
          {/* Next payday */}
          <div className="rounded-2xl bg-slate-50 p-3.5">
            <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <CalendarClock size={13} /> Next payday
            </p>
            {next ? (
              <>
                <div className="mt-1 flex items-baseline justify-between gap-2">
                  <p className="tabular text-lg font-bold text-slate-900">
                    {hidden ? '••••••' : formatMoney(next.amount, currency)}
                  </p>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-indigo-600 ring-1 ring-indigo-100">
                    {countdown(next.date)}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  {formatShortDate(next.date)}
                  {next.name ? ` · ${next.name}` : ''}
                  {nextSource ? ` · ${frequencyMeta(nextSource.frequency).label}` : ''}
                </p>
              </>
            ) : (
              <>
                <p className="mt-1 text-sm font-semibold text-slate-700">No fixed payday</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {flexibleOnly
                    ? 'Daily, hourly and irregular pay has no set date — log each payment as it lands.'
                    : 'Add a pay day to see it counted down here.'}
                </p>
              </>
            )}
          </div>

          {/* Expected vs received */}
          <div>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-medium text-slate-500">
                <TrendingUp size={13} /> Expected this month
              </span>
              <span className="tabular font-semibold text-slate-700">
                {hidden ? '••••••' : formatMoney(expected, currency)}
              </span>
            </div>

            {expected > 0 ? (
              <>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full transition-all ${
                      gap <= 0 ? 'bg-emerald-500' : 'bg-indigo-500'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[11px]">
                  <span className="tabular text-slate-500">
                    Received {hidden ? '•••' : formatMoney(received, currency)} ({pct}%)
                  </span>
                  <span
                    className={`tabular font-medium ${gap > 0 ? 'text-slate-500' : 'text-emerald-600'}`}
                  >
                    {gap > 0
                      ? `${hidden ? '•••' : formatMoney(gap, currency)} to go`
                      : 'Target reached'}
                  </span>
                </div>
              </>
            ) : (
              <p className="tabular text-xs text-slate-500">
                {hidden ? '•••' : formatMoney(received, currency)} logged so far this month
              </p>
            )}
          </div>

          {remaining.length > 0 && (
            <p className="mt-auto text-[11px] text-slate-400">
              {remaining.length} more {remaining.length === 1 ? 'payday' : 'paydays'} this month
              {' · '}
              {remaining
                .slice(0, 3)
                .map((p) => formatShortDate(p.date))
                .join(', ')}
            </p>
          )}
        </div>
      )}
    </section>
  )
}
