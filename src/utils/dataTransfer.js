/**
 * Data portability engine: export, backup, share and merge-import.
 *
 * Why this exists: your money history is the one thing in this app you can
 * never afford to lose. Everything here is built around that promise —
 *
 *   • Export  → Excel (.xlsx), CSV, Word (.doc) and a full JSON backup.
 *   • Import  → read any of those files back, edit them in Excel for two
 *               months, then re-import. Nothing is overwritten blindly: the
 *               merge matches rows by id, then by content fingerprint, so
 *               re-importing the same file changes nothing and genuinely new
 *               rows get added.
 *
 * The pure functions (normalise, fingerprint, merge) hold all the risky logic
 * so they can be unit-tested without a browser or a network.
 */

import * as XLSX from 'xlsx'
import { CATEGORIES, ALL_CATEGORIES } from '../data/categories.js'
import { todayISO, monthKeyOf, formatMonthKey, shiftMonth } from './date.js'
import {
  monthHistory,
  historyTotals,
  biggestTransactions,
  savingsRate,
  withRunningBalance,
  balanceBefore,
} from './history.js'
import { formatMoney } from './money.js'
import { projectedIncome, paymentsInMonth } from './earnings.js'

export const BACKUP_FORMAT = 'pft-backup'
export const BACKUP_VERSION = 2

/** Canonical column order — this *is* the Excel template users edit. */
export const EXPORT_COLUMNS = [
  { key: 'date', label: 'Date', width: 13 },
  { key: 'type', label: 'Type', width: 10 },
  { key: 'category', label: 'Category', width: 20 },
  { key: 'amount', label: 'Amount', width: 14 },
  { key: 'description', label: 'Description', width: 42 },
  { key: 'id', label: 'ID (do not edit)', width: 26 },
]

/**
 * Accepted spellings for every column, lower-cased. Imports stay forgiving so
 * a file that came out of Excel, Google Sheets or a bank export still lands.
 */
const HEADER_ALIASES = {
  date: ['date', 'day', 'transaction date', 'txn date', 'posted', 'posted date', 'تاریخ'],
  type: ['type', 'kind', 'direction', 'in/out', 'income/expense'],
  category: ['category', 'cat', 'bucket', 'label', 'دسته'],
  amount: ['amount', 'value', 'total', 'sum', 'price', 'مبلغ'],
  description: [
    'description',
    'note',
    'notes',
    'details',
    'memo',
    'merchant',
    'title',
    'توضیحات',
  ],
  id: ['id', 'id (do not edit)', 'ref', 'reference', 'transaction id', 'key'],
}

const INCOME_WORDS = ['income', 'in', 'credit', 'cr', 'deposit', 'received', 'earning', 'salary']
const EXPENSE_WORDS = ['expense', 'out', 'debit', 'dr', 'withdrawal', 'spent', 'spend', 'payment']

/* ------------------------------------------------------------------ */
/* Identity & normalisation                                            */
/* ------------------------------------------------------------------ */

