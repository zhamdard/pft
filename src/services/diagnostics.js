import {
  db,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from '../firebase/firebase'
import firebaseConfig from '../firebase/config'

/**
 * In-app diagnostics. Everything here is read-only or self-cleaning so the
 * user can prove a problem themselves without opening dev tools:
 *   • environmentInfo()   — what this build is pointed at
 *   • checkAuthRelay()    — can we actually reach Google's sign-in relay?
 *   • pingFirestore(uid)  — write → read → delete, proving rules + database
 */

function storageAvailable() {
  try {
    const key = '__pft_probe__'
    window.localStorage.setItem(key, '1')
    window.localStorage.removeItem(key)
    return true
  } catch {
    return false
  }
}

export function environmentInfo() {
  const apiKey = firebaseConfig.apiKey || ''
  return {
    origin: typeof window === 'undefined' ? 'unknown' : window.location.origin,
    projectId: firebaseConfig.projectId || '(not set)',
    authDomain: firebaseConfig.authDomain || '(not set)',
    configured: Boolean(apiKey) && !apiKey.startsWith('PASTE_'),
    storage: typeof window === 'undefined' ? false : storageAvailable(),
    online: typeof navigator === 'undefined' ? true : navigator.onLine,
  }
}

/**
 * Popup and redirect sign-in both hand the result back through
 * `<authDomain>/__/auth/iframe`. If that host is unreachable, sign-in can
 * finish on Google's side and still never reach the app — the classic
 * "the window closes and nothing happens" symptom.
 */
export async function checkAuthRelay() {
  const domain = firebaseConfig.authDomain
  if (!domain) return { ok: false, detail: 'authDomain is missing from src/firebase/config.js' }
  try {
    // no-cors: we can't read the response body cross-origin, but a network
    // failure still rejects — which is exactly what we want to detect.
    await fetch(`https://${domain}/__/auth/iframe`, { mode: 'no-cors', cache: 'no-store' })
    return { ok: true, detail: domain }
  } catch (err) {
    return { ok: false, detail: err?.message || `Could not reach ${domain}` }
  }
}

/** Write, read back, then delete a tiny document under the user's own path. */
export async function pingFirestore(uid) {
  if (!uid) {
    return {
      ok: false,
      error: { code: 'auth/no-user', message: 'Not signed in, so Firestore cannot be tested.' },
    }
  }

  const ref = doc(db, 'users', uid, '_health', 'ping')

  try {
    await setDoc(ref, {
      at: serverTimestamp(),
      ua: typeof navigator === 'undefined' ? '' : navigator.userAgent.slice(0, 140),
    })

    const snap = await getDoc(ref)
    if (!snap.exists()) {
      return {
        ok: false,
        error: {
          code: 'data/read-back-failed',
          message: 'The document was written but could not be read back. Rules may allow writes only.',
        },
      }
    }

    await deleteDoc(ref)
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err }
  }
}

/** Clipboard copy with a fallback for browsers that block the async API. */
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const area = document.createElement('textarea')
      area.value = text
      area.setAttribute('readonly', '')
      area.style.position = 'fixed'
      area.style.opacity = '0'
      document.body.appendChild(area)
      area.select()
      const ok = document.execCommand('copy')
      area.remove()
      return ok
    } catch {
      return false
    }
  }
}

/** Plain-text report the user can paste into a support message. */
export function buildDiagnosticsReport({ user, signedInWith, lastError, extra = {} } = {}) {
  const env = environmentInfo()
  const lines = [
    'PFT diagnostics',
    `generated: ${new Date().toISOString()}`,
    `origin: ${env.origin}`,
    `projectId: ${env.projectId}`,
    `authDomain: ${env.authDomain}`,
    `config looks complete: ${env.configured ? 'yes' : 'no'}`,
    `browser storage usable: ${env.storage ? 'yes' : 'no (private mode?)'}`,
    `signed in: ${user ? 'yes' : 'no'}`,
    `uid: ${user?.uid || '—'}`,
    `sign-in method used: ${signedInWith || '—'}`,
    `last auth error: ${lastError?.code || 'none'}`,
  ]
  for (const [key, value] of Object.entries(extra)) lines.push(`${key}: ${value}`)
  return lines.join('\n')
}
