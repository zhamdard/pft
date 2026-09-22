/**
 * Translate a Firebase auth error into clear, actionable guidance.
 * Returns { title, detail, steps } so the UI can show exactly how to fix it.
 */
export function describeAuthError(err) {
  const code = err?.code || ''

  const map = {
    'auth/popup-closed-by-user': {
      title: 'Sign-in was cancelled',
      detail: 'No changes were made. Try again when you’re ready.',
      steps: [],
    },
    'auth/cancelled-popup-request': {
      title: 'Another sign-in was already in progress',
      detail: 'Wait a moment, then try signing in again.',
      steps: [],
    },
    'auth/popup-blocked': {
      title: 'Your browser blocked the sign-in popup',
      detail: 'Pop-ups are being blocked for this site.',
      steps: [
        'Allow pop-ups for this site, then try again.',
        'Or press “Trouble signing in? Open Google in this tab instead”.',
      ],
    },
    'auth/unauthorized-domain': {
      title: 'This address isn’t allowed for Google sign-in',
      detail: 'Google only returns sign-ins to domains you’ve approved.',
      steps: [
        'For testing, open the app at http://localhost:5173 (localhost is pre-approved).',
        'For a live site: Firebase console → Authentication → Settings → '
          + 'Authorized domains → add your domain.',
      ],
    },
    'auth/operation-not-allowed': {
      title: 'Google sign-in isn’t enabled yet',
      detail: 'The Firebase project is connected, but the Google sign-in provider is switched off.',
      steps: [
        'Open the Firebase console → your project → Build → Authentication.',
        'Open the “Sign-in method” tab.',
        'Click “Google” → enable it → click Save.',
        'Then refresh this page and try again.',
      ],
    },
    'auth/invalid-api-key': {
      title: 'The Firebase API key looks wrong',
      detail: 'The key in src/firebase/config.js doesn’t match your project.',
      steps: [
        'Open Firebase → Project settings → Your apps → copy the web app config.',
        'Paste the exact values into src/firebase/config.js, then restart npm run dev.',
      ],
    },
    'auth/network-request-failed': {
      title: 'Couldn’t reach Google',
      detail: 'A network problem stopped the sign-in.',
      steps: ['Check your internet connection and try again.'],
    },
    'auth/web-storage-unsupported': {
      title: 'Your browser blocks the storage Google needs',
      detail:
        'Google sign-in requires cookies/local storage for this site. Private browsing and strict '
        + 'tracking-protection modes disable it, which makes the window close with no result.',
      steps: [
        'Use a normal (non-private) window, or allow cookies for this site.',
        'Turn off strict tracking protection for localhost, then try again.',
      ],
    },
    'auth/operation-not-supported-in-this-environment': {
      title: 'This browser can’t complete Google sign-in',
      detail:
        'The environment blocks the popup/redirect handshake Google needs — common in embedded '
        + 'webviews and some in-app browsers.',
      steps: [
        'Open the app directly in Chrome, Edge, Firefox or Safari.',
        'If you tapped a link inside another app, use “Open in browser” instead.',
      ],
    },
    'auth/internal-error': {
      title: 'Sign-in was interrupted',
      detail:
        'Google completed the prompt but the result never reached this page. This is almost always '
        + 'an extension, a privacy setting or a stale cached session.',
      steps: [
        'Reload this page, then try again.',
        'Disable ad-blockers/privacy extensions for this site and retry.',
        'Still failing? Try a private window or a different browser.',
      ],
    },
    'auth/too-many-requests': {
      title: 'Too many sign-in attempts',
      detail: 'Google has temporarily slowed things down.',
      steps: ['Wait about a minute and try again.'],
    },
  }

  if (map[code]) return map[code]

  if (code.startsWith('auth/')) {
    return {
      title: 'Sign-in couldn’t be completed',
      detail: 'Firebase returned the following error:',
      steps: [`${code} — ${err?.message || 'unknown reason'}`],
    }
  }

  return {
    title: 'Something went wrong',
    detail: err?.message || 'An unexpected error occurred during sign-in.',
    steps: ['Check your connection, then try again.'],
  }
}
