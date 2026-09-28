# Deploying PFT to Firebase Hosting

Firebase Hosting is the **safer** of the two hosting options, and it is what Google
recommends for apps that use Firebase Auth. Here's why, and how to do it.

---

## Why this is safer than GitHub Pages

| | GitHub Pages | Firebase Hosting |
| --- | --- | --- |
| Google sign-in domain | You must **manually** add `your-name.github.io` under Authentication → Authorized domains, or Google refuses to sign in | The project's own domains (`pft-t-80b51.web.app` and `pft-t-80b51.firebaseapp.com`) are **already authorized** — nothing to configure |
| HTTPS certificate | Provided | Provided, on every domain including custom ones |
| SPA routing | Needs the `public/404.html` redirect trick | Real server-side rewrite (`firebase.json` already has it) |
| CDN | GitHub's | Google's global CDN, with per-asset caching headers already configured |
| Custom domain | Possible, but domain verification is manual | Built into the console, free SSL |

The sign-in row is the important one: **the single most common cause of "Google sign-in does
nothing" is a domain that isn't authorized.** On Firebase Hosting the domain is authorized before
you ever deploy, so that whole class of problem disappears.

> Note: a **custom** domain (like `money.example.com`) still has to be added to
> Authentication → Authorized domains by hand. It's only the two `*.web.app` /
> `*.firebaseapp.com` project domains that come pre-authorized.

---

## What's already set up for you

You don't need to write any config. These are done:

- **`.firebaserc`** → points at your project (`pft-t-80b51`)
- **`firebase.json`** → serves `dist/`, rewrites every URL to `/index.html` (so a refresh on any
  screen works), and sets `Cache-Control: public, max-age=31536000, immutable` on `/assets/**`
- **`package.json`** → `npm run deploy` builds and deploys in one step

---

## Deploy it

### 1. Install the Firebase CLI (once)

```powershell
npm install -g firebase-tools
```

If you'd rather not install it globally, prefix the commands below with `npx` instead
(`npx firebase-tools login`).

### 2. Sign in (once)

```powershell
firebase login
```

This opens your browser and asks you to authorize the CLI with **your own Google account**. This
is an interactive step that only you can complete.

### 3. Deploy

```powershell
cd "c:\Users\amiri\OneDrive\Desktop\PFT"
npm run deploy
```

That runs `vite build` and then `firebase deploy --only hosting`. When it finishes it prints your
live URLs:

```
Hosting URL: https://pft-t-80b51.web.app
```

Open it, sign in with Google, and you're done — on any device.

### Also deploy the database rules (when you change `firestore.rules`)

```powershell
npm run deploy:rules
```

Or deploy everything at once:

```powershell
npm run deploy:all
```

---

## Adding a custom domain (optional)

1. Firebase console → **Hosting** → **Add custom domain**
2. Enter your domain and follow the DNS instructions (a `TXT` record to prove ownership, then an
   `A`/`CNAME` record)
3. Wait for the certificate to be provisioned (usually minutes, sometimes up to 24 hours)
4. **Then** add that domain under **Authentication → Settings → Authorized domains**, or sign-in
   will fail on it

---

## What it costs

The free **Spark** plan includes, per project:

- **10 GB/month** of data transfer from the CDN
- **10 GB** of stored site files

For a personal finance app that's an enormous amount of headroom — a full page load is roughly
1 MB, so 10 GB/month is on the order of ten thousand visits. If you somehow exceed it on Spark,
Google disables the site until the next month; on the Blaze (pay-as-you-go) plan it's
`$0.15` per extra GB instead.

You do **not** need Blaze to use Firebase Hosting. Your Firestore database also sits comfortably
inside Spark.

---

## Running both hosts (they don't conflict)

There's no reason to choose. Both point at the same Firebase project and the same Firestore data,
so your entries are identical on either URL.

- **Firebase Hosting** — `https://pft-t-80b51.web.app` (sign-in works out of the box)
- **GitHub Pages** — `https://zhamdard.github.io/pft/` (needs the authorized-domain step once)

If you keep the GitHub Pages site, the one-time setup is:

1. https://console.firebase.google.com/project/pft-t-80b51/authentication/settings
2. **Authorized domains** → **Add domain** → `zhamdard.github.io` (no `https://`, no `/pft`)

Then either host works. If you'd rather only maintain one, just stop pushing to GitHub — the
GitHub Pages workflow will simply stop publishing.

---

## Installing it on your iPhone

Once it's live, on the phone:

1. Open the site in **Safari** (not Chrome — iOS only allows Add to Home Screen from Safari)
2. Tap the **Share** button
3. Tap **Add to Home Screen**
4. Tap **Add**

You now have a real app icon that opens full-screen with no browser chrome. PFT is built for this:
it declares a standalone web app manifest, ships proper iOS icons
(`public/apple-touch-icon.png`), respects the notch and home indicator, and won't zoom the page
when you tap a field.

---

## Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| `Error: Failed to get Firebase project` | You're not signed in, or `.firebaserc` names a project your account can't see. Run `firebase login` and `firebase use --add` |
| `Error: HTTP Error: 403` on deploy | You're signed in as a Google account that isn't an owner/editor of the project |
| Deploy succeeds but the page is blank | The build output wasn't produced. Run `npm run build` on its own and check it finishes, then re-deploy |
| Sign-in works locally but not on the live URL | The domain isn't authorized. Add it under Authentication → Settings → **Authorized domains** |
| Old version still showing | Hard-refresh (Ctrl/Cmd + Shift + R). `index.html` is deliberately *not* long-cached, but your browser may still hold it |

---

## Regenerating the app icons

The icons are drawn in code, so you can restyle them without any design tools:

```powershell
npm run icons
```

That rewrites `public/apple-touch-icon.png`, `public/icon-192.png` and `public/icon-512.png` from
`scripts/make-icons.cjs`.

