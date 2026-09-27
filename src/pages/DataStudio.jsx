import { useMemo, useRef, useState } from 'react'
import {
  DatabaseZap,
  FileSpreadsheet,
  Table2,
  FileText,
  ShieldCheck,
  Download,
  Upload,
  Share2,
  Check,
  AlertTriangle,
  RefreshCw,
  HardDriveDownload,
  Clock,
  Copy,
  FileUp,
  X,
} from 'lucide-react'
import { Button, Card, Pill, Spinner, EmptyState } from '../components/ui/Primitives'
import Modal from '../components/ui/Modal'
import { useToast } from '../components/ui/Toast'
import { useUser } from '../context/UserContext'
import { useIncomeSources } from '../hooks/useIncomeSources'
import { useAllBudgets } from '../hooks/useBudgets'
import { addTransaction, updateTransaction, deleteTransaction } from '../services/transactions'
import { saveBudget } from '../services/budgets'
import {
  EXPORT_FORMATS,
  TEMPLATE_FORMAT,
  buildWorkbook,
  exportFilename,
  toCsv,
  toWordHtml,
  buildBackupPayload,
  downloadWorkbook,
  downloadText,
  readSpreadsheet,
  readBackup,
  rowsToTransactions,
  IMPORT_MODES,
  planImport,
  describePlan,
  applyImport,
  describeReport,
} from '../utils/dataTransfer'
import { monthHistory, historyTotals } from '../utils/history'
import { formatMoney } from '../utils/money'

/* ------------------------------------------------------------------ */
/* Presentation helpers                                                */
/* ------------------------------------------------------------------ */

/** Format icon name (from the engine) → lucide component. */
const FORMAT_ICONS = {
  sheet: FileSpreadsheet,
  table: Table2,
  doc: FileText,
  shield: ShieldCheck,
}

/** "21 Sep 2026 · 3 days ago" — a date you can trust at a glance. */
function formatWhen(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const days = Math.floor((Date.now() - d.getTime()) / 86400000)
  const rel = days <= 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`
  return `${d.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })} · ${rel}`
}

function formatSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** One selectable export format. */
function FormatCard({ option, active, onSelect, disabled }) {
  const Icon = FORMAT_ICONS[option.icon] || FileText
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={active}
      className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition ${
        active
          ? 'border-indigo-300 bg-indigo-50/60 ring-1 ring-indigo-200'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
      } ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
    >
      <span
        className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg ${
          active ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
        }`}
      >
        <Icon size={17} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-800">{option.label}</span>
          {active && <Check size={14} className="text-indigo-600" />}
        </span>
        <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
          {option.detail}
        </span>
      </span>
    </button>
  )
}

