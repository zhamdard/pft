import { initializeApp } from 'firebase/app'
import {
  getAuth,
  browserLocalPersistence,
  setPersistence,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth'
import {
  getFirestore,
  serverTimestamp,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from 'firebase/firestore'
import firebaseConfig from './config'

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)

/**
 * Keep the Google session across refreshes, tabs and app restarts.
 *
 * Deliberately NOT called at module load: Firebase warns that changing
 * persistence while a redirect is in flight can discard the pending result —
 * and a discarded redirect result is exactly the "I signed in and nothing
 * happened" bug. UserContext calls this once the redirect has been handled.
 * The web SDK already defaults to local persistence, so this re-asserts it.
 */
export function ensureAuthPersistence() {
  return setPersistence(auth, browserLocalPersistence).catch((err) => {
    console.warn('[PFT] Persistent sign-in unavailable:', err?.code || err)
  })
}

// Ask Google/Firebase for error messages in the user's language.
try {
  auth.useDeviceLanguage()
} catch {
  /* not supported in very old browsers — safe to ignore */
}

export const googleProvider = new GoogleAuthProvider()

// Why `prompt: select_account`?
// Without it Google can silently reuse a cached account, which looks like
// "I clicked sign in and nothing happened". Forcing the chooser makes every
// attempt explicit and visible.
googleProvider.setCustomParameters({ prompt: 'select_account' })

export {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  setPersistence,
  browserLocalPersistence,
  serverTimestamp,
  // Firestore
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
}
