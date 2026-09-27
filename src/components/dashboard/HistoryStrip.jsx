import { useEffect, useRef } from 'react'
import { formatMoney } from '../../utils/money'

/**
 * The twelve-month money trail, Monzo-style.
 *
 * Each card is one month with its net movement and the running balance after
 * it, so scrolling left→right literally walks the balance up and down. Tapping
 * a card jumps the whole dashboard to that month.
 *
 * The selected month is scrolled into view (centred) whenever it changes, which
 * is what makes the strip feel like it follows you rather than you chasing it.
 */
export default function HistoryStrip({ rows, currency, selectedKey, onSelect, hidden = false }) {
  const scroller = useRef(null)
  const activeRef = useRef(null)

  // Scale the bars against the largest movement in the window, so a quiet month
  // next to a big one still shows a visible sliver rather than nothing.
  const peak = Math.max(1, ...rows.map((r) => Math.abs(Number(r.net) || 0)))

  useEffect(() => {
    const track = scroller.current
    const active = activeRef.current
    // Nothing selected inside this window (an older month is open) — leave the
    // scroll position alone rather than yanking the strip to one end.
    if (!track || !active) return
    const target = active.offsetLeft - track.clientWidth / 2 + active.clientWidth / 2
    track.scrollTo({ left: Math.max(0, target), behavior: 'smooth' })
  }, [selectedKey])

  if (!rows.length) return null

  return (
    <div
      ref={scroller}
      className="-mx-1 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-1 pb-2"
      role="list"
      aria-label="Monthly money history"
    >
      {rows.map((row) => {
        const active = row.key === selectedKey
        const saved = row.net >= 0
        const width = (Math.abs(Number(row.net) || 0) / peak) * 100
        return (
          <button
            key={row.key}
            ref={active ? activeRef : null}
            type="button"
            role="listitem"
            onClick={() => onSelect(row.key)}
            aria-current={active ? 'true' : undefined}
            className={`w-[7rem] shrink-0 snap-start rounded-2xl border p-3 text-left transition cursor-pointer
              focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500
              ${
                active
                  ? 'border-indigo-300 bg-indigo-50/70 shadow-sm shadow-indigo-200/50'
                  : 'border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50'
              }`}
          >
            <p
              className={`text-[11px] font-semibold uppercase tracking-wide ${
                active ? 'text-indigo-500' : 'text-slate-400'
              }`}
            >
              {row.label} <span className="font-normal">{row.year}</span>
            </p>

            <p
              className={`tabular mt-1 text-sm font-bold ${
                saved ? 'text-emerald-600' : 'text-slate-800'
              }`}
            >
              {hidden ? '•••' : `${saved ? '+' : '−'}${formatMoney(Math.abs(row.net), currency)}`}
            </p>

            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${saved ? 'bg-emerald-400' : 'bg-rose-400'}`}
                style={{ width: `${Math.max(width, row.net ? 4 : 0)}%` }}
              />
            </div>

            <p className="tabular mt-1.5 text-[10px] font-medium text-slate-500">
              Bal {hidden ? '•••' : formatMoney(row.running, currency)}
            </p>
            <p className="text-[10px] text-slate-400">
              {row.entries} {row.entries === 1 ? 'entry' : 'entries'}
            </p>
          </button>
        )
      })}
    </div>
  )
}
