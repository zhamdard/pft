import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  auth,
  db,
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  googleProvider,
  ensureAuthPersistence,
  serverTimestamp,
} from '../firebase/firebase'
import { useDataHealth } from './DataHealthContext'

const UserContext = createContext(null)

const DEFAULT_SETTINGS = { currency: 'USD' }

export function UserProvider({ children }) {
  const [user, setUser] = useState(null)
  const [settings, setSettings] = useState(null)
  // Readiness is derived from two signals so a returning redirect sign-in is
  // never mistaken for "signed out" — that mistake is what makes the app look
  // like it ignores a successful Google sign-in.
  const [authChecked, setAuthChecked] = useState(false)
  const [redirectChecked, setRedirectChecked] = useState(false)
  const [settingsLoading, setSettingsLoading] = useState(true)
  const [authError, setAuthError] = useState(null)
  const [signedInWith, setSignedInWith] = useState(null)
  const { reportError, retryToken } = useDataHealth()

  // 1. Track the signed-in Google user across refreshes, and finish off a
  //    redirect sign-in — the flow that keeps working when a browser blocks
  //    the cross-origin popup handshake.
  useEffect(() => {
    let active = true

    getRedirectResult(auth)
      .then((cred) => {
        if (!active) return
        if (cred?.user) {
          setUser(cred.user)
          setSignedInWith('redirect')
        }
      })
      .catch((err) => {
        if (!active) return
        // This code only means the environment can't do redirects at all —
        // not a failure worth showing the user.
        if (err?.code === 'auth/operation-not-supported-in-this-environment') return
        setAuthError(err)
        setSignedInWith('redirect')
      })
      .finally(() => {
        if (!active) return
        setRedirectChecked(true)
        // Safe to assert persistence now that no redirect result is pending.
        ensureAuthPersistence()
      })

    const unsub = onAuthStateChanged(auth, (u) => {
      if (!active) return
      setUser(u || null)
      setAuthChecked(true)
    })

    return () => {
      active = false
      unsub()
    }
  }, [])

  // 2. Load (and lazily initialize) the user's preferences from Firestore.
  //    Every failure path ends by clearing `settingsLoading` — an unhandled
  //    rejection here used to leave the app spinning forever.
  useEffect(() => {
    if (!user) {
      setSettings(null)
      setSettingsLoading(false)
      reportError('settings', null)
      return undefined
    }

    setSettingsLoading(true)
    reportError('settings', null)

    const ref = doc(db, 'users', user.uid, 'settings', 'prefs')
    const unsub = onSnapshot(
      ref,
      async (snap) => {
        if (snap.exists()) {
          setSettings(snap.data())
          reportError('settings', null)
          setSettingsLoading(false)
          return
        }

        // First run for this account: create the defaults document.
        const defaults = { ...DEFAULT_SETTINGS, createdAt: serverTimestamp() }
        try {
          await setDoc(ref, defaults)
          setSettings(defaults)
          reportError('settings', null)
        } catch (err) {
          console.error('[PFT] could not create default settings:', err?.code || err)
          reportError('settings', err)
          // Fall back to in-memory defaults so the app stays usable.
          setSettings(DEFAULT_SETTINGS)
        }
        setSettingsLoading(false)
      },
      (err) => {
        console.error('[PFT] settings listener failed:', err?.code || err)
        reportError('settings', err)
        setSettingsLoading(false)
      },
    )
    return unsub
  }, [user, reportError, retryToken])

  // Derived: the app is only "auth ready" once the redirect check AND the
  // first auth-state emission have both landed.
  const authLoading = !(authChecked && redirectChecked)

  const signInPopup = useCallback(() => {
    setAuthError(null)
    setSignedInWith('popup')
    // Record the failure in context state *as well as* rejecting, so a caller
    // can never leave the user staring at a page that "did nothing".
    return signInWithPopup(auth, googleProvider).catch((err) => {
      setAuthError(err)
      throw err
    })
  }, [])

  const signInRedirect = useCallback(() => {
    setAuthError(null)
    setSignedInWith('redirect')
    return signInWithRedirect(auth, googleProvider).catch((err) => {
      setAuthError(err)
      throw err
    })
  }, [])

  const logOut = useCallback(() => signOut(auth), [])
  const clearAuthError = useCallback(() => setAuthError(null), [])

  const updateSettings = useCallback(
    (patch) =>
      user ? updateDoc(doc(db, 'users', user.uid, 'settings', 'prefs'), patch) : Promise.resolve(),
    [user],
  )

  const value = useMemo(
    () => ({
      user,
      authLoading,
      settingsLoading,
      ready: !authLoading && !settingsLoading,
      settings,
      currency: settings?.currency || 'USD',
      authError,
      clearAuthError,
      signInPopup,
      signInRedirect,
      signedInWith,
      logOut,
      updateSettings,
    }),
    [
      user,
      authLoading,
      settingsLoading,
      settings,
      authError,
      clearAuthError,
      signInPopup,
      signInRedirect,
      signedInWith,
      logOut,
      updateSettings,
    ],
  )

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

export function useUser() {
  return useContext(UserContext)
}