/** Stable, human-readable content fingerprint used to spot duplicates. */
export function txFingerprint(tx = {}) {
  const amount = Number(tx.amount) || 0
  const description = String(tx.description || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
  return [
    tx.type === 'income' ? 'income' : 'expense',
    normaliseDate(tx.date),
    amount.toFixed(2),
    tx.category || '',
    description,
  ].join('|')
}

export function newTxId() {
  return `tx_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}

/** Accepts "income"/"expense" in any casing plus the usual synonyms. */
export function normaliseType(value) {
  const raw = String(value ?? '').trim().toLowerCase()
  if (!raw) return null
  if (INCOME_WORDS.includes(raw)) return 'income'
  if (EXPENSE_WORDS.includes(raw)) return 'expense'
  if (INCOME_WORDS.some((w) => w.length > 2 && raw.includes(w))) return 'income'
  if (EXPENSE_WORDS.some((w) => w.length > 2 && raw.includes(w))) return 'expense'
  return null
}

function isoFromParts(year, month, day) {
  const y = Number(year)
  const m = Math.min(Math.max(1, Number(month) || 1), 12)
  const last = new Date(y, m, 0).getDate()
  const d = Math.min(Math.max(1, Number(day) || 1), last)
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/**
 * Coerce anything a spreadsheet might hold into a "yyyy-MM-dd" string:
 * ISO strings, Excel serial numbers, "4/3/2025", "2025.03.04" and Dates.
 */
export function normaliseDate(value) {
  if (value === null || value === undefined || value === '') return ''
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return isoFromParts(value.getFullYear(), value.getMonth() + 1, value.getDate())
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    // Excel/Sheets serial date (days since 1899-12-30).
    if (value > 20000 && value < 80000) {
      const d = new Date(Math.round((value - 25569) * 86400 * 1000))
      if (!Number.isNaN(d.getTime())) {
        return isoFromParts(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate())
      }
    }
    if (value >= 1900 && value <= 2200) return `${value}-01-01`
    return ''
  }

  const raw = String(value).trim()
  if (!raw) return ''

  const iso = raw.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/)
  if (iso) return isoFromParts(Number(iso[1]), Number(iso[2]), Number(iso[3]))

  const slash = raw.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/)
  if (slash) {
    const a = Number(slash[1])
    const b = Number(slash[2])
    let y = Number(slash[3])
    if (y < 100) y += y > 70 ? 1900 : 2000
    // Ambiguous: if the first number can't be a month, it must be the day.
    return a > 12 && b <= 12 ? isoFromParts(y, b, a) : isoFromParts(y, a, b)
  }

  const parsed = new Date(raw)
  if (!Number.isNaN(parsed.getTime())) {
    return isoFromParts(parsed.getFullYear(), parsed.getMonth() + 1, parsed.getDate())
  }
  return ''
}

/** Strip currency symbols, thousands separators and stray letters. */
export function parseAmount(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.abs(value)
  const raw = String(value ?? '').trim()
  if (!raw) return null
  const negative = raw.startsWith('-') || /^\(.*\)$/.test(raw)
  const digits = raw.replace(/[^0-9.,-]/g, '')
  // "1,234.56" → drop the thousands comma; "1.234,56" → European decimal comma.
  const normalised =
    digits.includes(',') && digits.includes('.')
      ? digits.lastIndexOf(',') > digits.lastIndexOf('.')
        ? digits.replace(/\./g, '').replace(',', '.')
        : digits.replace(/,/g, '')
      : digits.replace(',', '.')
  const num = Number.parseFloat(normalised.replace(/-/g, ''))
  if (!Number.isFinite(num)) return null
  return negative ? -num : num
}


/* ------------------------------------------------------------------ */
/* Category & type mapping                                             */
/* ------------------------------------------------------------------ */

const CATEGORY_LABEL_BY_ID = new Map(ALL_CATEGORIES.map((c) => [c.id, c.label]))

/** Human label for a category id (falls back to the raw value). */
export function categoryLabel(id) {
  return CATEGORY_LABEL_BY_ID.get(id) || String(id || 'Other')
}

/** Turns whatever the spreadsheet said back into one of our category ids. */
export function categoryId(value, type = 'expense') {
  const list = type === 'income' ? CATEGORIES.income : CATEGORIES.expense
  const fallback = type === 'income' ? 'other-income' : 'other-expense'
  const raw = String(value ?? '').trim()
  if (!raw) return fallback
  const lower = raw.toLowerCase()
  const exact = list.find((c) => c.id === raw || c.label.toLowerCase() === lower)
  if (exact) return exact.id
  const partial = list.find(
    (c) => lower.includes(c.label.toLowerCase()) || c.label.toLowerCase().includes(lower),
  )
  return partial ? partial.id : fallback
}

/** Maps a row of spreadsheet cells onto our canonical field names. */
export function mapHeaders(row = {}) {
  const out = {}
  for (const [rawKey, value] of Object.entries(row)) {
    const key = String(rawKey).trim().toLowerCase()
    for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
      if (out[field] !== undefined) continue
      if (aliases.includes(key) || key.startsWith(field)) out[field] = value
    }
  }
  return out
}

/** Strips anything that isn't part of a stored transaction. */
export function cleanTx(tx = {}) {
  const amount = Math.abs(Number(tx.amount) || 0)
  return {
    id: tx.id || '',
    date: normaliseDate(tx.date),
    type: tx.type === 'income' ? 'income' : 'expense',
    category: categoryId(tx.category, tx.type === 'income' ? 'income' : 'expense'),
    amount,
    description: String(tx.description || '').trim(),
  }
}

/**
 * Imported rows → transactions. Rows we can't understand are reported in
 * `issues` instead of being silently dropped, so nothing disappears quietly.
 */
export function rowsToTransactions(rows = []) {
  const transactions = []
  const issues = []
  let sawDate = false
  let sawAmount = false

  rows.forEach((row, index) => {
    const mapped = mapHeaders(row)
    if (mapped.date !== undefined) sawDate = true
    if (mapped.amount !== undefined) sawAmount = true

    const signed = parseAmount(mapped.amount)
    const date = normaliseDate(mapped.date)
    // Template padding and blank lines are simply ignored, not reported.
    if (!date && (signed === null || signed === 0)) return
    if (!date) {
      issues.push({ row: index + 2, reason: 'Date could not be read' })
      return
    }
    if (signed === null || signed === 0) {
      issues.push({ row: index + 2, reason: 'Amount is missing or zero' })
      return
    }

    // Explicit "Type" column wins; otherwise the sign of the amount decides.
    const type = normaliseType(mapped.type) || (signed < 0 ? 'expense' : 'income')

    transactions.push({
      id: String(mapped.id || '').trim(),
      date,
      type,
      category: categoryId(mapped.category, type),
      amount: Math.abs(signed),
      description: String(mapped.description || '').trim(),
      _row: index + 2,
    })
  })

  if (!sawDate || !sawAmount) {
    issues.unshift({
      row: 0,
      reason: 'No "Date" and "Amount" columns were found — export a template first, or rename your headers.',
    })
  }

  return { transactions, issues }
}

/* ------------------------------------------------------------------ */
/* Merge engine (the "sync, never lose data" part)                      */
/* ------------------------------------------------------------------ */

/**
 * Merge imported transactions into the ones already stored.
 *
 * Matching order matters, and it is deliberately conservative:
 *   1. same id        → the row came from this app, so update it in place;
 *   2. same fingerprint → same date + amount + type + category + note, we
 *                        treat it as the same real-world payment;
 *   3. otherwise      → a genuinely new row, insert it.
 *
 * Because step 2 exists, re-importing an unchanged file is a no-op, and
 * importing a file where you only *added* rows just adds those rows.
 *
 * @returns {{ added: Array, updated: Array, duplicates: Array, unchanged: number }}
 */
export function mergeTransactions(existing = [], incoming = []) {
  const byId = new Map()
  const byFingerprint = new Map()
  for (const tx of existing) {
    if (tx.id) byId.set(tx.id, tx)
    byFingerprint.set(txFingerprint(tx), tx)
  }

  const added = []
  const updated = []
  const duplicates = []
  const seenIncoming = new Set()
  let unchanged = 0

  for (const raw of incoming) {
    const tx = cleanTx(raw)
    if (!tx.date || !tx.amount) continue

    const print = txFingerprint(tx)
    // The same row appearing twice inside one file must not double up.
    if (seenIncoming.has(print)) {
      duplicates.push(tx)
      continue
    }
    seenIncoming.add(print)

    const idMatch = tx.id ? byId.get(tx.id) : null
    if (idMatch) {
      if (txFingerprint(idMatch) === print) {
        unchanged += 1
      } else {
        const next = { ...idMatch, ...tx, id: idMatch.id, _row: tx._row }
        updated.push(next)
        byId.set(next.id, next)
        byFingerprint.set(print, next)
      }
      continue
    }

    const dup = byFingerprint.get(print)
    if (dup) {
      duplicates.push(tx)
      continue
    }

    const created = { ...tx, id: tx.id || newTxId() }
    added.push(created)
    if (created.id) byId.set(created.id, created)
    byFingerprint.set(print, created)
  }

  return { added, updated, duplicates, unchanged }
}

/** Human summary of a merge, used by the toast and the import report. */
export function describeMerge(result = {}) {
  const { added = [], updated = [], duplicates = [], unchanged = 0 } = result
  const parts = []
  if (added.length) parts.push(`${added.length} new`)
  if (updated.length) parts.push(`${updated.length} updated`)
  if (unchanged) parts.push(`${unchanged} already matched`)
  if (duplicates.length) parts.push(`${duplicates.length} duplicate${duplicates.length === 1 ? '' : 's'} skipped`)
  return parts.length ? parts.join(' · ') : 'Nothing to change — the data already matches.'
}

/* ------------------------------------------------------------------ */
/* Sheet building                                                      */
/* ------------------------------------------------------------------ */

/** One transaction → one spreadsheet row (human labels, real numbers). */
export function transactionRow(tx) {
  return [
    tx.date || '',
    tx.type === 'income' ? 'Income' : 'Expense',
    categoryLabel(tx.category),
    Number(tx.amount) || 0,
    tx.description || '',
    tx.id || '',
  ]
}

export function transactionRows(transactions = []) {
  return transactions
    .slice()
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    .map(transactionRow)
}

function sheetFromRows(rows, { widths = [] } = {}) {
  const ws = XLSX.utils.aoa_to_sheet(rows)
  if (widths.length) ws['!cols'] = widths.map((w) => ({ wch: w }))
  return ws
}

export const SUMMARY_HEADERS = ['Month', 'Money In', 'Money Out', 'Net', 'Balance']

/**
 * The monthly summary sheet: the same numbers the History screen shows, so
 * the spreadsheet can be checked against the app at a glance.
 */
export function monthlySummaryRows(transactions = [], count = 12) {
  const base = monthHistory(transactions, count)
  const rows = withRunningBalance(base, balanceBefore(transactions, base[0]?.key || '')).map((row) => [
    formatMonthKey(row.key),
    Number(row.income.toFixed(2)),
    Number(row.expense.toFixed(2)),
    Number(row.net.toFixed(2)),
    Number(row.running.toFixed(2)),
  ])
  const totals = historyTotals(base)
  rows.push([])
  rows.push([
    `Total (last ${count} months)`,
    Number(totals.income.toFixed(2)),
    Number(totals.expense.toFixed(2)),
    Number(totals.net.toFixed(2)),
    '',
  ])
  return rows
}

const FREQUENCY_LABEL = {
  monthly: 'Monthly',
  'semi-monthly': 'Twice a month',
  biweekly: 'Every 2 weeks',
  weekly: 'Weekly',
  daily: 'Per day worked',
  hourly: 'Per hour',
  irregular: 'Irregular',
}

/** Sheet 1 — the editable transaction list (this is the round-trip payload). */
export function transactionsSheet(transactions = [], includeData = true) {
  const rows = [
    EXPORT_COLUMNS.map((c) => c.label),
    ...(includeData ? transactionRows(transactions) : []),
  ]
  const ws = sheetFromRows(rows)
  ws['!cols'] = EXPORT_COLUMNS.map((c) => ({ wch: c.width }))
  ws['!freeze'] = { xSplit: '0', ySplit: '1' }
  if (rows.length > 1) {
    // Filter buttons on the header row make a long history manageable in Excel.
    ws['!autofilter'] = {
      ref: XLSX.utils.encode_range({
        s: { r: 0, c: 0 },
        e: { r: rows.length - 1, c: EXPORT_COLUMNS.length - 1 },
      }),
    }
  }
  return ws
}

/** Sheet 2 — money in / money out per month. */
export function summarySheet(transactions = [], months = 12, currency = 'USD') {
  return sheetFromRows(
    [
      [`Monthly Summary — all figures in ${currency}`],
      SUMMARY_HEADERS,
      ...monthlySummaryRows(transactions, months),
    ],
    { widths: [22, 14, 14, 14, 14] },
  )
}

/** Sheet 3 — the valid category labels, so imports stay tidy. */
export function categoriesSheet() {
  return sheetFromRows(
    [
      ['Type', 'Category (use this exact label)', 'Emoji'],
      ...ALL_CATEGORIES.map((c) => [
        CATEGORIES.income.includes(c) ? 'Income' : 'Expense',
        c.label,
        c.emoji,
      ]),
    ],
    { widths: [12, 34, 8] },
  )
}

/** Sheet 4 — your pay schedule and what it projects for this month. */
export function incomePlanSheet(incomeSources = []) {
  const monthKey = todayISO().slice(0, 7)
  const rows = [
    ['Income Plan', ''],
    ['Expected pay this month', Number(projectedIncome(incomeSources, monthKey).toFixed(2))],
    [],
    ['Source', 'Frequency', 'Amount', 'Next pay dates'],
  ]
  for (const source of incomeSources) {
    rows.push([
      source.name || 'Source',
      FREQUENCY_LABEL[source.frequency] || source.frequency || '',
      Number(source.amount) || 0,
      payDatesOf(source, monthKey).join(', '),
    ])
  }
  return sheetFromRows(rows, { widths: [26, 20, 14, 34] })
}

/** First few pay dates for a source, formatted for the sheet. */
function payDatesOf(source, monthKey) {
  return paymentsInMonth(source, monthKey)
    .slice(0, 4)
    .map((p) => normaliseDate(p.date))
    .filter(Boolean)
}

/** Sheet 5 — plain-language instructions, so the file explains itself. */
export function readMeSheet() {
  return sheetFromRows(
    [
      ['Personal Finance Tracker — backup & round-trip guide'],
      [],
      ['Sheet', 'What it is'],
      ['Transactions', 'Your data. One row per income or expense. Edit, add or delete rows here.'],
      ['Monthly Summary', 'Read-only reference: money in / money out / net / balance per month.'],
      ['Categories', 'Valid category names — copy them exactly to keep the app tidy.'],
      ['Income Plan', 'Reference only: your pay schedule and what it projects this month.'],
      [],
      ['Rules for a clean round trip'],
      ['Date', 'Use YYYY-MM-DD. Excel dates and 4/3/2025 style also work on import.'],
      ['Type', 'Income or Expense. Leave blank and the amount sign decides.'],
      ['Category', 'Any label from the Categories sheet; unknown values become "Other".'],
      ['Amount', 'A positive number — keep it numeric, not text.'],
      ['ID (do not edit)', 'Lets the app update the row it already knows instead of adding a copy.'],
      [],
      ['How to bring it back'],
      ['1', 'Open the app, go to Data Studio, then Import & Sync.'],
      ['2', 'Pick this file. You will see exactly what is new before anything is saved.'],
      ['3', 'Rows you only added in Excel are inserted; untouched rows are left alone.'],
      [],
      ['Your data lives in your own Google account — this file is a copy you own.'],
    ],
    { widths: [24, 90] },
  )
}

/**
 * The workbook behind every Excel export and the blank template.
 * One builder means an exported file and the template can never drift apart.
 */
export function buildWorkbook({
  transactions = [],
  incomeSources = [],
  currency = 'USD',
  months = 12,
  includeData = true,
} = {}) {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, transactionsSheet(transactions, includeData), 'Transactions')
  XLSX.utils.book_append_sheet(wb, summarySheet(transactions, months, currency), 'Monthly Summary')
  XLSX.utils.book_append_sheet(wb, categoriesSheet(), 'Categories')
  XLSX.utils.book_append_sheet(wb, incomePlanSheet(incomeSources), 'Income Plan')
  XLSX.utils.book_append_sheet(wb, readMeSheet(), 'Read Me')
  return wb
}

/** Conversion options shown in the Data Studio export picker. */
export const EXPORT_FORMATS = [
  {
    id: 'xlsx',
    label: 'Excel workbook',
    detail: 'Transactions + monthly summary, ready to edit in Excel or Google Sheets.',
    extension: 'xlsx',
    icon: 'sheet',
  },
  {
    id: 'csv',
    label: 'CSV file',
    detail: 'One flat table — opens anywhere, ideal for other apps and scripts.',
    extension: 'csv',
    icon: 'table',
  },
  {
    id: 'doc',
    label: 'Word report',
    detail: 'A readable statement of your months, totals and biggest spends.',
    extension: 'doc',
    icon: 'doc',
  },
  {
    id: 'json',
    label: 'Full backup (JSON)',
    detail: 'Everything the app stores — the file to keep if you ever need to restore.',
    extension: 'json',
    icon: 'shield',
  },
]

export const TEMPLATE_FORMAT = {
  id: 'template',
  label: 'Blank Excel template',
  detail: 'The same columns, empty — for typing in history by hand or on a computer.',
  extension: 'xlsx',
  icon: 'sheet',
}

/* ------------------------------------------------------------------ */
/* File construction                                                   */
/* ------------------------------------------------------------------ */

/** "pft-backup-2026-09-21.xlsx" — sortable, self-describing, never generic. */
export function exportFilename(extension, prefix = 'pft-backup') {
  return `${prefix}-${todayISO()}.${extension}`
}

function csvCell(value) {
  const raw = value === null || value === undefined ? '' : String(value)
  return /[",\n\r]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw
}

/** The same rows as the Transactions sheet, as plain CSV. */
export function toCsv(transactions = []) {
  const rows = [EXPORT_COLUMNS.map((c) => c.label), ...transactionRows(transactions)]
  return rows.map((row) => row.map(csvCell).join(',')).join('\r\n')
}

function esc(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/**
 * Word-friendly HTML. Word opens HTML saved as .doc, so a real .docx
 * dependency isn't needed — and the file stays small and readable.
 */
export function toWordHtml({
  transactions = [],
  currency = 'USD',
  months = 12,
  user = null,
} = {}) {
  const history = monthHistory(transactions, months)
  const totals = historyTotals(history)
  const biggest = biggestTransactions(transactions, 'expense', 8)
  const rate = savingsRate(totals.net, totals.income)

  const money = (n) => esc(formatMoney(Number(n) || 0, currency))

  const monthRows = history
    .filter((r) => r.income || r.expense)
    .map(
      (r) => `<tr>
        <td>${esc(formatMonthKey(r.key))}</td>
        <td align="right">${money(r.income)}</td>
        <td align="right">${money(r.expense)}</td>
        <td align="right">${money(r.income - r.expense)}</td>
        <td align="right">${money(r.balance ?? 0)}</td>
      </tr>`,
    )
    .join('')

  const biggestRows = biggest
    .map(
      (t) => `<tr>
        <td>${esc(t.date)}</td>
        <td>${esc(categoryLabel(t.category))}</td>
        <td>${esc(t.description || '—')}</td>
        <td align="right">${money(t.amount)}</td>
      </tr>`,
    )
    .join('')

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<title>Personal Finance Tracker — statement</title>
<style>
  body { font-family: Calibri, Arial, sans-serif; color: #0f172a; }
  h1 { font-size: 22pt; margin: 0 0 4pt; }
  h2 { font-size: 13pt; margin: 20pt 0 6pt; }
  .muted { color: #64748b; font-size: 9pt; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #cbd5e1; padding: 5pt 7pt; font-size: 10pt; }
  th { background: #f1f5f9; text-align: left; }
  .kpi { width: 100%; margin-top: 10pt; }
  .kpi td { border: none; padding: 0 10pt 0 0; }
  .kpi .label { font-size: 9pt; color: #64748b; }
  .kpi .value { font-size: 16pt; font-weight: bold; }
</style></head>
<body>
  <h1>Personal Finance Tracker</h1>
  <p class="muted">Statement generated ${esc(new Date().toLocaleString())}${
    user?.email ? ` · ${esc(user.email)}` : ''
  } · amounts in ${esc(currency)}</p>

  <table class="kpi"><tr>
    <td><div class="label">Money in</div><div class="value">${money(totals.income)}</div></td>
    <td><div class="label">Money out</div><div class="value">${money(totals.expense)}</div></td>
    <td><div class="label">Net</div><div class="value">${money(totals.net)}</div></td>
    <td><div class="label">Saved</div><div class="value">${rate}%</div></td>
  </tr></table>

  <h2>Month by month (last ${months})</h2>
  <table>
    <tr><th>Month</th><th align="right">Money in</th><th align="right">Money out</th>
    <th align="right">Net</th><th align="right">Balance</th></tr>
    ${monthRows || '<tr><td colspan="5">No transactions recorded yet.</td></tr>'}
  </table>

  <h2>Biggest expenses</h2>
  <table>
    <tr><th>Date</th><th>Category</th><th>Description</th><th align="right">Amount</th></tr>
    ${biggestRows || '<tr><td colspan="4">Nothing recorded yet.</td></tr>'}
  </table>

  <p class="muted">This report is a copy. Your live data stays in your own Google account.</p>
</body></html>`
}

/** The JSON backup: everything needed to rebuild the account from scratch. */
export function buildBackupPayload({
  transactions = [],
  incomeSources = [],
  budgets = [],
  settings = {},
  user = null,
} = {}) {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    account: user?.email || null,
    currency: settings.currency || 'USD',
    counts: {
      transactions: transactions.length,
      incomeSources: incomeSources.length,
      budgets: budgets.length,
    },
    transactions: transactions.map((t) => cleanTx(t)),
    incomeSources,
    budgets,
    settings,
  }
}
/* ------------------------------------------------------------------ */
/* Browser file I/O                                                    */
/* ------------------------------------------------------------------ */

