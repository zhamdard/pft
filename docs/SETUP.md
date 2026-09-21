# 🔧 Firebase Setup Guide (≈5 minutes)

This app logs you in with **Google** and stores your data in **Google Cloud (Cloud Firestore)**.
Before anything works you must connect it to your own free Firebase project and paste the config
into the app. Here is exactly how.

> You only do this once. After it's done, run `npm run dev` and sign in.

---

## Step 1 — Create a Firebase project

1. Go to <https://console.firebase.google.com> and sign in with the Google account you want to use.
2. Click **Add project** → give it a name (e.g. `pft-tracker`) → **Create**.
   - You can leave Google Analytics off.

## Step 2 — Enable Google sign-in

1. In the left menu go to **Build → Authentication**.
2. Click **Get started**.
3. Open the **Sign-in method** tab.
4. Click **Google** → toggle **Enable** → click **Save**.
   - The **Project support email** shown here is fine as-is.

## Step 3 — Create the Firestore database

1. In the left menu go to **Build → Firestore Database**.
2. Click **Create database**.
3. Choose a location (e.g. `eur3` / `us-central`) → **Next**.
4. Select **Production mode** → **Create**.
5. On the **Rules** tab, replace the rules with the ones in **`firestore.rules`** and click
   **Publish**:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{userId}/{document=**} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
     }
   }
   ```
   (These rules guarantee only you can read/write your own data.)

## Step 4 — Get your web app config

1. Go to **Project settings** (gear icon → *Project settings*).
2. Scroll to **Your apps** → click the **Web (`</>`)** icon.
3. Give it a nickname (e.g. `pft-web`) → **Register app**.
4. You'll see a `firebaseConfig` object. Copy all seven values.

## Step 5 — Paste it into the app

Open **`src/firebase/config.js`** and replace the placeholders with your real values:

```js
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
}
```

> The bare minimum that must be correct for login + storage is `apiKey`, `authDomain`,
> `projectId`, and `appId`. Fill all of them anyway.

## Step 6 — Run it

```bash
npm install
npm run dev
```

Open **http://localhost:5173** → click **Continue with Google** → done.

---

## 🌍 Authorized domains (only needed when deployed)

Pop-up Google sign-in only works from domains you allow:

1. Firebase console → **Authentication → Settings → Authorized domains**.
2. Add your live domain (for Firebase Hosting it's `yourproject.web.app` and
   `yourproject.firebaseapp.com`, which are pre-added automatically).
3. `localhost` is allowed by default for local dev.

---

## ☁️ Deploy to the web (Firebase Hosting)

```bash
npm install -g firebase-tools
firebase login
# set your project id once:
firebase use --add        # or edit .firebaserc
# deploy hosting + rules:
npm run build
firebase deploy
```

After the first deploy you'll get a URL like `https://yourproject.web.app` — open it on your
computer **or** phone and sign in. Your data follows you everywhere.

---

### Troubleshooting

| Symptom                                     | Fix                                                                 |
| ------------------------------------------- | ------------------------------------------------------------------- |
| "Google sign-in is not configured"          | You haven't filled `src/firebase/config.js` or enabled Google auth. |
| `auth/unauthorized-domain`                  | Add the current domain to Authorized domains (see above).           |
| Blank screen / console shows `auth/invalid-api-key` | The `apiKey`/`projectId` in config.js aren't your real values.      |
| Data disappears between devices             | Ensure the same Google account is signed in on both devices.        |
