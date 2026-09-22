import { useState } from 'react'
import { Activity, Check, Copy, Download, LoaderCircle, RefreshCw } from 'lucide-react'
import { Alert, CheckRow } from '../components/ui/Alert'
import { Button, Card } from '../components/ui/Primitives'
import { Field, Select } from '../components/ui/Form'
import { SUPPORTED_CURRENCIES } from '../utils/money'
import { useUser } from '../context/UserContext'
import { useToast } from '../components/ui/Toast'
import {
  buildDiagnosticsReport,
  checkAuthRelay,
  copyText,
  environmentInfo,
  pingFirestore,
} from '../services/diagnostics'
import { describeFirestoreError } from '../utils/firestoreErrors'

export default function Settings({ transactions = [] }) {
  const { user, currency, updateSettings, signedInWith } = useUser()
  const toast = useToast()
  const [saving, setSaving] = useState(false)

  // Connection self-test — lets the user prove sign-in + database work
  // without opening developer tools.
  const [checks, setChecks] = useState(null)
  const [checking, setChecking] = useState(false)
  const [pingError, setPingError] = useState(null)
  const [copied, setCopied] = useState(false)

  if (!user) return null

  const env = environmentInfo()
  const pingInfo = pingError ? describeFirestoreError(pingError) : null

  async function runHealthCheck() {
    setChecking(true)
    setPingError(null)
    setChecks([
      {
        id: 'config',
        state: env.configured ? 'pass' : 'fail',
        label: 'Firebase config',
        value: env.projectId,
      },
      {
        id: 'online',
        state: env.online ? 'pass' : 'warn',
        label: 'Internet connection',
        value: env.online ? 'online' : 'browser reports offline',
      },
      {
        id: 'storage',
        state: env.storage ? 'pass' : 'warn',
        label: 'Browser storage',
        value: env.storage ? 'available' : 'private mode blocks it',
      },
      { id: 'relay', state: 'pending', label: 'Google sign-in relay' },
      { id: 'firestore', state: 'pending', label: 'Cloud database (read + write)' },
    ])

    const relay = await checkAuthRelay()
    setChecks((prev) =>
      prev.map((c) =>
        c.id === 'relay'
          ? { ...c, state: relay.ok ? 'pass' : 'fail', value: relay.detail }
          : c,
      ),
    )

    const ping = await pingFirestore(user.uid)
    setChecks((prev) =>
      prev.map((c) =>
        c.id === 'firestore'
          ? { ...c, state: ping.ok ? 'pass' : 'fail', value: ping.ok ? 'read + write OK' : ping.error?.code || '' }
          : c,
      ),
    )
    if (!ping.ok) setPingError(ping.error)
    setChecking(false)
  }

  async function copyDiagnostics() {
    const report = buildDiagnosticsReport({
      user,
      signedInWith,
      lastError: pingError,
      extra: {
        'sign-in method': signedInWith || 'unknown',
        'transactions loaded': String(transactions?.length ?? 0),
      },
    })
    const ok = await copyText(report)
    setCopied(ok)
    toast(ok ? 'Diagnostics copied' : 'Could not copy — check browser permissions', ok ? 'success' : 'error')
    if (ok) setTimeout(() => setCopied(false), 2500)
  }

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
        <h2 className="text-sm font-semibold text-slate-900">Connection &amp; troubleshooting</h2>
        <p className="mt-1 text-xs text-slate-500">
          Runs a real write → read → delete against your own database, so you can confirm that
          sign-in and cloud storage are working before you trust the app with your money.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button size="sm" variant="secondary" onClick={runHealthCheck} disabled={checking}>
            {checking ? <LoaderCircle size={15} className="animate-spin" /> : <RefreshCw size={15} />}
            {checking ? 'Checking…' : 'Run connection test'}
          </Button>
          <Button size="sm" variant="ghost" onClick={copyDiagnostics}>
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied ? 'Copied' : 'Copy diagnostics'}
          </Button>
        </div>

        {checks && (
          <ul className="mt-4 border-t border-slate-100 pt-2">
            {checks.map((c) => (
              <CheckRow key={c.id} state={c.state} label={c.label} value={c.value} />
            ))}
          </ul>
        )}

        {pingInfo && (
          <Alert
            className="mt-4"
            tone="error"
            title={pingInfo.title}
            detail={pingInfo.detail}
            steps={pingInfo.steps}
            code={pingError?.code}
          />
        )}

        {checks && !pingInfo && !checking && (
          <Alert
            className="mt-4"
            tone="success"
            title="Everything checks out"
            detail="Sign-in and cloud storage both answered correctly from this browser. Your data is syncing to your own Google account."
          />
        )}

        <dl className="mt-5 space-y-1.5 border-t border-slate-100 pt-4 text-xs">
          {[
            ['Firebase project', env.projectId],
            ['Sign-in domain', env.authDomain],
            ['This page', env.origin],
            ['Sign-in method', signedInWith || 'unknown'],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4">
              <dt className="shrink-0 text-slate-500">{label}</dt>
              <dd className="truncate font-mono text-slate-600">{value}</dd>
            </div>
          ))}
        </dl>

        <p className="mt-4 text-[11px] leading-relaxed text-slate-400">
          If “This page” is not localhost, add it in Firebase → Authentication → Settings →
          Authorized domains, otherwise Google will refuse to hand the sign-in back to the app.
        </p>
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