/** Saves any built workbook (data or blank template) to the device. */
export function downloadWorkbook(workbook, filename) {
  XLSX.writeFile(workbook, filename, { compression: true })
}

/** Saves CSV / Word / JSON text. */
export function downloadText(text, filename, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob([text], { type: mime })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Revoke late: Safari needs the URL to stay alive until the save starts.
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}

/**
 * Reads a .xlsx / .xls / .csv file into plain rows.
 * The Transactions sheet is preferred when the file is a full workbook.
 */
export async function readSpreadsheet(file) {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })
  const sheetName =
    workbook.SheetNames.find((n) => /transaction/i.test(n)) || workbook.SheetNames[0]
  const sheet = sheetName ? workbook.Sheets[sheetName] : null
  if (!sheet) return { rows: [], sheetName: '' }
  // `raw: true` keeps real Dates as Dates and amounts as numbers, which our
  // normalisers understand far better than pre-formatted text.
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: true })
  return { rows, sheetName }
}

/** Reads a JSON backup. Throws a plain-language error when it isn't ours. */
export async function readBackup(file) {
  const text = await file.text()
  let data = null
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('That file is not valid JSON. Choose a .json backup exported from this app.')
  }
  if (data?.format !== BACKUP_FORMAT) {
    throw new Error('That JSON file did not come from this app, so its contents are unknown.')
  }
  const transactions = Array.isArray(data.transactions) ? data.transactions : []
  return {
    transactions: transactions.map((t) => ({ ...cleanTx(t), id: t.id || '' })),
    incomeSources: Array.isArray(data.incomeSources) ? data.incomeSources : [],
    budgets: Array.isArray(data.budgets) ? data.budgets : [],
    settings: data.settings && typeof data.settings === 'object' ? data.settings : {},
    exportedAt: data.exportedAt || null,

    account: data.account || null,
  }
}



