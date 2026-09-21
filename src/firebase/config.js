// ============================================================
//  FIREBASE CONFIGURATION
//  ------------------------------------------------------------
//  This file connects the app to YOUR Google / Firebase project.
//  The values below are placeholders — paste your real config here.
//
//  Full 5-minute walkthrough → docs/SETUP.md
//  Short version:
//    1. Go to https://console.firebase.google.com → "Add project"
//    2. In your project: Build → Authentication → Sign-in method
//       → enable "Google"
//    3. Build → Firestore Database → "Create database"
//       → Production mode → pick a region
//    4. Project settings → "Add app" → Web (</>) → copy config,
//       then paste over the placeholders below.
//
//  Your data will then be stored securely in Google Cloud
//  (Firestore), scoped to your Google account — never on a device.
// ============================================================

const firebaseConfig = {
  apiKey: "PASTE_YOUR_API_KEY",
  authDomain: "PASTE_YOUR_PROJECT.firebaseapp.com",
  projectId: "PASTE_YOUR_PROJECT_ID",
  storageBucket: "PASTE_YOUR_PROJECT.appspot.com",
  messagingSenderId: "PASTE_YOUR_SENDER_ID",
  appId: "PASTE_YOUR_APP_ID",
}

export default firebaseConfig
