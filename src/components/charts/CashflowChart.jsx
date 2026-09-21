import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import { compactMoney, formatMoney } from '../../utils/money'

function ChartTooltip({ active, payload, label, currency }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="mb-1.5 font-semibold text-slate-700">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-6 py-0.5">
          <span className="flex items-center gap-1.5 text-slate-500">
            <span className="h-2 w-2 rounded-full" style={{ background: p.fill || p.color }} />
            {p.name}
          </span>
          <span className="tabular font-semibold text-slate-800">
            {formatMoney(p.value, currency)}
          </span>
        </div>
      ))}
    </div>
  )
}

/** Grouped column chart: income vs expenses across the last 6 months. */
export default function CashflowChart({ data, currency }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barSize={16}>
          <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#eef2f7" />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tickMargin={10}
            tick={{ fontSize: 12, fill: '#94a3b8' }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            width={46}
            tickFormatter={(v) => compactMoney(v, currency)}
            tick={{ fontSize: 11, fill: '#94a3b8' }}
          />
          <Tooltip
            content={<ChartTooltip currency={currency} />}
            cursor={{ fill: 'rgba(148,163,184,0.08)' }}
          />
          <Bar dataKey="income" name="Income" fill="#10b981" radius={[6, 6, 0, 0]} />
          <Bar dataKey="expense" name="Expense" fill="#f43f5e" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
