# PFT — Feature Guide

Everything the app can do, in plain language. Each section says **what it does** and **where to find it**.

---

## 1. Dashboard — the screen you actually live in

Built to read like a banking app: one big number, then everything else in order of importance.

| Element | What it tells you |
| --- | --- |
| **Total balance card** | Your all-time balance, huge and unmissable, with money in / money out for the selected month and what you're *expecting* to earn |
| **Hide amounts** | Tap the balance (or the eye) to mask every figure — for when someone is looking over your shoulder. The setting is saved to your account, so it stays hidden on your phone too |
| **Savings rate chip** | The share of this month's income you kept |
| **Quick actions** | Four shortcuts: Add expense · Add income · My pay · Export |
| **Money history strip** | 12 scrollable months with each month's net and the running balance. Tap a month to open it across the whole dashboard |
| **Pay & income card** | Your next payday (with a live countdown) and how much of this month's expected pay has actually landed |
| **Four insights** | Savings rate · average daily spend · biggest expense · spending trend vs last month |
| **Cash-flow chart** | Income vs expenses, last 6 months, plus saved-all-time |
| **Where it goes** | Spending by category for the selected month |
| **Budgets** | Per-category progress bars, red when you go over |
| **Recent transactions** | Your latest five entries, tap to edit |

The month picker (‹ September 2026 ›) drives every month-scoped panel at once.

---

## 2. Money in — however you actually get paid

Most trackers assume a fixed monthly salary. PFT doesn't. **Pay & income** (in the sidebar)
supports every rhythm, and you can have several sources at the same time (a salary *and*
weekend gigs, for example).

| Frequency | Use it when | What PFT does |
| --- | --- | --- |
| **Monthly** | Salary paid on a fixed day (e.g. the 25th) | Dates every payday, counts it down |
| **Twice a month** | Two fixed days (e.g. 1st & 15th) | Handles both dates each month |
| **Every 2 weeks** | A 14-day cycle from a fixed weekday | Walks the real 14-day lattice, so the *dates* are right, not just the count |
| **Weekly** | Same weekday every week | Same, on a 7-day cycle |
| **Per day worked** | A daily wage × days you work | Daily rate × days/week × days in **that** month (so February differs from March) |
| **Per hour** | An hourly rate | Rate × hours/week × weeks in the month |
| **Irregular** | Gig work, tips, one-off jobs | No fake forecast — it asks you to log each payment as it lands |

For each source you set a name, a category, the amount and the schedule. **Active** toggles let
you park a job you've finished without deleting its history.

**Received vs expected.** The dashboard compares what you've logged this month against what your
sources should deliver, so a missing payment is obvious rather than a nasty surprise.

---

## 3. Money out — expenses

- Add, edit and delete any entry; the same form handles income and expenses.
- **Full category set** with colours and icons, so the donut chart and budget bars stay readable.
- **Transactions** screen: filter by **month**, **type** and **category**, plus keyword search
  across descriptions. Entries are grouped by day with a daily total, like a bank statement.
- **Average daily spend** and **biggest expense** surface automatically on the dashboard.

---

## 4. Budgets

Set a monthly limit per expense category. The dashboard and the Budgets screen both show live
progress bars — indigo on track, amber past 80%, red when you've gone over, with the exact
overspend amount. Budgets are per month, so last month's limits aren't silently reused.

---

## 5. History — watching the months add up

**History** is the Monzo-style "where did it all go" view:

- A **12-month ledger**, oldest → newest, each row showing money in, money out, net and the
  **running balance** after that month — so the total visibly climbs and falls as you scroll.
- **Best and worst months**, highest income, heaviest spending, averages and overall savings rate.
- **Biggest single transactions**, answering "what actually cost me the most?".
- A **balance-over-time** chart of the cumulative total.

The dashboard's **money history strip** is the compact version of the same idea, right on the
home screen.

---

## 6. Export, import, share & backup

Everything lives in **Data studio** (sidebar). This is the section that makes your data *yours*.

### Export formats

| Format | Best for |
| --- | --- |
| **Excel workbook (.xlsx)** | Five sheets: **Transactions**, **Monthly Summary**, **Categories**, **Income Plan** and a **Read Me** that explains the file. Column widths and number formats are already set |
| **CSV** | One flat table — opens in anything, ideal for scripts or other apps |
| **Word report (.doc)** | A readable statement of your months, totals and biggest spends — good for sharing |
| **JSON backup** | Everything the app stores, including budgets and pay sources. **This is the file to keep for a full restore** |

You can export **everything or a date range**, and include or exclude the sample/blank template.

### Importing — including the round trip you described

The scenario this was designed for:

1. You have three months of income and expenses in the app.
2. You **export to Excel**.
3. Later you add two more months of rows **directly in Excel**.
4. You **import that file back**.

Import reads `.xlsx`, `.xls`, `.csv` and `.json` backups, understands the columns however they've
been rearranged, and then gives you a choice:

- **Merge** *(default, the safe one)* — adds only rows you don't already have.
- **Replace** — wipes the current ledger and imports the file as the new truth.
- **Preview only** — shows exactly what *would* happen and changes nothing.

Before anything is written you get a **dry-run summary**: how many rows were found, how many are
new, how many are duplicates, how many were skipped as invalid. Then **"Undo last import"**
reverses the whole thing if you don't like the result.

**Duplicate detection is fingerprint-based** — a row is only "already here" if its date, type,
amount, category and description all match an existing entry. So re-importing the same file is
harmless, and editing a row's amount in Excel makes it import as a genuine change.

### Sharing

**Share** produces a ready-to-send text summary of your months and totals. On a phone it opens
the native share sheet (WhatsApp, email, messages); on desktop the summary is copied and the
downloadable file is prepared instead. Files can be shared directly via the Web Share API where
the browser supports it.

### Getting your data out of a dead device

Because the JSON backup contains transactions, budgets and pay sources, restoring is: sign in on
the new device → **Data studio → Import → Replace**. Nothing is ever locked in.

---

## 7. Appearance, currency and privacy

- **24 currencies**, applied consistently everywhere including every chart, export and report.
- **Hide amounts** (see the dashboard section) persists to your account.
- **Light, uncluttered design**: one accent colour, tabular numerals so figures line up, and
  reduced-motion support for anyone who needs it.
- **Mobile-first layout**: sidebar on desktop; on a phone you get a bottom tab bar inside the
  thumb zone, a floating **+** for quick entry, and installable "Add to Home Screen" behaviour.

---

## 8. Speed and reliability

- **Code-split by section.** The Excel library alone is ~150 kB compressed and is only downloaded
  when you actually open the Data studio — so the dashboard paints fast on a phone.
- **Real-time sync.** A change on your phone appears on your laptop without a refresh.
- **Nothing fails silently.** Every read or write error becomes a plain-English banner with
  numbered fixes and a **Try again** button. **Settings → Connection & troubleshooting** runs a
  real write → read → delete test against your own database, and can copy a diagnostics report.

---

## 9. Your data is yours

Signing in with Google scopes every record to your own user ID. Security rules
([firestore.rules](../firestore.rules)) make it impossible for another account to read your
entries — verified: anonymous requests to your database are rejected. Nothing is stored in the
browser; the only thing kept locally is a short-lived auth token, as with any signed-in web app.

