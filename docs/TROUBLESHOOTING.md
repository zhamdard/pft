# 🩺 Troubleshooting

## “I signed in with Google and nothing happened”

The Google window opens, you pick your account, it closes — and the app is still on the sign-in
page. This is the **most common** problem, and it is almost never a bug in the app itself: Google
finished the sign-in, but the result never made it back into the page.

### What was found and fixed in this project

A full audit of the sign-in path was run against this repository's Firebase project. Results:

| Check | Result |
| ----- | ------ |
| Google provider enabled | ✅ enabled (real OAuth client issued) |
| Sign-in relay `authDomain` reachable | ✅ HTTP 200 |
| Firestore database exists | ✅ present, rules require auth |
| Firebase config in `config.js` | ✅ correct for project `pft-t-80b51` |

So the project itself is healthy. The original code, however, had **four silent failure
points** that turned a recoverable hiccup into a dead end:

1. **Popup-only sign-in.** If the browser blocked the popup handshake, nothing else was tried.
2. **Errors were swallowed.** `auth/popup-closed-by-user` was ignored with no message, so a lost
   handshake looked identical to a cancelled window.
3. **A redirect was never awaited properly.** `getRedirectResult()` and `onAuthStateChanged()`
   raced, so a returning redirect sign-in could be treated as “signed out”.
4. **Firestore needed a composite index.** The transactions query sorted by two fields at once;
   without a deployed index the read fails — which the user sees as “my data vanished”.

All four are fixed:

- **Redirect sign-in is the automatic fallback.** If the popup is blocked, closed early, or the
  environment can’t do popups, the app immediately continues the same sign-in as a full-page
  redirect (the reliable path on mobile and in Safari/Firefox).
- **Every error is now shown, in plain English.** Each Firebase code maps to a specific cause and
  numbered steps to fix it (`src/utils/authErrors.js`).
- **Auth readiness is now explicit.** The app waits for *both* the redirect result and the first
  auth-state event before deciding you are signed out (`src/context/UserContext.jsx`).
- **No index required.** Sorting now happens in the browser (`src/utils/sort.js`), and any
  Firestore read failure raises a banner with instructions instead of an empty dashboard.

---

## Diagnose it yourself (no developer tools needed)

### On the sign-in screen

Click **“Having trouble signing in?”**. It runs live checks in the page:

- is the Firebase config connected?
- does this browser allow the storage Google needs? (private mode often blocks it)
- is the site online?
- is the Google sign-in relay reachable?

Then press **Copy report** — it includes your project id, sign-in method and the last error code.

### After you are signed in

**Settings → Connection & troubleshooting → Run connection test.** This performs a real
**write → read → delete** against your own database, proving that sign-in *and* cloud storage work.
It also shows which page address you are on and which sign-in method was used.

---

## The five usual causes

### 1. Ad-blocker or privacy extension
Extensions that block third-party cookies/frames break the popup handshake. The sign-in then
completes at Google and can never reach the app.

**Fix:** allow the site in the extension, or try a private window with extensions disabled, or
press “Trouble signing in? Open Google in this tab instead”.

### 2. Private / incognito mode, or strict tracking protection
Google sign-in needs local storage. If it is blocked you get
`auth/web-storage-unsupported`.

**Fix:** use a normal window, or allow cookies for the site.

### 3. The page address isn’t an authorized domain
Google only returns sign-ins to approved addresses. `localhost` is pre-approved; anything else is
not.

**Fix:** Firebase console → **Authentication → Settings → Authorized domains → Add domain**.
Your exact current address is shown in Settings → Connection & troubleshooting.

### 4. Firestore rules were never published
Reading works only under `/users/{uid}` for the signed-in owner. If the default rules are still in
place (or rules are missing), reads fail and the app looks empty.

**Fix:** Firebase console → **Firestore Database → Rules** → paste `firestore.rules` → **Publish**.

### 5. Firestore database was never created
Every read fails with `not-found`.

**Fix:** Firebase console → **Build → Firestore Database → Create database** → Production mode.

---

## Reading the error messages

| On-screen message | Meaning | Fix |
| ----------------- | ------- | --- |
| “Your database rules are blocking access” | Signed in, but rules deny the read | Publish `firestore.rules` |
| “Your Firestore database doesn’t exist yet” | No database in the project | Create the database |
| “Couldn’t reach your database” | Network drop, or Firestore API disabled | Check connection, press **Try again** |
| “Your browser blocked the sign-in popup” | Popup suppressed | Allow popups, or use the redirect link |
| “This address isn’t allowed for Google sign-in” | Domain not authorized | Add it in Authentication → Settings |
| “Google sign-in isn’t enabled yet” | Provider switched off | Enable Google in Sign-in method |
| “Your browser blocks the storage Google needs” | Private mode / strict protection | Use a normal window |

---

## Still stuck?

1. Press **Copy report** (sign-in screen) or **Copy diagnostics** (Settings) and keep the text.
2. Hard-reload the page with **Ctrl + Shift + R** to rule out a cached bundle.
3. Confirm the app is running the latest build: `npm run build` should finish without errors.