/* ------------------------------------------------------------------ */
/* Import execution                                                    */
/* ------------------------------------------------------------------ */

export const IMPORT_MODES = [
  {
    id: 'merge',
    label: 'Merge & sync',
    detail:
      'Adds what is new, updates the rows you edited, skips duplicates. Use this to bring months back from Excel.',
  },
  {
    id: 'replace',
    label: 'Replace everything',
    detail:
      'Clears the account and restores exactly what the file holds. Only for a full restore from backup.',
  },
]

/**
 * Decides what an import will do, without writing anything.
 * The screen shows this plan first, so nothing is ever saved unseen.
 */
export function planImport({ incoming = [], existing = [], mode = 'merge' } = {}) {
  if (mode === 'replace') {
    const prepared = incoming
      .map((t) => ({ ...cleanTx(t), id: t.id || newTxId() }))
      .filter((t) => t.date && t.amount)
    return {
      mode,
      added: prepared,
      updated: [],
      duplicates: [],
      unchanged: 0,
      remove: existing.map((t) => t.id).filter(Boolean),
      incoming: prepared,
    }
  }

  const merged = mergeTransactions(existing, incoming)
  return { mode: 'merge', remove: [], incoming, ...merged }
}

/** The report shape a screen or toast needs, in plain words. */
export function describePlan(plan = {}) {
  if (plan.mode === 'replace') {
    return `Replace: ${plan.remove.length} removed, ${plan.added.length} restored`
  }
  return describeMerge(plan)
}

