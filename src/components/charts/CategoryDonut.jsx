import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts'
import { formatMoney } from '../../utils/money'

function DonutTooltip({ active, payload, currency }) {
  if (!active || !payload?.length) return null
  const p = payload[0]
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="flex items-center gap-1.5 font-semibold text-slate-700">
        <span className="h-2 w-2 rounded-full" style={{ background: p.payload.color }} />
        {p.name}
      </p>
      <p className="tabular mt-1 font-semibold text-slate-800">
        {formatMoney(p.value, currency)}
      </p>
    </div>
  )
}

/**
 * Donut of expense shares by category, with a center total and a legend list.
 * `data`: [{ category, label, color, value }] sorted descending.
 */
export default function CategoryDonut({ data, currency }) {
  const total = data.reduce((s, d) => s + d.value, 0)

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
      <div className="relative h-52 w-52 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip content={<DonutTooltip currency={currency} />} />
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius="66%"
              outerRadius="92%"
              paddingAngle={2}
              strokeWidth={0}
            >
              {data.map((entry) => (
                <Cell key={entry.category || entry.label} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
            Spent
          </span>
          <span className="tabular px-2 text-center text-base font-bold text-slate-900">
            {formatMoney(total, currency)}
          </span>
        </div>
      </div>

      {data.length > 0 && (
        <ul className="w-full flex-1 space-y-1.5">
          {data.map((d) => {
            const pct = total ? Math.round((d.value / total) * 100) : 0
            return (
              <li key={d.category || d.label} className="flex items-center gap-2 text-sm">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: d.color }} />
                <span className="flex-1 truncate text-slate-600">{d.label}</span>
                <span className="tabular font-semibold text-slate-800">
                  {formatMoney(d.value, currency)}
                </span>
                <span className="tabular w-10 text-right text-xs font-medium text-slate-400">
                  {pct}%
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
