/**
 * Auth + preferences for the native app.
 *
 * Deliberately NOT shared with the web `UserContext`: that one drives
 * `signInWithPopup`/`signInWithRedirect`, neither of which exists in a native
 * app. Google here is an AuthSession flow that returns an ID token, which we
 * hand to Firebase with `signInWithCredential`. Everything else — the settings
 * document, its defaults, and the error reporting contract — matches the web
 * app exactly, so one account reads and writes the same data on both.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { Platform } from 'react-native'
import { GoogleAuthProvider } from 'firebase/auth'
import * as WebBrowser from 'expo-web-browser'
import * as Google from 'expo-auth-session/providers/google'
import Constants from 'expo-constants'
import {
  auth,
  db,
  doc,
  setDoc,
  onSnapshot,
  onAuthStateChanged,
  signInWithCredential,
  signOut,
  serverTimestamp,
} from '../../src/firebase/firebase'
import { useDataHealth } from './DataHealthContext'

// Completes the auth browser round-trip when the app is reopened via callback.
WebBrowser.maybeCompleteAuthSession()

const UserContext = createContext(null)

/** Same defaults as the web app — first run on either platform writes these. */
const DEFAULT_SETTINGS = { currency: 'USD' }

const googleIds = Constants.expoConfig?.extra?.google || {}

/**
 * Client IDs are per-platform in Google's console, so an empty one must fail
 * loudly with instructions rather than half-start a flow that silently
 * returns nothing.
 */
function missingIdError() {
  const key = Platform.OS === 'ios' ? 'iosClientId' : 'androidClientId'
  const err = new Error(
    `Google sign-in is not configured: set expo.extra.google.${key} in mobile/app.json. ` +
      'Create an OAuth client ID of type "iOS"/"Android" in the Google Cloud console ' +
      '(bundle id app.pft.tracker), then rebuild.',
  )
  err.code = 'auth/config-missing'
  return err
}

export function UserProvider({ children }) {
  const [user, setUser] = useState(null)
  const [settings, setSettings] = useState(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [settingsLoading, setSettingsLoading] = useState(true)
  const [authError, setAuthError] = useState(null)
  const [signingIn, setSigningIn] = useState(false)
  const { reportError, retryToken } = useDataHealth()

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: googleIds.webClientId,
    iosClientId: googleIds.iosClientId,
    androidClientId: googleIds.androidClientId,
  })

  // 1. Track the signed-in user across app restarts (AsyncStorage, so it
  //    survives a cold launch — the behaviour users expect from a real app).
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u || null)
      setAuthChecked(true)
    })
    return unsub
  }, [])

  // 2. Turn the Google round-trip into a Firebase session.
  useEffect(() => {
    if (response?.type !== 'success') return
    const idToken = response.params?.id_token
    if (!idToken) return
    signInWithCredential(auth, GoogleAuthProvider.credential(idToken)).catch((err) => {
      console.error('[PFT] credential sign-in failed:', err?.code || err)
      setAuthError(err)
    })
  }, [response])

  // 3. Preferences, from the SAME document the web app uses.
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
        } catch (err) {
          console.error('[PFT] could not create default settings:', err?.code || err)
          reportError('settings', err)
          // Fall back to in-memory defaults so the app stays usable.
          setSettings(DEFAULT_SETTINGS)
        }
        reportError('settings', null)
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

  const signInWithGoogle = useCallback(async () => {
    setAuthError(null)
    const wanted = Platform.OS === 'ios' ? googleIds.iosClientId : googleIds.androidClientId
    if (!wanted) {
      setAuthError(missingIdError())
      return
    }
    if (!request) {
      setAuthError(new Error('Google sign-in request could not be prepared.'))
      return
    }
    setSigningIn(true)
    try {
      const result = await promptAsync()
      if (result?.type !== 'success' && result?.type !== 'dismiss') {
        setAuthError(new Error('Google sign-in was cancelled.'))
      }
    } catch (err) {
      console.error('[PFT] Google prompt failed:', err?.code || err)
      setAuthError(err)
    } finally {
      setSigningIn(false)
    }
  }, [request, promptAsync])

  const logOut = useCallback(() => signOut(auth).catch(() => {}), [])

  const updateSettings = useCallback(
    (patch) => {
      if (!user) return Promise.resolve()
      const ref = doc(db, 'users', user.uid, 'settings', 'prefs')
      return setDoc(ref, patch, { merge: true }).then(() => {
        setSettings((prev) => ({ ...(prev || DEFAULT_SETTINGS), ...patch }))
      })
    },
    [user],
  )

  const value = useMemo(
    () => ({
      user,
      settings,
      currency: settings?.currency || 'USD',
      loading: !authChecked,
      settingsLoading,
      authError,
      signingIn,
      signInWithGoogle,
      logOut,
      updateSettings,
      clearAuthError: () => setAuthError(null),
      // Present so shared components never have to branch on platform.
      signInPopup: signInWithGoogle,
      hiddenAmounts: Boolean(settings?.hideAmounts),
      reportError,
    }),
    [
      user,
      settings,
      authChecked,
      settingsLoading,
      authError,
      signingIn,
      signInWithGoogle,
      logOut,
      updateSettings,
      reportError,
    ],
  )

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

export function useUser() {
  const ctx = useContext(UserContext)
  if (!ctx) throw new Error('useUser must be used inside <UserProvider>')
  return ctx
}
