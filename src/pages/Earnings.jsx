import { useMemo, useState } from 'react'
import {
  Wallet,
  Plus,
  CalendarClock,
  Check,
  Pencil,
  Trash2,
  Banknote,
  Clock,
  Repeat,
  CalendarDays,
  Pause,
  Play,
  AlertCircle,
} from 'lucide-react'
import { Button, Card, Pill, Spinner, EmptyState, Segmented,
  ConfirmDialog } from '../components/ui/Primitives'
import { Field, TextInput, Select } from '../components/ui/Form'
import Modal from '../components/ui/Modal'
import { useToast } from '../components/ui/Toast'
import MonthSwitch from '../components/MonthSwitch'
import BalanceHero from '../components/dashboard/BalanceHero'
import { useUser } from '../context/UserContext'
import { useIncomeSources } from '../hooks/useIncomeSources'
import { addTransaction } from '../services/transactions'
import {
  PAY_FREQUENCIES,
  PAY_DAYS_OF_MONTH,
  DAYS_PER_WEEK_OPTIONS,
  WEEKDAYS,
  frequencyMeta,
  ordinal,
  paymentDates,
  paymentsInMonth,
  monthlyProjection,
  projectedIncome,
  nextPayday,
  daysUntil,
  paymentToTransaction,
  loggedPaydays,
  blankIncomeSource,
  upcomingPayments,
} from '../utils/earnings'
import { monthTotals } from '../utils/stats'
import { thisMonthKey, todayISO, formatShortDate, shortMonthLabel } from '../utils/date'
import { formatMoney, percent } from '../utils/money'
import { CATEGORIES } from '../data/categories'

/* ------------------------------------------------------------------ */
/* Plain-language helpers                                              */
/* ------------------------------------------------------------------ */

/** "Paid on the 25th of each month" / "Every Friday" / "1st & 15th". */
function scheduleText(source) {
  const days = Array.isArray(source?.days) ? [...source.days].sort((a, b) => a - b) : []
  switch (source?.frequency) {
    case 'monthly':
      return `Paid on the ${ordinal(source.day)} of each month`
    case 'semi-monthly':
      return `Paid on the ${days.map(ordinal).join(' & ') || '1st & 15th'} of each month`
    case 'biweekly':
      return `Every other ${WEEKDAYS[source.weekday] || 'Friday'}`
    case 'weekly':
      return `Every ${WEEKDAYS[source.weekday] || 'Friday'}`
    case 'daily':
      return `${source.daysPerWeek || 5} paid days a week`
    case 'hourly':
      return `${source.hoursPerWeek || 40} hours a week`
    default:
      return 'Irregular — log it whenever it lands'
  }
}

/** The rate for daily/hourly sources, the amount itself otherwise. */
function amountText(source, currency) {
  const amount = Number(source?.amount) || 0
  if (!amount) return 'No amount set'
  if (source?.frequency === 'hourly') return `${formatMoney(amount, currency)} / hour`
  if (source?.frequency === 'daily') return `${formatMoney(amount, currency)} / day`
  return formatMoney(amount, currency)
}

/** "in 3 days" / "today" / "tomorrow" / "passed". */
function countdownText(iso) {
  const days = daysUntil(iso)
  if (days === null) return ''
  if (days === 0) return 'today'
  if (days === 1) return 'tomorrow'
  if (days === -1) return 'yesterday'
  if (days < 0) return `${Math.abs(days)} days ago`
  return `in ${days} days`
}

function frequencyOptions() {
  return PAY_FREQUENCIES.map((f) => ({ value: f.id, label: f.label }))
}

/* ------------------------------------------------------------------ */
/* Add / edit a pay source                                             */
/* ------------------------------------------------------------------ */

/**
 * The fields shown depend on the frequency: a monthly salary needs a day of
 * the month, an hourly job needs hours a week. Asking for the wrong thing is
 * what makes pay-setup screens feel broken.
 */
