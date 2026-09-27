import { useMemo, useState } from 'react'
import { ArrowRight, Plus, Sparkles, Target } from 'lucide-react'
import { Button, Card, EmptyState, Spinner } from '../components/ui/Primitives'
import BalanceHero from '../components/dashboard/BalanceHero'
import QuickActions from '../components/dashboard/QuickActions'
import HistoryStrip from '../components/dashboard/HistoryStrip'
import PaydayCard from '../components/dashboard/PaydayCard'
import StatCard from '../components/dashboard/StatCard'
import MonthSwitch from '../components/MonthSwitch'
import CashflowChart from '../components/charts/CashflowChart'
import CategoryDonut from '../components/charts/CategoryDonut'
import BudgetProgress from '../components/dashboard/BudgetProgress'
import RecentList from '../components/dashboard/RecentList'
import { allTimeTotals, cashflowSeries, categoryAgg, monthInsights } from '../utils/stats'
import { balanceBefore, monthHistory, withRunningBalance } from '../utils/history'
import { daysInMonth, projectedIncome } from '../utils/earnings'
import { formatMonthKey, shiftMonth, thisMonthKey } from '../utils/date'
import { formatMoney } from '../utils/money'
import { getCategory } from '../data/categories'
import { useUser } from '../context/UserContext'
import { useBudgets } from '../hooks/useBudgets'
import { useIncomeSources } from '../hooks/useIncomeSources'
import { useHiddenAmounts } from '../hooks/useHiddenAmounts'

/** How many months the history strip shows. */
const HISTORY_MONTHS = 12

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

/** "+12%" / "−8%" / "—" */
function signedPercent(value) {
  if (value === null || value === undefined) return '—'
  return `${value > 0 ? '+' : value < 0 ? '−' : ''}${Math.abs(value)}%`
}

