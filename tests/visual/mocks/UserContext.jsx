/**
 * Audit mock — substituted for src/context/UserContext.jsx by tests/visual.
 *
 * Self-contained on purpose: it replaces a file in src/, so any relative import
 * written here would resolve as if it lived there. Keeping it dependency-free
 * avoids that whole class of confusion. It is never part of a production bundle.
 */
import { createContext, useContext, useMemo, useState } from 'react'

const AuditUserContext = createContext(null)

/** A long-ish name and email, so truncation behaviour is actually exercised. */
export const AUDIT_USER = {
  uid: 'audit-user',
  displayName: 'Zahid Hamdard',
  email: 'zahid.hamdard2006@gmail.com',
}

export function UserProvider({ children }) {
  const [settings, setSettings] = useState({ currency: 'USD' })

  const value = useMemo(
    () => ({
      user: AUDIT_USER,
      authLoading: false,
      settingsLoading: false,
      ready: true,
      settings,
      currency: settings.currency,
      authError: null,
      clearAuthError() {},
      signInPopup: async () => {},
      signInRedirect: async () => {},
      signedInWith: 'popup',
      logOut() {},
      updateSettings: async (patch) => setSettings((s) => ({ ...s, ...patch })),
    }),
    [settings],
  )

  return <AuditUserContext.Provider value={value}>{children}</AuditUserContext.Provider>
}

export function useUser() {
  return useContext(AuditUserContext)
}