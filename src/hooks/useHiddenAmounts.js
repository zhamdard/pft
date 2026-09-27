import { useCallback, useEffect, useState } from 'react'
import { useUser } from '../context/UserContext'

/**
 * The "hide my balance" privacy toggle every banking app has — the thing you
 * tap when someone is looking over your shoulder.
 *
 * The preference is stored in the user's settings document rather than in the
 * browser, so it follows the same Google account onto every device. Local state
 * keeps the tap feeling instant while the write is in flight.
 */
export function useHiddenAmounts() {
  const { settings, updateSettings } = useUser()
  const stored = settings?.hideAmounts === true
  const [hidden, setHidden] = useState(stored)

  // Adopt the server value once settings arrive (or change on another device).
  useEffect(() => {
    setHidden(stored)
  }, [stored])

  const toggle = useCallback(() => {
    const next = !hidden
    setHidden(next)
    Promise.resolve(updateSettings({ hideAmounts: next })).catch((err) => {
      // A failed preference write must never look like a failed page.
      console.error('[PFT] could not save the hide-amounts preference:', err?.code || err)
    })
  }, [hidden, updateSettings])

  return { hidden, toggle }
}
