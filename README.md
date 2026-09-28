# PFT — Personal Finance Tracker 💰

A clean, minimal, professional web app to **track your pay and expenses from anywhere**.
Sign in with your **Google account** — every entry is saved securely to your own **Google Cloud
(Firestore)**, so it syncs across any device, anywhere, anytime. Nothing is stored locally.

![stack](https://img.shields.io/badge/stack-React%2019%20%2B%20Vite%20%2B%20Firebase-6366f1)

**Live:** <https://pft-t-80b51.web.app> — open it on your phone and use *Add to Home Screen*
(see [On your phone](#-on-your-phone)).

---

## ✨ Features

- 🔐 **Google sign-in** — one tap, no passwords, fully private to your account
- 🏦 **Banking-style dashboard** — one big balance, quick actions, a 12-month money strip and a payday countdown
- 💵 **Pay however you get paid** — monthly, twice a month, every 2 weeks, weekly, per day, per hour or irregular
- 📅 **Payday forecasting** — the next payday counted down, and received vs expected for the month
- ➕ **Transactions** — add / edit / delete income & expense entries
- 🔎 **Search & filters** — by category, type, month, and keyword
- 📈 **History** — a 12-month ledger with a running balance that climbs and falls as you scroll
- 🍩 **Spending breakdown** — where your money goes, by category
- 🎯 **Budgets** — set monthly limits per category with progress bars
- 📤 **Export** — Excel (.xlsx), CSV, Word (.doc) and JSON backup, for any date range
- 📥 **Import & sync** — merge an edited spreadsheet back in, with preview, undo and duplicate detection
- 🤝 **Sharing** — the native share sheet on mobile, a copyable summary on desktop
- 💱 **Currency** — 24 currencies, applied everywhere
- 🙈 **Privacy** — hide every amount with one tap, synced to your account
- 📱 **Mobile-first** — sidebar on desktop; on phones a 4-tab bar with a raised add button and an overflow menu for the rest
- 🍎 **iOS-ready** — installs to the Home Screen as a real app icon, respects the notch and home indicator, and never zooms when you tap a field
- ☁️ **Cloud-backed** — real‑time sync, accessible on any device


> Full feature guide, including pay rhythms, export/import round trips and sharing →
> **[docs/FEATURES.md](docs/FEATURES.md)**


---

## 🧱 Tech Stack

| Layer      | Choice                                |
| ---------- | ------------------------------------- |
| Frontend   | React 19 + Vite 8                     |
| Styling    | Tailwind CSS v4 (custom design system)|
| Charts     | Recharts 3                            |
| Icons      | lucide-react                          |
| Auth       | Firebase Authentication (Google)      |
| Spreadsheets | SheetJS (xlsx) — loaded only when you open Data studio |
| Database   | Cloud Firestore (Google Cloud)        |
| Hosting    | Firebase Hosting / any static host    |

---

## 🚀 Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Connect Firebase (≈5 minutes)

You need a free Google Firebase project. Full walkthrough → **[docs/SETUP.md](docs/SETUP.md)**.
In short:

1. Go to [console.firebase.google.com](https://console.firebase.google.com) → **Add project**
2. **Authentication** → Sign-in method → enable **Google**
3. **Firestore Database** → Create database (**Production mode**, pick a region)
4. **Project settings** → *Your apps* → **Add app** → **Web (</>)** → copy the config
5. Paste it into **`src/firebase/config.js`**

### 3. Run locally

```bash
npm run dev
```

Open http://localhost:5173 and sign in with Google.

> **Sign-in is resilient by design.** If your browser blocks or closes the Google popup, the app
> automatically continues the same sign-in as a full-page redirect instead of leaving you on a
> silent screen. Any problem is shown in plain English with the exact steps to fix it.
>
> Sign-in trouble? → **[docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)**, or click
> **“Having trouble signing in?”** on the sign-in page to run in-app checks.
>
> When deployed, add your domain to Firebase → Authentication → Settings → **Authorized domains**.

### 4. Deploy so you can use it anywhere 🚀

**Recommended: GitHub Pages — free, HTTPS, and redeploys on every push.**

Full walkthrough → **[docs/DEPLOY_GITHUB.md](docs/DEPLOY_GITHUB.md)** (about 5 minutes).

The short version — **one command** (GitHub CLI is already installed, and a publisher
script is included):

```powershell
powershell -ExecutionPolicy Bypass -File scripts\publish-to-github.ps1
```

Or double-click **`scripts\Publish-to-GitHub.cmd`**. It signs you in, creates the repo,
pushes, and enables GitHub Pages, then prints your live link.

Doing it by hand instead:

```bash
git remote add origin https://github.com/YOUR-USERNAME/pft.git
git push -u origin main
```

Then on GitHub: **Settings → Pages → Source = GitHub Actions**.

Your app goes live at `https://YOUR-USERNAME.github.io/pft/`.

> ⚠️ **One required step after deploying:** add `YOUR-USERNAME.github.io` to
> Firebase → Authentication → Settings → **Authorized domains**, or Google will refuse
> to sign you in on the live site. `localhost` is pre-approved; your live domain is not.

The included workflow (`.github/workflows/deploy.yml`) runs the tests and builds the app
on every push to `main`, so updates ship automatically.

**Or Firebase Hosting** — also free, and its project domains are *already* authorized for Google
sign-in, so there is no domain step at all. Full guide →
**[docs/DEPLOY_FIREBASE.md](docs/DEPLOY_FIREBASE.md)**:

```powershell
npm install -g firebase-tools   # once
firebase login                  # once
npm run deploy                  # build + deploy
```

Your app goes live at `https://pft-t-80b51.web.app`.

> **Works from any path.** The build uses relative asset paths (`base: './'`), so it runs
> correctly from a GitHub Pages subpath, a custom domain, or the domain root.

---

## ✅ Verifying your setup

```bash
npm test            # 27 logic tests — sorting, history maths, pay projection, nav coverage
npm run test:render # 19 render smoke tests — the navigation shells actually mount
npm run verify      # both suites, then a production build
```

Then, inside the running app:

- **Sign-in page** → “Having trouble signing in?” runs live checks.
- **Settings → Connection & troubleshooting → Run connection test** performs a real
  write → read → delete on your own database.

---

## 📱 On your phone

Open the live URL in **Safari** (iOS only allows Home Screen installs from Safari) → **Share** →
**Add to Home Screen**. It then opens full-screen with its own icon, like a native app. On Android,
Chrome offers **Install app** automatically.

The phone layout is deliberately different from the desktop one, because a phone is not just a
narrow laptop:

| | Desktop | Phone |
| --- | --- | --- |
| Navigation | Sidebar, all 7 sections visible | 4 bottom tabs + an overflow menu, `MoreSheet` |
| Primary action | “Add” button in the toolbar | Raised centre button in the tab bar |
| Modals | Centred dialog | Full-screen sheet |

**Why only 4 tabs?** Seven tabs across a 375 px screen gives each one ~47 px, which is under the
44 px minimum tap target Apple recommends — you end up mis-tapping. The four you reach for most
(Dashboard, Transactions, History, Pay & income) stay on the bar; Budgets, Data studio and Settings
live one tap away in the menu. `npm test` asserts that every destination is still reachable *and*
that the bar never grows past four tabs, so this can't silently regress.

A few iOS-specific things are handled for you, all in
[`src/styles/main.css`](src/styles/main.css) and [`index.html`](index.html):

- **No accidental zoom** — iOS zooms the whole page forever if an input's text is under 16 px, so
  fields are forced to a 16 px minimum. Buttons are deliberately excluded, since enlarging them
  would break the layout without any benefit.
- **Correct viewport height** — `100dvh` instead of `100vh`, so the layout doesn't hide behind
  Safari's collapsing address bar.
- **Safe areas** — the header clears the notch and the tab bar clears the home indicator via
  `env(safe-area-inset-*)`.
- **No rubber-band scrolling** of the page behind a modal (`overscroll-behavior`).
- **No format detection** — iOS won't turn long numbers into blue phone-number links.
- **Home Screen icons** — real PNGs at 180/192/512 px, generated by `npm run icons`.

---

## 📁 Project Structure

```
src/
├── main.jsx / App.jsx        # entry + app shell + routing (state-based)
├── firebase/config.js        # <-- paste your Firebase config here
├── firebase/firebase.js      # Firebase init + re-exported helpers
├── context/UserContext.jsx   # auth + user preferences (currency, privacy)
├── context/DataHealthContext.jsx  # surfaces Firestore read failures to the UI
├── services/                 # Firestore CRUD + connection diagnostics
├── hooks/                    # live-subscription React hooks + income sources
├── utils/
│   ├── money.js / date.js    # currency + date helpers
│   ├── stats.js / history.js # month totals, insights, 12-month trail
│   ├── earnings.js           # pay schedules & income projection
│   └── dataTransfer.js       # Excel / CSV / Word / JSON import & export
├── data/                     # category definitions
├── components/
│   ├── ui/                   # design system (buttons, cards, form, modal, toast)
│   ├── layout/               # sidebar, mobile nav, overflow menu, top bar, appNav.js
│   ├── charts/               # cash-flow & donut charts
│   ├── DataHealthBanner.jsx  # explains (and fixes) database access problems
│   └── dashboard/            # balance hero, history strip, payday card, quick actions
└── pages/                    # Login, Dashboard, Transactions, History, Pay & income,
                              #   Budgets, Data studio, Settings

tests/
├── logic.test.js             # node --test — pure functions            (npm test)
└── render/                   # nav shells actually mount               (npm run test:render)

scripts/
└── make-icons.cjs            # draws the PNG app icons                 (npm run icons)
```

---

## 🔒 Security

Firestore rules ([firestore.rules](firestore.rules)) enforce that **each user can only read and
write their own data** under `users/{uid}/…`. Your information is never visible to other users.

---

## 🧭 Team & Research

Created as a full product build — see **[docs/TEAM_AND_RESEARCH.md](docs/TEAM_AND_RESEARCH.md)**
for the team, the research, and the decisions behind this app.

---

## 🩺 Troubleshooting

- **Sign-in problems** → **[docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)**
- **In-app diagnosis** — the sign-in page has a “Having trouble signing in?” panel, and
  **Settings → Connection & troubleshooting** runs a real write → read → delete test against
  your own database.
- **Database errors** — a banner explains the exact cause (rules, missing database, offline) and
  gives you a **Try again** button; nothing fails silently.

---

Made with ❤️ by **PFT Studio**.