/**
 * Writes a planned import.
 *
 * `io` is injected (add / update / remove) instead of imported, so this runs in
 * tests against a plain in-memory store — and so the screen owns the retry
 * conversation. Rows are written one at a time on purpose: if the phone drops
 * offline halfway, the rows that already saved stay saved and the ones that
 * did not are reported, instead of losing an entire batch silently.
 */
export async function applyImport(plan = {}, io = {}) {
  const added = plan.added || []
  const updated = plan.updated || []
  const remove = plan.remove || []
  const total = added.length + updated.length + remove.length
  const report = { added: 0, updated: 0, removed: 0, failed: [], total }
  let done = 0

  const step = () => {
    done += 1
    if (typeof io.onProgress === 'function') io.onProgress(done, total)
  }

  for (const id of remove) {
    try {
      await io.remove?.(id)
      report.removed += 1
    } catch (error) {
      report.failed.push({ id, reason: error?.message || 'Delete failed' })
    }
    step()
  }

  for (const tx of updated) {
    const { _row, ...payload } = tx
    try {
      await io.update?.(payload)
      report.updated += 1
    } catch (error) {
      report.failed.push({ id: tx.id, reason: error?.message || 'Update failed' })
    }
    step()
  }

  for (const tx of added) {
    const { _row, ...payload } = tx
    try {
      await io.add?.(payload)
      report.added += 1
    } catch (error) {
      report.failed.push({ id: tx.id, reason: error?.message || 'Save failed' })
    }
    step()
  }

  return report
}

