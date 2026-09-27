import { useEffect, useMemo, useRef, useState } from 'react'
import {
  History as HistoryIcon,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowRight,
  Wallet,
  Trophy,
  AlertTriangle,
  ChevronDown,
} from 'lucide-react'
import { Card, Pill, Button, EmptyState, Spinner } from '../components/ui/Primitives'
import BalanceHero from '../components/dashboard/BalanceHero'
import {
  monthHistory,
  withRunningBalance,
  balanceBefore,
  historyTotals,
  changePercent,
  biggestTransactions,
} from '../utils/history'
import { thisMonthKey, formatMonthKey, shiftMonth, shortMonthLabel } from '../utils/date'
import { formatMoney } from '../utils/money'
import { categoryAgg } from '../utils/stats'
import { getCategory } from '../data/categories'
import { useUser } from '../context/UserContext'

const RANGES = [
  { id: 6, label: '6 months' },
  { id: 12, label: '12 months' },
  { id: 24, label: '24 months' },
]

/**
 * Counts a number up/down whenever it changes.
 *
 * The history screen swaps the headline balance as you scroll, and a hard
 * jump reads as a glitch while a short count reads as "that number moved".
 * Respects `prefers-reduced-motion` because for some people movement is
 * genuinely unpleasant.
 */
function useCountUp(target, duration = 420) {
  const [value, setValue] = useState(target)
  const fromRef = useRef(target)

  useEffect(() => {
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce || !Number.isFinite(target)) {
      setValue(target)
      fromRef.current = target
      return undefined
    }

    const from = fromRef.current
    const delta = target - from
    if (delta === 0) return undefined

    let frame = 0
    const started = performance.now()
    const tick = (now) => {
      const t = Math.min(1, (now - started) / duration)
      // easeOutCubic — fast start, soft landing
      const eased = 1 - (1 - t) ** 3
      setValue(from + delta * eased)
      if (t < 1) frame = requestAnimationFrame(tick)
      else fromRef.current = target
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, duration])

  return value
}

