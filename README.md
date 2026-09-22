# PFT — Personal Finance Tracker 💰

A clean, minimal, professional web app to **track your pay and expenses from anywhere**.
Sign in with your **Google account** — every entry is saved securely to your own **Google Cloud
(Firestore)**, so it syncs across any device, anywhere, anytime. Nothing is stored locally.

![stack](https://img.shields.io/badge/stack-React%2019%20%2B%20Vite%20%2B%20Firebase-6366f1)

---

## ✨ Features

- 🔐 **Google sign-in** — one tap, no passwords, fully private to your account
- 📊 **Dashboard** — monthly income, expenses, net saved & savings rate
- 📈 **Cash-flow chart** — income vs expenses over the last 6 months
- 🍩 **Spending breakdown** — where your money goes, by category
- ➕ **Transactions** — add / edit / delete income & expense entries
- 🔎 **Search & filters** — by category, type, month, and keyword
- 🎯 **Budgets** — set monthly limits per category with progress bars
- 🏦 **Currency** — 24 currencies, applied everywhere
- 💾 **Export** — download your data as JSON anytime
- 📱 **Responsive** — sidebar on desktop, bottom nav + quick-add on mobile
- ☁️ **Cloud-backed** — real‑time sync, accessible on any device

---

## 🧱 Tech Stack

| Layer      | Choice                                |
| ---------- | ------------------------------------- |
| Frontend   | React 19 + Vite 8                     |
| Styling    | Tailwind CSS v4 (custom design system)|
| Charts     | Recharts 3                            |
| Icons      | lucide-react                          |
| Auth       | Firebase Authentication (Google)      |
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

### 4. Optional: deploy with Firebase Hosting

```bash
npm install -g firebase-tools
firebase login
# set your project id in .firebaserc (or run: firebase use --add)
npm run build
firebase deploy
```

---

## ✅ Verifying your setup

```bash
npm test        # 16 logic tests (sorting + error messages)
npm run build   # production build must finish without errors
```

Then, inside the running app:

- **Sign-in page** → “Having trouble signing in?” runs live checks.
- **Settings → Connection & troubleshooting → Run connection test** performs a real
  write → read → delete on your own database.

---

## 📁 Project Structure

```
src/
├─ main.jsx / App.jsx        # entry + app shell + routing (state-based)
├─ firebase/config.js        # <-- paste your Firebase config here
├─ firebase/firebase.js      # Firebase init + re-exported helpers
├─ context/UserContext.jsx   # auth + user preferences (currency)
├─ context/DataHealthContext.jsx  # surfaces Firestore read failures to the UI
├─ services/                 # Firestore CRUD + connection diagnostics
├─ hooks/                    # live-subscription React hooks
├─ utils/                    # date, money, statistics, sorting, error messages
├─ data/                     # category definitions
├─ components/
│  ├─ ui/                    # design system (buttons, cards, form, modal, toast, alert)
│  ├─ layout/                # sidebar, mobile nav, top bar
│  ├─ charts/                # cash-flow & donut charts
│  ├─ DataHealthBanner.jsx   # explains (and fixes) database access problems
│  └─ dashboard/             # stat cards, recent list, budget progress
└─ pages/                    # Login, Dashboard, Transactions, Budgets, Settings
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
