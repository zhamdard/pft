/**
 * React Native twin of `firebase.js`.
 *
 * Metro resolves `./firebase` to `firebase.native.js` when bundling for iOS
 * and Android, and Vite never sees this file — so every service and hook keeps
 * importing `../firebase/firebase` unchanged and both apps share one code path.
 *
 * The difference is auth persistence. The web file calls
 * `setPersistence(auth, browserLocalPersistence)`, which reads `window` and
 * `localStorage`; neither exists in a native app, so it would throw on launch
 * and blank the screen. Here we build the auth instance once with
 * AsyncStorage, which survives app restarts the way users expect.
 */
import { initializeApp } from 'firebase/app'
import {
  getAuth,
  initializeAuth,
  getReactNativePersistence,
  GoogleAuthProvider,
  signInWithCredential,
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
import AsyncStorage from '@react-native-async-storage/async-storage'
import firebaseConfig from './config'

export const app = initializeApp(firebaseConfig)

/**
 * `initializeAuth` throws `auth/already-initialized` on a fast refresh. Fall
 * back to the instance Firebase already made rather than crashing — this is
 * exactly the class of bug that surfaces as a blank screen.
 */
function createAuth() {
  try {
    return initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) })
  } catch (err) {
    if (err?.code === 'auth/already-initialized') return getAuth(app)
    throw err
  }
}

export const auth = createAuth()
export const db = getFirestore(app)

/**
 * Kept for API parity with the web module so shared callers don't branch per
 * platform. AsyncStorage was applied when `auth` was created, so there is
 * nothing left to switch to.
 */
export function ensureAuthPersistence() {
  return Promise.resolve()
}

try {
  auth.useDeviceLanguage()
} catch {
  /* no navigator.language in native — Firebase falls back to the device locale */
}

export const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({ prompt: 'select_account' })

/**
 * There is no browser to open a popup inside a native app. Rather than let a
 * caller fail with an inscrutable Firebase message, fail with one that says
 * what to do — mobile sign-in goes through `signInWithCredential`.
 */
export function signInWithPopup() {
  const err = new Error(
    'Google sign-in on iOS/Android uses signInWithCredential(); popups do not exist in a native app.',
  )
  err.code = 'auth/operation-not-supported-in-this-environment'
  return Promise.reject(err)
}

export {
  // Auth
  signInWithCredential,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
  // Firestore
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
}