function Delta({ value }) {
  if (value === null || value === undefined) {
    return (
      <Pill className="bg-slate-100 text-slate-500">
        <Minus size={12} /> new
      </Pill>
    )
  }
  const up = value >= 0
  return (
    <Pill className={up ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}>
      {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
      {up ? '+' : ''}
      {value}%
    </Pill>
  )
}

/** Two proportional bars (in / out) scaled against the window's peak. */
function Bar({ value, peak, tone }) {
  const pct = peak > 0 ? Math.max(2, Math.round((value / peak) * 100)) : 0
  const color = tone === 'in' ? 'bg-emerald-500' : 'bg-rose-500'
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

/** Where a month key sits in the window (-1 when it isn't in range). */
function activeRowIndex(rows, key) {
  return rows.findIndex((r) => r.key === key)
}

/**
 * One month's spending, biggest category first.
 *
 * The history list is a summary, so tapping a month has to actually explain
 * it — otherwise "£420 out" is a number with no story behind it.
 */
function categoryRows(transactions, monthKey) {
  return categoryAgg(transactions, 'expense', monthKey)
    .filter((row) => row.total > 0)
    .slice(0, 5)
}

export default function History({ transactions, loading, setView, openAdd }) {
  const { currency } = useUser()
  const [range, setRange] = useState(12)
  const [active, setActive] = useState(null)
  const [openKey, setOpenKey] = useState(null)

  /* Oldest → newest, each row carrying the running balance. */
  const rows = useMemo(() => {
    const base = monthHistory(transactions, range)
    return withRunningBalance(base, balanceBefore(transactions, base[0].key))
  }, [transactions, range])

  const totals = useMemo(() => historyTotals(rows), [rows])
  const peak = useMemo(() => rows.reduce((max, r) => Math.max(max, r.income, r.expense), 0), [rows])
  const biggest = useMemo(() => biggestTransactions(transactions, 'expense', 6), [transactions])

  const hasAny = transactions.length > 0
  const windowStart = rows[0]?.key

  // Start on the newest month with activity, so the hero shows today's balance.
  useEffect(() => {
    const lastWithData = [...rows].reverse().find((r) => r.entries > 0)
    setActive(lastWithData ? lastWithData.key : rows[rows.length - 1]?.key)
  }, [rows])

  /*
   * Scroll spy.
   *
   * The headline balance follows whichever month sits near the top of the
   * screen — that motion is what makes a history screen feel alive. The
   * listener is passive and rAF-throttled so it never costs a frame on a
   * mid-range phone.
   */
  const rowRefs = useRef(new Map())
  const rafRef = useRef(0)

  useEffect(() => {
    const onScroll = () => {
      if (rafRef.current) return
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = 0
        const focusY = 210
        let best = null
        let bestDist = Infinity
        rowRefs.current.forEach((el, key) => {
          if (!el) return
          const dist = Math.abs(el.getBoundingClientRect().top - focusY)
          if (dist < bestDist) {
            bestDist = dist
            best = key
          }
        })
        if (best) setActive((prev) => (prev === best ? prev : best))
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [rows])

  const activeIndex = activeRowIndex(rows, active)
  const activeRow = activeIndex >= 0 ? rows[activeIndex] : rows[rows.length - 1] || null
  const displayBalance = useCountUp(activeRow?.running ?? 0)
  const monthDelta = activeRow ? changePercent(activeRow.net, rows[activeIndex - 1]?.net ?? null) : null

  if (loading && !hasAny) {
    return (
      <div className="flex h-72 items-center justify-center">
        <Spinner className="text-slate-300" size={28} />
      </div>
    )
  }

  if (!hasAny) {
    return (
      <Card>
        <EmptyState
          icon={<HistoryIcon size={24} />}
          title="No history yet"
          description="Log a few payments and expenses and this screen becomes your month-by-month story — what came in, what went out, and where it went."
          action={<Button onClick={() => openAdd('expense')}>Add your first entry</Button>}
        />
      </Card>
    )
  }

  const filled = rows.filter((r) => r.entries > 0)
  const bestMonth = filled.reduce((a, b) => (b.net > a.net ? b : a), filled[0] || rows[0])
  const worstMonth = filled.reduce((a, b) => (b.net < a.net ? b : a), filled[0] || rows[0])
  const averageNet = Math.round(totals.net / Math.max(1, filled.length))
  const isCurrentMonth = activeRow?.key === thisMonthKey()
  const windowStartKey = shiftMonth(thisMonthKey(), -(range - 1))
  const rate =
    activeRow && activeRow.income > 0 ? Math.round((activeRow.net / activeRow.income) * 100) : null

  return (
    <div className="space-y-5">
      {/* Sticky, so the balance keeps answering "where am I?" while you scroll. */}
      <div className="sticky top-2 z-20">
        <BalanceHero
          tone="slate"
          label={activeRow ? formatMonthKey(activeRow.key) : 'Balance'}
          balance={displayBalance}
          income={activeRow?.income ?? 0}
          expense={activeRow?.expense ?? 0}
          currency={currency}
          savingsRate={rate}
          periodLabel={
            isCurrentMonth
              ? 'Balance up to this month — still in progress'
              : `Closing balance at the end of ${activeRow ? formatMonthKey(activeRow.key) : 'the month'}`
          }
          footer={
            <div className="mt-3 flex items-center gap-2">
              <Delta value={monthDelta} />
              <span className="text-xs text-slate-400">
                vs {activeIndex > 0 ? formatMonthKey(rows[activeIndex - 1].key) : 'no earlier month'}
              </span>
            </div>
          }
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-xl bg-slate-100 p-1">
          {RANGES.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRange(r.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                range === r.id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-500">
          {formatMonthKey(windowStartKey)} → {formatMonthKey(thisMonthKey())}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="p-4">
          <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <Wallet size={13} /> Money in
          </p>
          <p className="mt-1 text-lg font-bold tabular-nums text-emerald-600">
            {formatMoney(totals.income, currency)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <ArrowRight size={13} /> Money out
          </p>
          <p className="mt-1 text-lg font-bold tabular-nums text-rose-600">
            {formatMoney(totals.expense, currency)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <Trophy size={13} /> Best month
          </p>
          <p className="mt-1 text-lg font-bold tabular-nums text-slate-800">
            {formatMoney(bestMonth?.net ?? 0, currency)}
          </p>
          <p className="text-[11px] text-slate-400">
            {bestMonth ? shortMonthLabel(bestMonth.key) : '—'} · avg {formatMoney(averageNet, currency)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <AlertTriangle size={13} /> Toughest month
          </p>
          <p className="mt-1 text-lg font-bold tabular-nums text-slate-800">
            {formatMoney(worstMonth?.net ?? 0, currency)}
          </p>
          <p className="text-[11px] text-slate-400">{worstMonth ? shortMonthLabel(worstMonth.key) : '—'}</p>
        </Card>
      </div>
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3 sm:px-5">
          <h2 className="text-sm font-semibold text-slate-800">Month by month</h2>
          <p className="hidden text-xs text-slate-400 sm:block">Tap a month for the breakdown</p>
        </div>

        <div className="divide-y divide-slate-100">
          {[...rows].reverse().map((row) => {
            const expanded = openKey === row.key
            const isActive = activeRow?.key === row.key
            const delta = changePercent(row.net, rows[activeRowIndex(rows, row.key) - 1]?.net ?? null)

            return (
              <div
                key={row.key}
                ref={(el) => {
                  if (el) rowRefs.current.set(row.key, el)
                  else rowRefs.current.delete(row.key)
                }}
                className={`transition-colors ${isActive ? 'bg-indigo-50/40' : ''}`}
              >
                <button
                  type="button"
                  onClick={() => setOpenKey(expanded ? null : row.key)}
                  aria-expanded={expanded}
                  className="flex w-full items-center gap-3 px-4 py-3.5 text-left cursor-pointer hover:bg-slate-50 sm:px-5"
                >
                  <div className="w-14 shrink-0">
                    <p className="text-sm font-semibold text-slate-800">{shortMonthLabel(row.key)}</p>
                    <p className="text-[11px] text-slate-400">
                      {row.entries} {row.entries === 1 ? 'entry' : 'entries'}
                    </p>
                  </div>

                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-sm tabular-nums">
                      <span className="font-semibold text-emerald-600">
                        +{formatMoney(row.income, currency)}
                      </span>
                      <span className="font-semibold text-rose-600">
                        −{formatMoney(row.expense, currency)}
                      </span>
                    </div>
                    <Bar value={row.income} peak={peak} tone="in" />
                    <Bar value={row.expense} peak={peak} tone="out" />
                  </div>

                  <div className="hidden w-32 shrink-0 text-right sm:block">
                    <p
                      className={`text-sm font-semibold tabular-nums ${
                        row.net >= 0 ? 'text-slate-800' : 'text-rose-600'
                      }`}
                    >
                      {row.net >= 0 ? '+' : '−'}
                      {formatMoney(Math.abs(row.net), currency)}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      balance {formatMoney(row.running ?? 0, currency)}
                    </p>
                  </div>

                  <div className="flex w-14 shrink-0 flex-col items-end gap-1">
                    <Delta value={delta} />
                    <ChevronDown
                      size={15}
                      className={`text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
                    />
                  </div>
                </button>

                {expanded && (
                  <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-3 sm:px-5">
                    {categoryRows(transactions, row.key).length === 0 ? (
                      <p className="text-xs text-slate-500">Nothing was spent this month.</p>
                    ) : (
                      <ul className="space-y-2">
                        {categoryRows(transactions, row.key).map((c) => {
                          const cat = getCategory('expense', c.id)
                          const share = row.expense > 0 ? Math.round((c.total / row.expense) * 100) : 0
                          return (
                            <li key={c.id} className="flex items-center gap-3">
                              <span
                                aria-hidden="true"
                                className="h-2.5 w-2.5 shrink-0 rounded-full"
                                style={{ background: cat?.color || '#94a3b8' }}
                              />
                              <span className="w-28 shrink-0 truncate text-xs font-medium text-slate-700">
                                {cat?.label || c.id}
                              </span>
                              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
                                <span
                                  className="block h-full rounded-full bg-slate-500"
                                  style={{ width: `${Math.max(3, share)}%` }}
                                />
                              </span>
                              <span className="w-20 shrink-0 text-right text-xs font-semibold tabular-nums text-slate-700">
                                {formatMoney(c.total, currency)}
                              </span>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setView && setView('transactions')}
                      >
                        See every entry <ArrowRight size={14} />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openAdd('expense')}>
                        Add to {shortMonthLabel(row.key)}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </Card>
      {/* Money in vs money out, at a glance — the three numbers that decide
          whether a month went well. Reuses the same bar language as the rows
          above so the eye doesn't have to relearn anything. */}
      <Card className="p-5">
        <h2 className="text-sm font-semibold text-slate-900">Where the money went</h2>
        <p className="mb-4 text-xs text-slate-400">
          Last {range} months · {filled.length} with activity
        </p>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <TrendingUp size={13} className="text-emerald-600" /> Best month
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-800">
              {formatMonthKey(bestMonth.key)}
            </p>
            <p className="text-xs text-emerald-600">
              +{formatMoney(Math.max(0, bestMonth.net), currency)} kept
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <AlertTriangle size={13} className="text-amber-500" /> Toughest month
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-800">
              {formatMonthKey(worstMonth.key)}
            </p>
            <p className="text-xs text-rose-600">
              {formatMoney(worstMonth.expense, currency)} out
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <Wallet size={13} className="text-indigo-500" /> Monthly average
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-800">
              {averageNet >= 0 ? '+' : '−'}
              {formatMoney(Math.abs(averageNet), currency)}
            </p>
            <p className="text-xs text-slate-400">net per active month</p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="font-medium text-slate-600">Money in</span>
              <span className="font-semibold tabular-nums text-slate-800">
                {formatMoney(totals.income, currency)}
              </span>
            </div>
            <Bar value={totals.income} peak={peak} tone="in" />
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="font-medium text-slate-600">Money out</span>
              <span className="font-semibold tabular-nums text-slate-800">
                {formatMoney(totals.expense, currency)}
              </span>
            </div>
            <Bar value={totals.expense} peak={peak} tone="out" />
          </div>
        </div>
      </Card>

      {/* The single entries that moved the needle most — a month total never
          explains itself, so the outliers are listed next to it. */}
      <Card className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <Trophy size={16} />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Biggest expenses</h2>
            <p className="text-xs text-slate-400">Your largest single payments on record</p>
          </div>
        </div>

        {biggest.length === 0 ? (
          <p className="text-xs text-slate-500">No expenses recorded yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {biggest.map((t) => {
              const cat = getCategory('expense', t.category)
              const monthKey = String(t.date || '').slice(0, 7)
              return (
                <li key={t.id || `${t.date}-${t.amount}`} className="flex items-center gap-3 py-2.5">
                  <span
                    aria-hidden="true"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[10px] font-bold uppercase"
                    style={{
                      background: `${cat?.color || '#94a3b8'}1f`,
                      color: cat?.color || '#64748b',
                    }}
                  >
                    {monthKey ? shortMonthLabel(monthKey).slice(0, 3) : '—'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">
                      {t.description || cat?.label || 'Expense'}
                    </p>
                    <p className="truncate text-xs text-slate-400">
                      {cat?.label || t.category} · {monthKey ? formatMonthKey(monthKey) : t.date}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold tabular-nums text-slate-800">
                    {formatMoney(t.amount, currency)}
                  </p>
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </div>
  )
}



