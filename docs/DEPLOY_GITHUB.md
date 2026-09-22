# 🌍 Hosting PFT on GitHub Pages (free, access from anywhere)

After this you will have a **link you can open anywhere** like:

```
https://your-username.github.io/pft/
```

Open it on your phone, your laptop, anywhere — the same data, synced through your
Google account. Total cost: **$0**. Needs about **5 minutes**.

> **Why GitHub Pages?** It is free, gives you HTTPS automatically (which Google sign-in
> requires), and redeploys every time you push. No servers to run, nothing to pay.

---

## Step 1 — Create the repository on GitHub

1. Go to **https://github.com/new**
2. **Repository name:** `pft` (lowercase is simplest)
3. **Visibility:** `Private` is fine — GitHub Pages works from private repos on free
   accounts too. Pick `Public` if you want to show it off.
4. **Do NOT** tick "Add a README", ".gitignore" or "license" — you already have those
   files, and adding them causes a merge conflict on your first push.
5. Click **Create repository**.

---

## Step 2 — Push this project to it

Open a terminal in the project folder and run these commands.

> ⚠️ **Replace `YOUR-USERNAME` with your real GitHub username.**

```bash
cd "c:\Users\amiri\OneDrive\Desktop\PFT"

git remote add origin https://github.com/YOUR-USERNAME/pft.git
git branch -M main
git push -u origin main
```

If Git asks you to sign in, choose **Sign in with your browser** (easiest), or create a
Personal Access Token at https://github.com/settings/tokens and use it as the password.

**Already pushed before?** Just run `git push`.

---

## Step 3 — Turn on GitHub Pages

1. Open your new repository on GitHub.
2. Click **Settings** in the top bar.
3. In the left sidebar click **Pages**.
4. Under **Build and deployment → Source**, choose **GitHub Actions**.
5. Done — no branch or folder to select.

Now open the **Actions** tab. You will see a workflow called **"Deploy to GitHub Pages"**
running. It builds the app, runs the tests, and publishes it.

- ✅ Green tick → your app is live.
- ❌ Red cross → click the run to see which step failed (see Troubleshooting below).

Your link appears in two places:

- **Settings → Pages**, at the top ("Your site is live at…")
- The **deploy** job summary in the Actions tab

The address is `https://YOUR-USERNAME.github.io/pft/`

> **Note:** the first deployment occasionally needs a second run. If you get a 404 right
> after a successful build, go to **Actions → Deploy to GitHub Pages → Re-run all jobs**.

---

## Step 4 — ⚠️ Allow the new address in Firebase (don't skip this!)

**This is the step people miss, and it is the one that breaks Google sign-in.**

Firebase only lets Google return a sign-in to domains you have explicitly approved.
`localhost` is approved automatically, but `your-username.github.io` is not.

1. Copy your address from the browser bar, e.g. `your-username.github.io`
   (no `https://`, no trailing slash, no `/pft`).
2. Open the **Firebase console** → project `pft-t-80b51` → **Build** → **Authentication**.
3. Open the **Settings** tab → **Authorized domains**.
4. Click **Add domain**, paste `your-username.github.io`, click **Add**.
5. Open your live site, refresh, and sign in with Google.

That's it. 🎉 Add an expense on your laptop and watch it appear on your phone.

---

## 📱 Install it like a real app (optional, recommended)

The app ships with a web manifest, so once hosted you can install it:

- **Android / Chrome:** open the site → ⋮ menu → **Add to Home screen / Install app**
- **iPhone / Safari:** open the site → Share → **Add to Home Screen**
- **Desktop / Chrome or Edge:** the install icon in the address bar

It then opens full-screen without browser chrome, like a native app.

---

## 🔄 Updating the app later

Any push to `main` redeploys automatically:

```bash
cd "c:\Users\amiri\OneDrive\Desktop\PFT"
git add -A
git commit -m "describe what changed"
git push
```

Watch it go live in the **Actions** tab (~1 minute).

---

## 🔎 Troubleshooting

| Symptom | Cause & fix |
|---|---|
| **Actions tab has no workflow** | `.github/workflows/deploy.yml` wasn't pushed. Run `git add -A && git commit -m "add workflow" && git push`. |
| **"Get Pages site failed" in Actions** | Pages source isn't set to "GitHub Actions". Redo Step 3. |
| **Site loads but is blank or unstyled** | Stale cache — hard-refresh with `Ctrl+Shift+R`. |
| **`auth/unauthorized-domain` when signing in** | Step 4 wasn't done, or you typed the domain with `https://` or a trailing `/`. Add exactly `your-username.github.io`. |
| **`npm ci` fails in Actions** | `package-lock.json` is out of sync. Run `npm install` locally, commit `package-lock.json`, push. |
| **404 at your-username.github.io/pft/** | Wait 1–2 minutes on the first deploy, then re-run the job from the Actions tab. |
| **Stuck and unsure why** | Open the app → **Settings → Connection & troubleshooting → Run connection test**. It verifies sign-in and the database and tells you exactly what's wrong. |

---

## ✅ Verifying the build is correct for hosting

Run this locally before pushing — it catches broken asset paths, which are the number
one cause of a blank page on GitHub Pages:

```powershell
npm run build
Select-String -Path dist\index.html -Pattern 'src=|href='
```

Every path must be **relative** (`./assets/...`, `./favicon.svg`).
An absolute `/assets/...` would 404 on GitHub Pages and render a blank page.

This project is already configured correctly via `base: './'` in `vite.config.js`.

---

## 🤔 Alternative: Firebase Hosting (also free)

GitHub Pages is great, but Firebase Hosting has one advantage: `*.web.app` and
`*.firebaseapp.com` addresses are **already authorized** for sign-in, so Step 4 becomes
optional.

```bash
npm install -g firebase-tools
firebase login
firebase use --add          # pick your project
npm run build
firebase deploy
```

You get `https://your-project.web.app`. Both hosts can run at the same time — the two
addresses are independent, so keep both in Authorized domains if you use both.

---

## 🔒 A note about security (please read once)

`src/firebase/config.js` contains an **API key**. Publishing it to GitHub is **safe and
is exactly how Firebase is designed to work**:

- The API key is a *project identifier*, not a password. It is visible in the source of
  every Firebase web app in existence.
- Your financial data is **not** protected by that key — it is protected by the
  **Firestore security rules** in `firestore.rules`, which only allow access when the
  signed-in user's ID matches the folder being read. A live check against your project
  confirmed anonymous reads are rejected (HTTP 403).
- With a **private** repo, nobody can even read the key.

**Never** add these to a client-side file: service-account JSON, private keys, or
`FIREBASE_PRIVATE_KEY`. Those are genuine secrets, and this app never needs them.

**Optional hardening:** enable **Firebase App Check** (Firebase console → Build → App
Check) with reCAPTCHA v3. It rejects traffic that isn't from your real app, even if
someone copies your config.

---

## 📋 Deployment checklist

- [ ] Repository created on GitHub (no README/gitignore)
- [ ] `git push -u origin main` succeeded
- [ ] Settings → Pages → Source = **GitHub Actions**
- [ ] Actions tab shows a green ✅
- [ ] `https://YOUR-USERNAME.github.io/pft/` opens the sign-in screen
- [ ] `your-username.github.io` added to Firebase **Authorized domains**
- [ ] Google sign-in works on the live URL
- [ ] Added to phone home screen 📱