export default function Dashboard({ transactions, loading, openAdd, openEdit, setView }) {
  const { user, currency } = useUser()
  const [monthKey, setMonthKey] = useState(thisMonthKey())
  const { hidden, toggle } = useHiddenAmounts()

  const { budgets } = useBudgets(user?.uid, monthKey)
  const { sources } = useIncomeSources()

  const prevKey = useMemo(() => shiftMonth(monthKey, -1), [monthKey])
  const allTime = useMemo(() => allTimeTotals(transactions), [transactions])
  const insights = useMemo(
    () => monthInsights(transactions, monthKey, prevKey),
    [transactions, monthKey, prevKey],
  )
  const series = useMemo(() => cashflowSeries(transactions, 6), [transactions])
  const expectedIncome = useMemo(() => projectedIncome(sources, monthKey), [sources, monthKey])

  /* The 12-month trail. The window is pinned to today rather than to the
   * selected month, so tapping a card highlights it instead of shuffling every
   * card sideways. The running balance opens from everything older than the
   * window, so the first visible month already shows a true balance. */
  const historyRows = useMemo(() => {
    const rows = monthHistory(transactions, HISTORY_MONTHS, thisMonthKey())
    if (!rows.length) return []
    return withRunningBalance(rows, balanceBefore(transactions, rows[0].key))
  }, [transactions])

  const expenseByCategory = useMemo(
    () => categoryAgg(transactions, 'expense', monthKey),
    [transactions, monthKey],
  )

  const donutData = useMemo(
    () =>
      Object.entries(expenseByCategory)
        .map(([id, value]) => {
          const cat = getCategory('expense', id)
          return { category: id, label: cat.label, color: cat.color, value }
        })
        .filter((d) => d.value > 0)
        .sort((a, b) => b.value - a.value),
    [expenseByCategory],
  )

  const recent = useMemo(
    () => [...transactions].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 5),
    [transactions],
  )

  // Average daily spend uses the days *so far* in the current month, so the
  // figure isn't dragged down by days that haven't happened yet.
  const daysInView = monthKey === thisMonthKey() ? new Date().getDate() : daysInMonth(monthKey)
  const averageDaily = daysInView > 0 ? insights.expense / daysInView : 0
  const biggest = insights.largestExpense
  const biggestCategory = biggest ? getCategory('expense', biggest.category) : null

  const firstName = (user?.displayName || '').split(' ')[0]
  const hasAny = transactions.length > 0

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            {greeting()}
            {firstName ? `, ${firstName}` : ''} 👋
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {hasAny
              ? `You've tracked ${transactions.length} entries so far.`
              : 'Let’s get your finances organised.'}
          </p>
        </div>
        <MonthSwitch monthKey={monthKey} onChange={setMonthKey} />
      </div>

      {/* New-user welcome banner */}
      {!hasAny && !loading && (
        <div className="flex flex-col items-start gap-4 rounded-2xl border border-indigo-100 bg-indigo-50 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white">
              <Sparkles size={20} />
            </span>
            <div>
              <p className="font-semibold text-slate-900">Welcome to PFT!</p>
              <p className="text-sm text-slate-600">
                Add your first income or expense to see your dashboard light up.
              </p>
            </div>
          </div>
          <Button onClick={() => openAdd('expense')}>
            <Plus size={18} /> Add your first entry
          </Button>
        </div>
      )}

      {/* The one number that matters — banking-style hero */}
      <BalanceHero
        balance={allTime.net}
        income={insights.income}
        expense={insights.expense}
        expected={expectedIncome}
        currency={currency}
        label="Total balance"
        periodLabel={`${formatMonthKey(monthKey)} · ${insights.entries} ${
          insights.entries === 1 ? 'entry' : 'entries'
        }`}
        savingsRate={insights.savingsRate}
        hidden={hidden}
        onToggleHidden={toggle}
        footer={
          <p className="mt-4 text-[11px] text-indigo-200/80">
            {loading
              ? 'Syncing with your Google account…'
              : `Synced to ${user?.email || 'your Google account'}`}
          </p>
        }
      />

      <QuickActions
        onAddExpense={() => openAdd('expense')}
        onAddIncome={() => openAdd('income')}
        setView={setView}
      />

      {/* Money trail + pay schedule */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Money history</h2>
              <p className="text-xs text-slate-400">
                Last {HISTORY_MONTHS} months — tap a month to jump to it
              </p>
            </div>
            <button
              onClick={() => setView('history')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer"
            >
              Full history <ArrowRight size={14} />
            </button>
          </div>
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <Spinner className="text-slate-300" size={26} />
            </div>
          ) : (
            <HistoryStrip
              rows={historyRows}
              currency={currency}
              selectedKey={monthKey}
              onSelect={setMonthKey}
              hidden={hidden}
            />
          )}
        </Card>

        <PaydayCard
          sources={sources}
          monthKey={monthKey}
          received={insights.income}
          currency={currency}
          hidden={hidden}
          setView={setView}
        />
      </div>

      {/* This month, in four numbers */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Savings rate"
          tone="saved"
          value={insights.savingsRate === null ? '—' : `${insights.savingsRate}%`}
          sub={insights.savingsRate === null ? 'no income logged yet' : 'of income kept'}
        />
        <StatCard
          label="Avg. daily spend"
          tone="expense"
          value={formatMoney(averageDaily, currency)}
          sub={`over ${daysInView} ${daysInView === 1 ? 'day' : 'days'}`}
        />
        <StatCard
          label="Biggest expense"
          tone="expense"
          value={biggest ? formatMoney(biggest.amount, currency) : '—'}
          sub={biggestCategory ? `${biggestCategory.emoji} ${biggestCategory.label}` : 'nothing yet'}
        />
        <StatCard
          label="Spending trend"
          tone={insights.expenseChange > 0 ? 'expense' : 'income'}
          value={signedPercent(insights.expenseChange)}
          sub="vs last month"
        />
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Cash flow</h2>
              <p className="text-xs text-slate-400">Income vs expenses — last 6 months</p>
            </div>
            <span className="text-xs font-medium text-slate-400">
              Saved all-time:{' '}
              <span className="font-semibold text-slate-600">{formatMoney(allTime.net, currency)}</span>
            </span>
          </div>
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Spinner className="text-slate-300" size={28} />
            </div>
          ) : series.some((s) => s.income > 0 || s.expense > 0) ? (
            <CashflowChart data={series} currency={currency} />
          ) : (
            <EmptyState
              icon={<Target size={24} />}
              title="No data yet"
              description="Add a few transactions to see your cash-flow trend."
            />
          )}
        </Card>

        <Card className="p-5">
          <h2 className="text-sm font-semibold text-slate-900">Where it goes</h2>
          <p className="mb-4 text-xs text-slate-400">Spending by category — this month</p>
          {donutData.length > 0 ? (
            <CategoryDonut data={donutData} currency={currency} />
          ) : (
            <EmptyState
              icon={<Target size={24} />}
              title="No expenses yet"
              description="Your spending breakdown will appear here."
            />
          )}
        </Card>
      </div>

      {/* Budgets + recent */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Budgets</h2>
              <p className="text-xs text-slate-400">This month</p>
            </div>
            <button
              onClick={() => setView('budgets')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer"
            >
              Manage <ArrowRight size={14} />
            </button>
          </div>
          {budgets.filter((b) => b.amount > 0).length > 0 ? (
            <BudgetProgress
              budgets={budgets}
              spentByCategory={expenseByCategory}
              currency={currency}
            />
          ) : (
            <EmptyState
              icon={<Target size={24} />}
              title="Set spending limits"
              description="Create budgets per category to stay on track."
              action={
                <Button variant="secondary" size="sm" onClick={() => setView('budgets')}>
                  Set up budgets
                </Button>
              }
            />
          )}
        </Card>

        <Card className="p-3 lg:col-span-2">
          {recent.length > 0 ? (
            <>
              <div className="flex items-center justify-between px-2 py-2">
                <h2 className="text-sm font-semibold text-slate-900">Recent transactions</h2>
                <button
                  onClick={() => setView('transactions')}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer"
                >
                  View all <ArrowRight size={14} />
                </button>
              </div>
              <RecentList transactions={recent} currency={currency} onEdit={openEdit} />
            </>
          ) : (
            <EmptyState
              icon={<Target size={24} />}
              title="No transactions yet"
              description="Use the + button to add your first expense or income."
            />
          )}
        </Card>
      </div>
    </div>
  )
}


