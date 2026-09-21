import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  auth,
  db,
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  googleProvider,
  serverTimestamp,
} from '../firebase/firebase'

const UserContext = createContext(null)

const DEFAULT_SETTINGS = { currency: 'USD' }

export function UserProvider({ children }) {
  const [user, setUser] = useState(null)
  const [settings, setSettings] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [settingsLoading, setSettingsLoading] = useState(true)

  // 1. Track the signed-in Google user across refreshes.
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u || null)
      setAuthLoading(false)
    })
    return unsub
  }, [])

  // 2. Load (and lazily initialize) the user's preferences from Firestore.
  useEffect(() => {
    if (!user) {
      setSettings(null)
      setSettingsLoading(false)
      return undefined
    }
    setSettingsLoading(true)
    const ref = doc(db, 'users', user.uid, 'settings', 'prefs')
    const unsub = onSnapshot(
      ref,
      async (snap) => {
        if (snap.exists()) {
          setSettings(snap.data())
        } else {
          const defaults = { ...DEFAULT_SETTINGS, createdAt: serverTimestamp() }
          await setDoc(ref, defaults)
          setSettings(defaults)
        }
        setSettingsLoading(false)
      },
      () => setSettingsLoading(false),
    )
    return unsub
  }, [user])

  const signIn = () => signInWithPopup(auth, googleProvider)
  const logOut = () => signOut(auth)
  const updateSettings = (patch) =>
    user ? updateDoc(doc(db, 'users', user.uid, 'settings', 'prefs'), patch) : Promise.resolve()

  const value = useMemo(
    () => ({
      user,
      authLoading,
      settingsLoading,
      ready: !authLoading && !settingsLoading,
      settings,
      currency: settings?.currency || 'USD',
      signIn,
      logOut,
      updateSettings,
    }),
    [user, authLoading, settingsLoading, settings, signIn, logOut, updateSettings],
  )

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

export function useUser() {
  return useContext(UserContext)
}
