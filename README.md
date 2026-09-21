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

> The popup sign-in works on `localhost` automatically. When deployed, add your domain to
> Firebase → Authentication → Settings → **Authorized domains**.

### 4. Optional: deploy with Firebase Hosting

```bash
npm install -g firebase-tools
firebase login
# set your project id in .firebaserc (or run: firebase use --add)
npm run build
firebase deploy
```

---

## 📁 Project Structure

```
src/
├─ main.jsx / App.jsx        # entry + app shell + routing (state-based)
├─ firebase/config.js        # <-- paste your Firebase config here
├─ firebase/firebase.js      # Firebase init + re-exported helpers
├─ context/UserContext.jsx   # auth + user preferences (currency)
├─ services/                 # Firestore CRUD (transactions, budgets)
├─ hooks/                    # live-subscription React hooks
├─ utils/                    # date, money & statistics helpers
├─ data/                     # category definitions
├─ components/
│  ├─ ui/                    # design system (buttons, cards, form, modal, toast)
│  ├─ layout/                # sidebar, mobile nav, top bar
│  ├─ charts/                # cash-flow & donut charts
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

Made with ❤️ by **PFT Studio**.
