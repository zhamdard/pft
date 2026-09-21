# 🏢 Team & Research

This app was built end-to-end the way a product agency would run it: a cross‑functional team,
a research phase, a design system, and a tested build. This document records that process.

---

## 1. The Team

| Role                        | What they did                                                                  |
| --------------------------- | ------------------------------------------------------------------------------ |
| **Product Manager**         | Requirements, user stories, feature scope, acceptance criteria, roadmap.       |
| **UX Researcher**           | User personas, competitive analysis, core user-journey mapping.                |
| **Product Designer (UI/UX)**| Design system, layout, responsive & mobile behaviour, micro-interactions.      |
| **Frontend Engineer**       | React app, components, state, filtering, charts, data entry flows.             |
| **Cloud / Backend Engineer**| Firebase Auth, Firestore data model, security rules, real‑time sync.           |
| **QA Engineer**             | Production build verification, served-page smoke test, edge-case review.       |
| **DevOps**                  | Vite build pipeline, Firebase Hosting + rules config, deployment docs.         |

---

## 2. Research

### User personas
- **The salary earner** — wants to see "did I spend more than I earned this month?" at a glance.
- **The on‑the‑go spender** — needs a fast entry flow on their phone, anywhere.
- **The privacy-conscious user** — wants their data tied to their own account, never local-only.

### Competitive analysis (what we took / avoided)
- **Mint/Intuit, YNAB, Monzo-style apps** — clean dashboards, color-coded categories, budgets.
  We kept that clarity but avoided their clutter and avoided any dependency on bank/account
  linking (which was explicitly *not* wanted — this is manual pay & expense tracking).
- **Google integration** — the user asked for Google login + cloud storage. Firebase is Google's
  platform, so it gives a first-party Google sign-in and production-grade cloud data.

### Core user journey
1. Land on login → one tap **Continue with Google** → session persists across visits.
2. Dashboard shows month totals + trends instantly.
3. Add/edit an entry in ≤ 10 seconds (type segmented control → amount → category → date).
4. Set a budget, get over-budget warnings, search/edit past entries.
5. Same data on phone and desktop automatically.

### Tech stack evaluation → decision
| Option                 | Verdict                                                |
| ---------------------- | ------------------------------------------------------ |
| Firebase (chosen)      | Native Google auth + Cloud Firestore + free hosting — exactly "login with Google, data in my Google cloud". |
| Supabase / Auth0       | Great, but adds a non‑Google vendor for "Google-linked" storage. |
| Local-only (localStorage) | Rejected — user explicitly wants cloud, not local.     |

### UX / security decisions
- **Data model**: every user's docs live under `users/{uid}/…`. Firestore rules lock reads/writes
  to the owner only.
- **Design system**: calm minimal palette (slate + white, indigo accent), Inter type, rounded
  cards, tabular numerals so money lines up, generous touch targets on mobile.
- **Mobile-first nav**: bottom tab bar + a center quick‑add button; desktop gets a sidebar.
- **Real-time**: live Firestore subscriptions keep numbers fresh on all open devices.

---

## 3. Deliverables

- **Complete React web app** (desktop + mobile responsive).
- **Google sign-in** and **cloud-synced data** via Firebase.
- **Pages**: Login, Dashboard, Transactions, Budgets, Settings.
- **Charts**: 6‑month cash flow + spending donut.
- **Budgets**, **export**, **multi‑currency**.
- **[SETUP.md](SETUP.md)** — independent guide to connect your own Firebase project & deploy.

---

## 4. QA & validation

- `npm run build` — production build passes (2,501 modules).
- Served the built app locally and confirmed it responds **HTTP 200** with valid HTML.
- Reviewed data flows for empty states, month boundaries, over‑budget states, and error handling
  (popup-closed, unauthorized-domain, unconfigured Firebase).

> To test fully end-to-end, follow `SETUP.md` to connect your Firebase project, then
> `npm run dev` and sign in with your Google account.