/** A single "what will change" figure in the import plan. */
function PlanStat({ label, value, tone = 'slate' }) {
  const tones = {
    slate: 'text-slate-700',
    emerald: 'text-emerald-600',
    amber: 'text-amber-600',
    rose: 'text-rose-600',
  }
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className={`text-lg font-semibold tabular-nums ${tones[tone]}`}>{value}</div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Main DataStudio Component                                          */
/* ------------------------------------------------------------------ */

export default function DataStudio({ transactions = [] }) {
  const { user, settings, updateSettings } = useUser()
  const toast = useToast()
  const { sources: incomeSources } = useIncomeSources(user?.uid)
  const { budgets } = useAllBudgets(user?.uid)

  const [activeTab, setActiveTab] = useState('export')
  const [selectedFormat, setSelectedFormat] = useState('xlsx')
  const [exporting, setExporting] = useState(false)
  const [sharing, setSharing] = useState(false)

  // Import state
  const fileInputRef = useRef(null)
  const [importedFile, setImportedFile] = useState(null)
  const [parsing, setParsing] = useState(false)
  const [importPlan, setImportPlan] = useState(null)
  const [importIssues, setImportIssues] = useState([])
  const [importMode, setImportMode] = useState('merge')
  const [applying, setApplying] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [importResult, setImportResult] = useState(null)

  const currency = settings?.currency || 'USD'
  const lastBackup = settings?.lastExportAt

  const totalIncome = useMemo(
    () => transactions.filter((t) => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0),
    [transactions],
  )
  const totalExpense = useMemo(
    () => transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0),
    [transactions],
  )

  const handleExport = async (formatId = selectedFormat) => {
    setExporting(true)
    try {
      if (formatId === 'xlsx') {
        const wb = buildWorkbook({
          transactions,
          currency,
          user,
          sources: incomeSources,
        })
        const fname = exportFilename('xlsx', 'pft-transactions')
        downloadWorkbook(wb, fname)
      } else if (formatId === 'template') {
        const wb = buildWorkbook({
          transactions: [],
          currency,
          user,
          sources: incomeSources,
          isTemplate: true,
        })
        downloadWorkbook(wb, 'pft-import-template.xlsx')
      } else if (formatId === 'csv') {
        const csv = toCsv(transactions)
        const fname = exportFilename('csv', 'pft-transactions')
        downloadText(csv, fname, 'text/csv;charset=utf-8')
      } else if (formatId === 'doc') {
        const html = toWordHtml({
          transactions,
          currency,
          months: 12,
          user,
        })
        const fname = exportFilename('doc', 'pft-statement')
        downloadText(html, fname, 'application/msword;charset=utf-8')
      } else if (formatId === 'json') {
        const payload = buildBackupPayload({
          transactions,
          incomeSources,
          budgets,
          settings,
          user,
        })
        const jsonStr = JSON.stringify(payload, null, 2)
        const fname = exportFilename('json', 'pft-complete-backup')
        downloadText(jsonStr, fname, 'application/json;charset=utf-8')
      }

      const now = new Date().toISOString()
      if (updateSettings) {
        await updateSettings({ lastExportAt: now }).catch(() => {})
      }

      toast('Export complete — your file has been downloaded')
    } catch (err) {
      console.error('[PFT] Export failed:', err)
      toast(err.message || 'Could not generate the export file', 'error')
    } finally {
      setExporting(false)
    }
  }

  const handleShare = async () => {
    setSharing(true)
    try {
      const history = monthHistory(transactions, 3)
      const totals = historyTotals(history)
      const shareText = `Personal Finance Tracker Summary\nAccount: ${user?.email || 'My Account'}\nLast 3 Months: In ${formatMoney(totals.income, currency)} · Out ${formatMoney(totals.expense, currency)} · Net ${formatMoney(totals.net, currency)}\nGenerated with PFT.`

      if (navigator.share) {
        await navigator.share({
          title: 'My PFT Financial Summary',
          text: shareText,
        })
        toast('Shared successfully')
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareText)
        toast('Summary copied — paste it into a message or note')
      } else {
        toast('Sharing is not supported here — download a statement instead', 'info')
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        toast('Share was cancelled', 'info')
      }
    } finally {
      setSharing(false)
    }
  }

  /* ---------------------------------------------------------------- */
  /* Import: pick → plan → apply                                       */
  /* ---------------------------------------------------------------- */

  const resetImport = () => {
    setImportedFile(null)
    setImportPlan(null)
    setImportIssues([])
    setImportResult(null)
    setProgress({ done: 0, total: 0 })
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  /**
   * Reads the chosen file and works out what it would change — without
   * writing anything. The plan is shown first on purpose: an import that
   * silently overwrote a month would be unrecoverable.
   */
  const handleFile = async (file) => {
    if (!file) return
    setParsing(true)
    setImportPlan(null)
    setImportIssues([])
    setImportResult(null)

    try {
      const isJson = /\.json$/i.test(file.name)
      let incoming = []
      let issues = []

      if (isJson) {
        const backup = await readBackup(file)
        incoming = backup.transactions
        setImportedFile({ name: file.name, size: file.size, kind: 'backup', backup })
      } else {
        const { rows, sheetName } = await readSpreadsheet(file)
        const parsed = rowsToTransactions(rows)
        incoming = parsed.transactions
        issues = parsed.issues
        setImportedFile({
          name: file.name,
          size: file.size,
          kind: 'sheet',
          sheetName,
          rowCount: rows.length,
        })
      }

      setImportIssues(issues)

      if (!incoming.length) {
        toast(issues[0]?.reason || 'That file had no rows we could read', 'info')
        return
      }

      setImportPlan(planImport({ incoming, existing: transactions, mode: importMode }))
    } catch (err) {
      console.error('[PFT] Import read failed:', err)
      toast(err.message || 'That file could not be read', 'error')
      resetImport()
    } finally {
      setParsing(false)
    }
  }

  // Switching merge ↔ replace re-plans against the same file, so the counts
  // on screen always match the mode that is about to run.
  const handleModeChange = (nextMode) => {
    setImportMode(nextMode)
    setImportResult(null)
    if (importedFile && importPlan) {
      const incoming =
        importPlan.mode === 'replace' ? importPlan.incoming : importPlan.incoming || []
      if (incoming.length) {
        setImportPlan(planImport({ incoming, existing: transactions, mode: nextMode }))
      }
    }
  }

  const handleApplyImport = async () => {
    if (!importPlan) return
    setApplying(true)
    setProgress({ done: 0, total: 0 })

    try {
      const io = {
        // One write per row, not a batch: if the phone drops offline midway,
        // everything already saved stays saved and the rest is reported.
        add: (payload) => addTransaction(user.uid, payload),
        update: (payload) => updateTransaction(user.uid, payload.id, payload),
        remove: (id) => deleteTransaction(user.uid, id),
        onProgress: (done, total) => setProgress({ done, total }),
      }

      const report = await applyImport(importPlan, io)
      setImportResult(report)
      setImportPlan(null)

      // Budgets and pay sources only exist in a JSON backup, so restoring
      // them is best-effort and never allowed to fail the import itself.
      const backup = importedFile?.backup
      if (backup?.budgets?.length) {
        for (const b of backup.budgets) {
          if (!b?.categoryId || !b?.monthKey) continue
          await saveBudget(user.uid, b.monthKey, b.categoryId, b.amount).catch(() => {})
        }
      }

      toast(describeReport(report), report.failed.length ? 'info' : 'success')
    } catch (err) {
      console.error('[PFT] Import failed:', err)
      toast(err.message || 'Import stopped — your existing data is untouched', 'error')
    } finally {
      setApplying(false)
    }
  }



  /* ---------------------------------------------------------------- */
  /* Render                                                            */
  /* ---------------------------------------------------------------- */

  const TABS = [
    { value: 'export', label: 'Export & backup' },
    { value: 'import', label: 'Import & sync' },
  ]

  const summaryText = useMemo(() => {
    const history = monthHistory(transactions, 3)
    const totals = historyTotals(history)
    return [
      'Personal Finance Tracker — summary',
      `Account: ${user?.email || 'My account'}`,
      `Transactions: ${transactions.length}`,
      `Last 3 months — in ${formatMoney(totals.income, currency)} · out ${formatMoney(
        totals.expense,
        currency,
      )} · net ${formatMoney(totals.net, currency)}`,
    ].join('\n')
  }, [transactions, currency, user])

  const copySummary = async () => {
    try {
      await navigator.clipboard.writeText(summaryText)
      toast('Summary copied')
    } catch {
      toast('Your browser blocked clipboard access', 'error')
    }
  }

  const plan = importPlan
  const hasDuplicateWarning = plan?.duplicates?.length > 0

  return (
    <>
      <div className="space-y-5 pb-2">
        <header className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
            Data studio
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Take your money data out in a form you can keep, edit or send — and bring it back
            again later without losing a single row.
          </p>
        </header>

        {/* A backup you never took is a backup that does not exist. */}
        <div className="grid gap-3 sm:grid-cols-3">
          <Card className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Records</p>
            <p className="mt-1 text-xl font-bold tracking-tight text-slate-900">
              {transactions.length}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Money tracked
            </p>
            <p className="mt-1 text-xl font-bold tracking-tight text-slate-900">
              {formatMoney(totalIncome + totalExpense, currency)}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Last backup
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-800">
              <Clock size={14} className="text-slate-400" />
              {lastBackup ? formatWhen(lastBackup) : 'Never'}
            </p>
          </Card>
        </div>

        <div className="flex rounded-xl bg-slate-100 p-1">
          {TABS.map((tab) => {
            const active = tab.value === activeTab
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setActiveTab(tab.value)}
                className={`flex-1 cursor-pointer rounded-lg px-3 py-2 text-sm font-semibold transition
                  ${active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        {activeTab === 'export' ? (
          <div className="space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Choose a format</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Excel opens in Sheets, Numbers and Office. Word is best for printing or
                sending to someone.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {EXPORT_FORMATS.map((option) => (
                <FormatCard
                  key={option.id}
                  option={option}
                  active={option.id === selectedFormat}
                  onSelect={() => setSelectedFormat(option.id)}
                  disabled={exporting}
                />
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={() => handleExport()} disabled={exporting || !transactions.length}>
                {exporting ? <Spinner size={16} /> : <Download size={16} />}
                {exporting ? 'Building your file…' : 'Download my data'}
              </Button>
              <Button
                variant="secondary"
                onClick={() => handleExport(TEMPLATE_FORMAT.id)}
                disabled={exporting}
              >
                <HardDriveDownload size={16} /> Blank template
              </Button>
            </div>

            {!transactions.length && (
              <Card className="flex items-start gap-3 border-amber-200 bg-amber-50/60 p-4">
                <AlertTriangle size={17} className="mt-0.5 shrink-0 text-amber-600" />
                <p className="text-xs text-amber-800">
                  There is nothing to export yet. Add a few transactions first — or download the
                  blank template and fill in older months you never got round to recording.
                </p>
              </Card>
            )}

            <Card className="p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <Share2 size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800">Share a summary</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Sends a short 3-month summary — money in, money out, net. Your individual
                    transactions are never included.
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleShare}
                  disabled={sharing || !transactions.length}
                >
                  {sharing ? <Spinner size={15} /> : <Share2 size={15} />}
                  {sharing ? 'Opening…' : 'Share'}
                </Button>
                <Button size="sm" variant="secondary" onClick={copySummary} disabled={!transactions.length}>
                  <Copy size={15} /> Copy summary
                </Button>
              </div>
            </Card>

            <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
              <ShieldCheck size={18} className="mt-0.5 shrink-0 text-emerald-600" />
              <div>
                <p className="text-sm font-semibold text-emerald-900">
                  Your data never leaves your Google account
                </p>
                <p className="mt-0.5 text-xs text-emerald-800">
                  Files are built on your device. Nothing is uploaded anywhere, and PFT keeps no
                  copy. A file you saved to Excel is exactly that — a file you own.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Bring data back in</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Drop in a file you exported before — including one you have since edited in
                Excel. Nothing is written until you approve the plan below.
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv,.json"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />

            {!importedFile ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/60 px-6 py-10 text-center transition hover:border-indigo-400 hover:bg-indigo-50/40"
              >
                {parsing ? (
                  <Spinner size={26} className="text-slate-400" />
                ) : (
                  <FileUp size={26} className="text-slate-400" />
                )}
                <span className="text-sm font-semibold text-slate-700">
                  {parsing ? 'Reading your file…' : 'Choose an Excel, CSV or backup file'}
                </span>
                <span className="text-xs text-slate-500">.xlsx · .xls · .csv · .json</span>
              </button>
            ) : (
              <Card className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                    {importedFile.kind === 'backup' ? (
                      <DatabaseZap size={18} />
                    ) : (
                      <FileSpreadsheet size={18} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800">
                      {importedFile.name}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {formatSize(importedFile.size)}
                      {importedFile.sheetName ? ` · sheet “${importedFile.sheetName}”` : ''}
                      {importedFile.rowCount ? ` · ${importedFile.rowCount} rows read` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={resetImport}
                    disabled={applying}
                    className="cursor-pointer rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                    aria-label="Remove the chosen file"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Switching mode re-plans the same file, so the counts on
                    screen always match what is about to run. */}
                <div className="mt-4 flex rounded-xl bg-slate-100 p-1">
                  {IMPORT_MODES.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => handleModeChange(m.id)}
                      disabled={applying}
                      className={`flex-1 cursor-pointer rounded-lg px-3 py-2 text-xs font-semibold transition
                        ${m.id === importMode ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-xs text-slate-500">
                  {IMPORT_MODES.find((m) => m.id === importMode)?.detail}
                </p>

                {plan && (
                  <>
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <PlanStat label="New" value={plan.added.length} />
                      <PlanStat label="Updated" value={plan.updated.length} />
                      <PlanStat
                        label={plan.mode === 'replace' ? 'Removed' : 'Already had'}
                        value={
                          plan.mode === 'replace' ? plan.remove.length : plan.duplicates.length
                        }
                      />
                    </div>
                    <p className="mt-2 text-xs text-slate-500">{describePlan(plan)}</p>
                  </>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Button onClick={handleApplyImport} disabled={applying || !plan}>
                    {applying ? <Spinner size={16} /> : <Upload size={16} />}
                    {applying
                      ? `Saving ${progress.done}/${progress.total}…`
                      : importMode === 'replace'
                        ? 'Replace my data'
                        : 'Apply these changes'}
                  </Button>
                  <Button size="sm" variant="secondary" onClick={resetImport} disabled={applying}>
                    <RefreshCw size={15} /> Start over
                  </Button>
                </div>

                {plan?.mode === 'merge' && plan.duplicates.length > 0 && (
                  <p className="mt-2 text-xs text-slate-500">
                    {plan.duplicates.length} row{plan.duplicates.length === 1 ? '' : 's'} matched
                    something you already have — edited copies are updated, untouched ones skipped.
                  </p>
                )}

              </Card>
            )}

            {importResult && (
              <div
                className={`rounded-2xl border p-4 ${
                  importResult.failed.length
                    ? 'border-amber-200 bg-amber-50/60'
                    : 'border-emerald-200 bg-emerald-50/60'
                }`}
              >
                <div className="flex items-start gap-3">
                  {importResult.failed.length ? (
                    <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600" />
                  ) : (
                    <Check size={18} className="mt-0.5 shrink-0 text-emerald-600" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800">
                      {importResult.failed.length
                        ? 'Imported, with a few rows left behind'
                        : 'Import complete'}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-600">
                      {describeReport(importResult)}. The rest is safely in your ledger.
                    </p>
                    {importResult.failed.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {importResult.failed.slice(0, 4).map((f, i) => (
                          <li key={`${f.id}-${i}`} className="text-xs text-slate-600">
                            {f.reason}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            )}

            {importIssues.length > 0 && (
              <Card className="p-4">
                <div className="flex items-center gap-2">
                  <Table2 size={16} className="text-slate-400" />
                  <p className="text-sm font-semibold text-slate-800">Rows we skipped</p>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  These were left out rather than guessed at — fix them in the file and import it
                  again.
                </p>
                <ul className="mt-2 space-y-1">
                  {importIssues.slice(0, 6).map((issue, i) => (
                    <li key={`${issue.row}-${i}`} className="text-xs text-slate-600">
                      {issue.row ? `Row ${issue.row}: ` : ''}
                      {issue.reason}
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
              <Clock size={18} className="mt-0.5 shrink-0 text-slate-400" />
              <p className="text-xs text-slate-600">
                <span className="font-semibold text-slate-700">
                  Coming back to this months later?
                </span>{' '}
                Export, add the new months to the spreadsheet on any computer, then import the same
                file here with <span className="font-semibold">Merge &amp; sync</span>. Only the new
                rows are added, and nothing is ever counted twice.
              </p>
            </div>

          </div>
        )}
      </div>
    </>
  )
}