function SourceForm({ initial, currency, onClose, onSave }) {
  const [draft, setDraft] = useState(initial)
  const set = (patch) => setDraft((d) => ({ ...d, ...patch }))
  const freq = draft.frequency
  const amount = Number(draft.amount) || 0

  const preview = useMemo(() => {
    const perMonth = monthlyProjection(draft, thisMonthKey())
    return { perMonth, perYear: perMonth * 12 }
  }, [draft])

  const canSave = String(draft.name || '').trim().length > 0 && amount > 0

  const footer = (
    <>
      <Button variant="secondary" onClick={onClose}>
        Cancel
      </Button>
      <Button onClick={() => onSave(draft)} disabled={!canSave}>
        Save pay source
      </Button>
    </>
  )

  return (
    <Modal open onClose={onClose} title="Pay source" footer={footer}>
      <div className="space-y-4">
        <Field
          label="What is it?"
          htmlFor="src-name"
          hint="A name you'll recognise, e.g. “Warehouse job”."
        >
          <TextInput
            id="src-name"
            value={draft.name}
            placeholder="My job"
            onChange={(e) => set({ name: e.target.value })}
          />
        </Field>

        <Field label="How often are you paid?">
          <Select value={freq} onChange={(e) => set({ frequency: e.target.value })}>
            {frequencyOptions().map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
          <p className="mt-1.5 text-xs text-slate-500">{frequencyMeta(freq).hint}</p>
        </Field>

        {/* The amount label follows the frequency so it never needs translating. */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={freq === 'hourly' ? 'Rate per hour' : freq === 'daily' ? 'Rate per day' : 'Amount'}
            htmlFor="src-amount"
          >
            <TextInput
              id="src-amount"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={draft.amount === 0 ? '' : draft.amount}
              placeholder="0.00"
              onChange={(e) => set({ amount: e.target.value === '' ? 0 : Number(e.target.value) })}
            />
          </Field>

          <Field label="Money goes to" htmlFor="src-cat">
            <Select
              id="src-cat"
              value={draft.category}
              onChange={(e) => set({ category: e.target.value })}
            >
              {CATEGORIES.income.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        {freq === 'monthly' && (
          <Field label="Which day of the month?">
            <Select value={draft.day} onChange={(e) => set({ day: Number(e.target.value) })}>
              {PAY_DAYS_OF_MONTH.map((d) => (
                <option key={d} value={d}>
                  {ordinal(d)}
                </option>
              ))}
            </Select>
          </Field>
        )}

        {freq === 'semi-monthly' && (
          <div className="grid grid-cols-2 gap-4">
            <Field label="First payday">
              <Select
                value={draft.days?.[0] ?? 1}
                onChange={(e) => set({ days: [Number(e.target.value), draft.days?.[1] ?? 15] })}
              >
                {PAY_DAYS_OF_MONTH.map((d) => (
                  <option key={d} value={d}>
                    {ordinal(d)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Second payday">
              <Select
                value={draft.days?.[1] ?? 15}
                onChange={(e) => set({ days: [draft.days?.[0] ?? 1, Number(e.target.value)] })}
              >
                {PAY_DAYS_OF_MONTH.map((d) => (
                  <option key={d} value={d}>
                    {ordinal(d)}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        )}

        {(freq === 'weekly' || freq === 'biweekly') && (
          <Field
            label="Which weekday?"
            hint={freq === 'biweekly' ? 'Paid every other one of these.' : undefined}
          >
            <Select
              value={draft.weekday ?? 5}
              onChange={(e) => set({ weekday: Number(e.target.value) })}
            >
              {WEEKDAYS.map((w, i) => (
                <option key={w} value={i}>
                  {w}
                </option>
              ))}
            </Select>
          </Field>
        )}

        {freq === 'daily' && (
          <Field label="Days worked per week">
            <Select
              value={draft.daysPerWeek ?? 5}
              onChange={(e) => set({ daysPerWeek: Number(e.target.value) })}
            >
              {DAYS_PER_WEEK_OPTIONS.map((d) => (
                <option key={d} value={d}>
                  {d} day{d === 1 ? '' : 's'}
                </option>
              ))}
            </Select>
          </Field>
        )}

        {freq === 'hourly' && (
          <Field label="Hours worked per week">
            <TextInput
              type="number"
              inputMode="numeric"
              min="0"
              value={draft.hoursPerWeek ?? 40}
              onChange={(e) => set({ hoursPerWeek: Number(e.target.value) || 0 })}
            />
          </Field>
        )}

        {/* The number people actually want to sanity-check before saving. */}
        <div className="rounded-xl bg-slate-50 px-4 py-3">
          <p className="text-xs font-medium text-slate-500">Expected from this source</p>
          <p className="mt-0.5 text-sm font-semibold text-slate-800">
            {freq === 'irregular' || preview.perMonth <= 0
              ? 'Not projected — log each payment as it arrives'
              : `${formatMoney(preview.perMonth, currency)} a month · ${formatMoney(
                  preview.perYear,
                  currency,
                )} a year`}
          </p>
        </div>
      </div>
    </Modal>
  )
}

/* ------------------------------------------------------------------ */
/* Upcoming payday row                                                 */
/* ------------------------------------------------------------------ */

/**
 * One scheduled payday, with the single action people actually want:
 * "this landed — put it in my ledger".
 *
 * Once logged the button becomes a quiet "Logged" chip, which is what stops
 * the same salary being entered twice.
 */
function PaydayRow({ payment, logged, currency, onLog, busy }) {
  const days = daysUntil(payment.date)
  const soon = days >= 0 && days <= 3
  // Built from the ISO string rather than a locale format, so the day and the
  // month can never drift apart in different browsers.
  const dayOfMonth = payment.date.slice(8, 10)
  const monthShort = shortMonthLabel(payment.date.slice(0, 7))

  return (
    <li className="flex items-center gap-3 px-4 py-3 sm:px-5">
      <div
        className={`flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl text-center
          ${soon ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}
      >
        <span className="text-[10px] font-medium uppercase leading-none opacity-80">
          {monthShort}
        </span>
        <span className="text-sm font-bold leading-tight">{dayOfMonth}</span>
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-800">{payment.name || 'Pay'}</p>
        <p className="text-xs text-slate-500">
          {countdownText(payment.date)}
          <span className="mx-1.5 text-slate-300">·</span>
          {formatMoney(payment.amount, currency)}
        </p>
      </div>

      {logged ? (
        <Pill className="bg-emerald-50 text-emerald-700">
          <Check size={13} /> Logged
        </Pill>
      ) : (
        <Button
          size="sm"
          variant={soon ? 'primary' : 'secondary'}
          disabled={busy || payment.amount <= 0}
          onClick={() => onLog(payment)}
        >
          <Plus size={15} /> Log
        </Button>
      )}
    </li>
  )
}


/* ------------------------------------------------------------------ */
/* The screen                                                          */
/* ------------------------------------------------------------------ */

/**
 * "Pay & income".
 *
 * Two questions this screen answers, in order of how often they're asked:
 *   1. When do I next get paid, and how much?  → the hero + next-payday card
 *   2. That payment just landed — record it.   → the Log button per payday
 *
 * Everything else (schedules, projection vs actual) supports those two.
 */
export default function Earnings({ transactions = [], loading = false }) {
  const toast = useToast()
  const { user, currency } = useUser()
  const {
    sources,
    loading: sourcesLoading,
    addSource,
    updateSource,
    removeSource,
  } = useIncomeSources()

  const [monthKey, setMonthKey] = useState(thisMonthKey())
  const [editing, setEditing] = useState(null)
  const [busyKey, setBusyKey] = useState('')
  const [hideAmounts, setHideAmounts] = useState(false)
  const [confirmId, setConfirmId] = useState('')

  const totals = useMemo(() => monthTotals(transactions, monthKey), [transactions, monthKey])
  const projected = useMemo(() => projectedIncome(sources, monthKey), [sources, monthKey])
  const paydays = useMemo(() => upcomingPayments(sources, monthKey), [sources, monthKey])
  const loggedMap = useMemo(
    () => loggedPaydays(sources, transactions, monthKey),
    [sources, transactions, monthKey],
  )
  const next = useMemo(() => nextPayday(sources), [sources])
  const activeSources = useMemo(() => sources.filter((s) => s.active !== false), [sources])
  const hasIrregular = activeSources.some((s) => s.frequency === 'irregular')
  const progress = projected > 0 ? Math.min(100, Math.round((totals.income / projected) * 100)) : 0
  const busy = loading || sourcesLoading

  const money = (n) => (hideAmounts ? '••••••' : formatMoney(n, currency))

  async function logPayment(payment) {
    if (!user?.uid) return
    setBusyKey(`${payment.sourceId}|${payment.date}`)
    try {
      await addTransaction(user.uid, paymentToTransaction(payment))
      toast(`${payment.name || 'Pay'} added to your ledger`)
    } catch (err) {
      toast(err?.message || 'Could not save that payment', 'error')
    } finally {
      setBusyKey('')
    }
  }

  function saveSource(draft) {
    const payload = {
      ...draft,
      name: String(draft.name || '').trim(),
      amount: Number(draft.amount) || 0,
    }
    if (editing?.source?.id) {
      updateSource(editing.source.id, payload)
      toast('Pay source updated')
    } else {
      addSource(payload)
      toast('Pay source added')
    }
    setEditing(null)
  }

  function deleteSource(id) {
    removeSource(id)
    setConfirmId('')
    toast('Pay source removed', 'info')
  }


  /* A payment already in the ledger must not be logged twice — that is what
   * stops the same salary being entered again. Tolerant of a Set, a Map or a
   * plain object, so the engine can change shape without breaking this screen. */
  const loggedKey = (payment) => `${payment.sourceId}|${payment.date}`
  const isLogged = (payment) =>
    typeof loggedMap?.has === 'function'
      ? loggedMap.has(loggedKey(payment))
      : Boolean(loggedMap?.[loggedKey(payment)])

  const monthLabel = shortMonthLabel(monthKey)
  const remaining = Math.max(0, projected - totals.income)
  const openPaydays = paydays.filter((p) => !isLogged(p))
  const editingSource = editing?.source || null
  /* The source the remove-confirmation is about — the dialog names it. */
  const confirmTarget = sources.find((s) => s.id === confirmId) || null

  return (
    <>
      <div className="space-y-5 pb-2">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
              Pay &amp; income
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Set up how you get paid, then log each payday in a single tap.
            </p>
          </div>
          <Button size="sm" variant="secondary" onClick={() => setHideAmounts((v) => !v)}>
            <Banknote size={15} />
            {hideAmounts ? 'Show amounts' : 'Hide amounts'}
          </Button>
        </header>

        {/* The number this screen exists for: what has actually landed. */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 px-5 py-6 text-white shadow-lg shadow-indigo-900/20 sm:px-7 sm:py-7">
          <div
            className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/10 blur-2xl"
            aria-hidden="true"
          />
          <div className="relative">
            <p className="text-xs font-medium uppercase tracking-wide text-indigo-200">
              Received in {monthLabel}
            </p>
            <p className="mt-1.5 text-3xl font-bold tracking-tight sm:text-4xl">
              {money(totals.income)}
            </p>

            {projected > 0 && (
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-indigo-100">
                  <span>
                    {progress}% of {money(projected)} expected
                  </span>
                  <span>{remaining > 0 ? `${money(remaining)} to come` : 'Complete'}</span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/20">
                  <div
                    className="h-full rounded-full bg-white transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="mt-5 grid grid-cols-3 gap-3 border-t border-white/15 pt-4">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-indigo-200">Expected</p>
                <p className="mt-0.5 text-sm font-semibold">
                  {projected > 0 ? money(projected) : '—'}
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-indigo-200">Paydays left</p>
                <p className="mt-0.5 text-sm font-semibold">{openPaydays.length}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-indigo-200">Next pay</p>
                <p className="mt-0.5 text-sm font-semibold">
                  {next ? countdownText(next.date) : '—'}
                </p>
              </div>
            </div>
          </div>
        </section>

        {next && (
          <Card className="flex flex-wrap items-center gap-3 p-4 sm:p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <CalendarClock size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-800">
                {next.name || 'Next pay'} · {money(next.amount)}
              </p>
              <p className="text-xs text-slate-500">
                {formatShortDate(next.date)}
                <span className="mx-1.5 text-slate-300">·</span>
                {countdownText(next.date)}
              </p>
            </div>
            {isLogged(next) ? (
              <Pill className="bg-emerald-50 text-emerald-700">
                <Check size={13} /> Logged
              </Pill>
            ) : (
              <Button size="sm" disabled={!!busyKey} onClick={() => logPayment(next)}>
                <Plus size={15} /> Log it
              </Button>
            )}
          </Card>
        )}

        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-800">Scheduled paydays</h2>
            <MonthSwitch monthKey={monthKey} onChange={setMonthKey} />
          </div>

          {busy && !paydays.length ? (
            <Card className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
              <Spinner size={18} /> Loading your schedule…
            </Card>
          ) : paydays.length ? (
            <Card className="overflow-hidden">
              <ul className="divide-y divide-slate-100">
                {paydays.map((payment) => (
                  <PaydayRow
                    key={loggedKey(payment)}
                    payment={payment}
                    logged={isLogged(payment)}
                    currency={currency}
                    busy={!!busyKey}
                    onLog={logPayment}
                  />
                ))}
              </ul>
            </Card>
          ) : (
            <Card>
              <EmptyState
                icon={<CalendarDays size={24} />}
                title={sources.length ? 'Nothing scheduled this month' : 'No pay set up yet'}
                description={
                  sources.length
                    ? 'Switch month above, or add another pay source if something is missing.'
                    : 'Add your salary, a day rate or weekly wages — every payday then appears here automatically.'
                }
                action={
                  <Button size="sm" onClick={() => setEditing({ source: blankIncomeSource() })}>
                    <Plus size={15} /> Add pay source
                  </Button>
                }
              />
            </Card>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-800">Pay sources</h2>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setEditing({ source: blankIncomeSource() })}
            >
              <Plus size={15} /> Add
            </Button>
          </div>

          {sources.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {sources.map((source) => {
                const payCount = paymentsInMonth(source, monthKey)
                const share = projected > 0 ? percent(monthlyProjection(source, monthKey), projected) : 0
                return (
                  <Card
                    key={source.id}
                    className={`p-4 ${source.active === false ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                        <Wallet size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-800">
                          {source.name || 'Pay source'}
                        </p>
                        <p className="truncate text-xs text-slate-500">{scheduleText(source)}</p>
                      </div>
                      {source.active === false && (
                        <Pill className="bg-slate-100 text-slate-600">Paused</Pill>
                      )}
                    </div>

                    <div className="mt-3 flex items-end justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-lg font-bold tracking-tight text-slate-900">
                          {hideAmounts ? '••••••' : amountText(source, currency)}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {payCount.length} payment{payCount.length === 1 ? '' : 's'} in {monthLabel}
                          {share > 0 && ` · ${share}% of expected`}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() =>
                            updateSource(source.id, { active: source.active === false })
                          }
                          className="cursor-pointer rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                          aria-label={
                            source.active === false
                              ? `Resume ${source.name}`
                              : `Pause ${source.name}`
                          }
                        >
                          {source.active === false ? <Play size={16} /> : <Pause size={16} />}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditing({ source })}
                          className="cursor-pointer rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                          aria-label={`Edit ${source.name}`}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmId(source.id)}
                          className="cursor-pointer rounded-lg p-2 text-slate-500 transition hover:bg-rose-50 hover:text-rose-600"
                          aria-label={`Remove ${source.name}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          ) : (
            <Card>
              <EmptyState
                icon={<Wallet size={24} />}
                title="No pay sources yet"
                description="Salary on the 25th, a day rate, weekly wages — add each one once and it works out your expected income for every month."
                action={
                  <Button size="sm" onClick={() => setEditing({ source: blankIncomeSource() })}>
                    <Plus size={15} /> Add pay source
                  </Button>
                }
              />
            </Card>
          )}

          {hasIrregular && (
            <p className="flex items-start gap-2 text-xs text-slate-500">
              <AlertCircle size={14} className="mt-0.5 shrink-0 text-slate-400" />
              Irregular pay is never guessed. Record each payment you actually receive — it lands
              in your ledger straight away.
            </p>
          )}

          {activeSources.length > 0 && totals.income === 0 && (
            <p className="flex items-start gap-2 text-xs text-slate-500">
              <Clock size={14} className="mt-0.5 shrink-0 text-slate-400" />
              Nothing logged for {monthLabel} yet — tap Log the moment a payment arrives and your
              balance updates instantly.
            </p>
          )}
        </section>

        {editing && (
          <SourceForm
            initial={editing.source}
            currency={currency}
            onClose={() => setEditing(null)}
            onSave={saveSource}
          />
        )}

        {/* `confirmId` holds the id of the source being removed; resolve it so the
         * dialog can name what is about to be deleted. */}
        <ConfirmDialog
          open={Boolean(confirmId)}
          title="Remove this pay source?"
          description={
            confirmTarget
              ? `"${confirmTarget.name}" and its schedule will be deleted. Payments you already logged stay in your ledger.`
              : ''
          }
          confirmLabel="Remove"
          tone="danger"
          onCancel={() => setConfirmId('')}
          onConfirm={() => deleteSource(confirmId)}
        />
      </div>
    </>
  )
}



