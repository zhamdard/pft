import { useMemo, useState } from 'react'
import { Sparkles, ArrowRight, Target } from 'lucide-react'
import { Card, EmptyState, Spinner, Button } from '../components/ui/Primitives'
import StatCard from '../components/dashboard/StatCard'
import MonthSwitch from '../components/MonthSwitch'
import CashflowChart from '../components/charts/CashflowChart'
import CategoryDonut from '../components/charts/CategoryDonut'
import BudgetProgress from '../components/dashboard/BudgetProgress'
import RecentList from '../components/dashboard/RecentList'
import { monthTotals, allTimeTotals, categoryAgg, cashflowSeries } from '../utils/stats'
import { thisMonthKey } from '../utils/date'
import { formatMoney, percent } from '../utils/money'
import { getCategory } from '../data/categories'
import { useUser } from '../context/UserContext'
import { useBudgets } from '../hooks/useBudgets'
import { Plus } from 'lucide-react'

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

export default function Dashboard({ transactions, loading, openAdd, openEdit, setView }) {
  const { user, currency } = useUser()
  const [monthKey, setMonthKey] = useState(thisMonthKey())

  const { budgets } = useBudgets(user?.uid, monthKey)

  const month = useMemo(() => monthTotals(transactions, monthKey), [transactions, monthKey])
  const allTime = useMemo(() => allTimeTotals(transactions), [transactions])
  const series = useMemo(() => cashflowSeries(transactions, 6), [transactions])

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

  const savingsRate = month.income > 0 ? percent((month.net / month.income) * 100) : null
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

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Income" tone="income" value={formatMoney(month.income, currency)} />
        <StatCard label="Expenses" tone="expense" value={formatMoney(month.expense, currency)} />
        <StatCard label="Net saved" tone="net" value={formatMoney(month.net, currency)} />
        <StatCard
          label="Savings rate"
          tone="saved"
          value={savingsRate === null ? '—' : `${savingsRate}%`}
          sub={savingsRate !== null ? 'of income this month' : undefined}
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


