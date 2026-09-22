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
  apiKey: "AIzaSyD4I2LEvS4CZrmad0dMFdDCHCfxde2S9RI",
  authDomain: "pft-t-80b51.firebaseapp.com",
  projectId: "pft-t-80b51",
  storageBucket: "pft-t-80b51.firebasestorage.app",
  messagingSenderId: "817356521725",
  appId: "1:817356521725:web:79778ac3fb36f52412be94"
}

export default firebaseConfig
