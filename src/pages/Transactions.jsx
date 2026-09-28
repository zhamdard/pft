import { useMemo, useState } from 'react'
import { Plus, Search, FilterX } from 'lucide-react'
import { Card, EmptyState, Button, Segmented } from '../components/ui/Primitives'
import { TextInput, Select } from '../components/ui/Form'
import MonthSwitch from '../components/MonthSwitch'
import { getCategory, ALL_CATEGORIES } from '../data/categories'
import { thisMonthKey, formatShortDate, formatMonthKey } from '../utils/date'
import { formatMoney } from '../utils/money'
import { useUser } from '../context/UserContext'

const TYPE_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'expense', label: 'Expenses' },
  { value: 'income', label: 'Income' },
]

function TxRow({ tx, currency, onClick }) {
  const cat = getCategory(tx.type, tx.category)
  const income = tx.type === 'income'
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 py-3 text-left group cursor-pointer"
    >
      <span
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg"
        style={{ background: `${cat.color}1f` }}
      >
        {cat.emoji}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-800">
          {tx.description || cat.label}
        </p>
        <p className="text-xs text-slate-400">{cat.label}</p>
      </div>
      <div className="text-right">
        <p className={`tabular text-sm font-bold ${income ? 'text-emerald-600' : 'text-slate-800'}`}>
          {income ? '+ ' : '− '}
          {formatMoney(tx.amount, currency)}
        </p>
        <p className="text-xs text-slate-400 group-hover:text-indigo-500">
          {formatShortDate(tx.date)}
        </p>
      </div>
    </button>
  )
}

function formatDayTotal(items, currency) {
  const net = items.reduce((s, t) => {
    const a = Number(t.amount) || 0
    return t.type === 'income' ? s + a : s - a
  }, 0)
  return (net >= 0 ? '+' : '−') + formatMoney(Math.abs(net), currency)
}

function SummaryChip({ label, value, cls }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-2.5 shadow-sm shadow-slate-200/50 sm:p-4">
      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400 sm:text-[11px]">
        {label}
      </p>
      <p className={`tabular mt-1 truncate text-[15px] font-bold leading-tight sm:text-lg ${cls}`}>
        {value}
      </p>
    </div>
  )
}

export default function Transactions({ transactions, openAdd, openEdit }) {
  const { currency } = useUser()
  const [monthKey, setMonthKey] = useState(thisMonthKey())
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')

  const filtered = useMemo(() => {
    return transactions
      .filter((t) => {
        if (monthKey && t.date) {
          const [y, m] = String(t.date).split('-')
          if (monthKey !== `${y}-${m}`) return false
        }
        return true
      })
      .filter((t) => (typeFilter === 'all' ? true : t.type === typeFilter))
      .filter((t) => (categoryFilter === 'all' ? true : t.category === categoryFilter))
      .filter((t) => {
        if (!query.trim()) return true
        const q = query.trim().toLowerCase()
        const cat = getCategory(t.type, t.category)
        return (
          (t.description || '').toLowerCase().includes(q) || cat.label.toLowerCase().includes(q)
        )
      })
      .sort((a, b) => (a.date < b.date ? 1 : -1))
  }, [transactions, monthKey, typeFilter, categoryFilter, query])

  const groups = useMemo(() => {
    const map = {}
    for (const t of filtered) {
      const key = t.date || 'unknown'
      ;(map[key] = map[key] || []).push(t)
    }
    return Object.entries(map).sort((a, b) => (a[0] < b[0] ? 1 : -1))
  }, [filtered])

  const monthTotal = useMemo(() => {
    let inc = 0
    let exp = 0
    for (const t of filtered) {
      const amt = Number(t.amount) || 0
      if (t.type === 'income') inc += amt
      else exp += amt
    }
    return { inc, exp, net: inc - exp }
  }, [filtered])

  const hasFilter = query || typeFilter !== 'all' || categoryFilter !== 'all'

  function clearFilters() {
    setQuery('')
    setTypeFilter('all')
    setCategoryFilter('all')
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Transactions</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {filtered.length} {filtered.length === 1 ? 'entry' : 'entries'} in{' '}
            {formatMonthKey(monthKey)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <MonthSwitch monthKey={monthKey} onChange={setMonthKey} />
          <Button onClick={() => openAdd('expense')} className="hidden lg:inline-flex whitespace-nowrap">
            <Plus size={18} /> Add
          </Button>
        </div>
      </div>

      {/* Month summary */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <SummaryChip label="Income" value={formatMoney(monthTotal.inc, currency)} cls="text-emerald-600" />
        <SummaryChip label="Expenses" value={formatMoney(monthTotal.exp, currency)} cls="text-rose-600" />
        <SummaryChip label="Net" value={formatMoney(monthTotal.net, currency)} cls="text-slate-800" />
      </div>

      {/* Filters */}
      <Card className="space-y-4 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex-1">
            <TextInput
              icon={<Search size={16} />}
              placeholder="Search transactions…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="sm:w-48">
            <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="all">All categories</option>
              {ALL_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.emoji} {c.label}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Segmented
            value={typeFilter}
            onChange={setTypeFilter}
            options={TYPE_FILTERS}
            className="max-w-md"
          />
          {hasFilter && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-700 cursor-pointer"
            >
              <FilterX size={14} /> Clear
            </button>
          )}
        </div>
      </Card>

      {/* List */}
      {groups.length > 0 ? (
        <Card className="px-4 py-2 sm:px-5">
          {groups.map(([date, items]) => (
            <div key={date}>
              <div className="flex items-center justify-between border-b border-slate-100 py-2.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {formatShortDate(date)}
                </span>
                <span className="tabular text-xs font-medium text-slate-400">
                  {formatDayTotal(items, currency)}
                </span>
              </div>
              <div className="divide-y divide-slate-50">
                {items.map((tx) => (
                  <TxRow key={tx.id} tx={tx} currency={currency} onClick={() => openEdit(tx)} />
                ))}
              </div>
            </div>
          ))}
        </Card>
      ) : (
        <Card>
          <EmptyState
            icon={<Search size={24} />}
            title={hasFilter ? 'No matching transactions' : 'Nothing here yet'}
            description={
              hasFilter
                ? 'Try adjusting your search or filters.'
                : 'Add an expense or income to get started.'
            }
            action={
              !hasFilter ? (
                <Button onClick={() => openAdd('expense')}>
                  <Plus size={18} /> Add transaction
                </Button>
              ) : undefined
            }
          />
        </Card>
      )}
    </div>
  )
}

