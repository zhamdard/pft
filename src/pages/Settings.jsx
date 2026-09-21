import { useState } from 'react'
import { Download, LoaderCircle } from 'lucide-react'
import { Card } from '../components/ui/Primitives'
import { Field, Select } from '../components/ui/Form'
import { SUPPORTED_CURRENCIES } from '../utils/money'
import { useUser } from '../context/UserContext'
import { useToast } from '../components/ui/Toast'
import { useTransactions } from '../hooks/useTransactions'

export default function Settings({ view }) {
  const { user, currency, updateSettings } = useUser()
  const toast = useToast()
  const { transactions } = useTransactions(user?.uid)
  const [saving, setSaving] = useState(false)

  if (!user) return null

  const displayName = user.displayName || 'Cashflow'
  const email = user.email || ''
  const initial = (displayName[0] || '?').toUpperCase()

  async function handleCurrency(e) {
    const code = e.target.value
    setSaving(true)
    try {
      await updateSettings({ currency: code })
      toast('Currency updated')
    } catch (err) {
      console.error(err)
      toast('Could not update currency', 'error')
    } finally {
      setSaving(false)
    }
  }

  function exportData() {
    const payload = { exportedAt: new Date().toISOString(), transactions: transactions || [] }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pft-export-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    toast('Export downloaded')
  }

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">Account, currency and data.</p>
      </div>

      <Card className="p-5">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 text-xl font-bold text-indigo-700">
            {initial}
          </span>
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-slate-900">{displayName}</p>
            <p className="truncate text-sm text-slate-500">{email}</p>
            <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Connected with Google
            </span>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Currency</h2>
            <p className="text-xs text-slate-500">Used across dashboards, entries and budgets.</p>
          </div>
          {saving && <LoaderCircle size={16} className="animate-spin text-slate-400" />}
        </div>
        <Field label="" className="mt-4">
          <Select value={currency} onChange={handleCurrency}>
            {SUPPORTED_CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} — {c.label} ({c.symbol})
              </option>
            ))}
          </Select>
        </Field>
      </Card>

      <Card className="p-5">
        <h2 className="text-sm font-semibold text-slate-900">Your data</h2>
        <p className="mt-1 text-xs text-slate-500">
          Everything is stored securely in Google Cloud (Firestore) under your account. You can
          download a copy anytime.
        </p>
        <button
          onClick={exportData}
          className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 cursor-pointer"
        >
          <Download size={16} />
          Export as JSON
        </button>
      </Card>

      <p className="pb-4 text-center text-xs text-slate-400">
        PFT keeps your data on your own Google account — nothing is stored on your device.
      </p>
    </div>
  )
}