/** One-line, honest summary of an applied import. */
export function describeReport(report = {}) {
  const parts = []
  if (report.added) parts.push(`${report.added} added`)
  if (report.updated) parts.push(`${report.updated} updated`)
  if (report.removed) parts.push(`${report.removed} removed`)
  if (report.failed?.length) parts.push(`${report.failed.length} failed`)
  if (!parts.length) parts.push('nothing to change')
  return parts.join(' · ')
}

/* ------------------------------------------------------------------ */
/* Sharing                                                             */
/* ------------------------------------------------------------------ */

/**
 * A short, human-readable summary — what you'd actually paste into a message.
 *
 * Deliberately excludes individual transactions: when someone says "send me
 * your budget", a full statement of every purchase is almost never what they
 * meant, and it is not something to leak by accident.
 */
export function buildShareText({ transactions = [], currency = 'USD', months = 12 } = {}) {
  const history = monthHistory(transactions, months)
  const totals = historyTotals(history)
  const current = history.find((r) => r.key === monthKeyOf(todayISO()))
  const money = (n) => formatMoney(Number(n) || 0, currency)

  const lines = [
    `My Personal Finance Tracker summary (last ${months} months)`,
    `Money in:  ${money(totals.income)}`,
    `Money out: ${money(totals.expense)}`,
    `Net:       ${money(totals.net)}`,
    `Saved:     ${savingsRate(totals.net, totals.income)}%`,
  ]
  if (current && (current.income || current.expense)) {
    lines.push('', `This month so far: ${money(current.income)} in, ${money(current.expense)} out`)
  }
  lines.push('', `Shared ${new Date().toLocaleDateString()} from Personal Finance Tracker`)
  return lines.join('\n')
}

/** The workbook as a Blob, so it can be handed to the Web Share API. */
export function workbookBlob(workbook) {
  const array = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })
  return new Blob([array], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

/** True when this browser can share real files — true on phones, rare on desktop. */
export function canShareFiles(file) {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') return false
  if (typeof navigator.canShare === 'function') {
    try {
      return navigator.canShare({ files: [file] })
    } catch {
      return false
    }
  }
  return false
}

