/**
 * Turn a Firestore error into plain-English guidance.
 * Returns { title, detail, steps[] } so the UI can tell the user exactly
 * which knob to turn — never just "something went wrong".
 */

const CREATE_DATABASE = [
  'Open the Firebase console → your project → Build → Firestore Database.',
  'Click “Create database” → choose Production mode → pick a region → Enable.',
  'Come back to PFT and press “Try again”.',
]

const PUBLISH_RULES = [
  'Open the Firebase console → Build → Firestore Database → the “Rules” tab.',
  'Paste the contents of the firestore.rules file from this project.',
  'Click “Publish”, then press “Try again”.',
]

export function describeFirestoreError(err) {
  const code = err?.code || ''
  const message = err?.message || ''

  const map = {
    'permission-denied': {
      title: 'Your database rules are blocking access',
      detail:
        'You are signed in, but Firestore won’t let this app read or write your data yet. '
        + 'This normally means the security rules haven’t been published to your project.',
      steps: PUBLISH_RULES,
    },
    unauthenticated: {
      title: 'Your sign-in session expired',
      detail: 'Firestore no longer accepts the current session.',
      steps: ['Sign out from Settings, then sign in with Google again.'],
    },
    'not-found': {
      title: 'Your Firestore database doesn’t exist yet',
      detail: 'The app is connected to your project, but no database has been created in it.',
      steps: CREATE_DATABASE,
    },
    'failed-precondition': {
      title: 'Firestore isn’t quite ready',
      detail:
        message.includes('index')
          ? 'A database index is missing for this query.'
          : 'The database exists, but it hasn’t finished being set up for reads.',
      steps: CREATE_DATABASE,
    },
    unavailable: {
      title: 'Couldn’t reach your database',
      detail:
        'Firestore didn’t answer. This is usually a network drop, or the Cloud Firestore API '
        + 'is still disabled on the project.',
      steps: [
        'Check your internet connection, then press “Try again”.',
        'Still failing? Firebase console → Build → Firestore Database and confirm it is enabled.',
      ],
    },
    'resource-exhausted': {
      title: 'Daily free quota reached',
      detail: 'Firestore’s free daily read/write allowance has been used up for today.',
      steps: ['Wait until the quota resets (midnight Pacific time) and try again.'],
    },
    'deadline-exceeded': {
      title: 'The database took too long to answer',
      detail: 'The request timed out before Firestore replied.',
      steps: ['Press “Try again” — this is usually temporary.'],
    },
    'invalid-argument': {
      title: 'The data request was rejected',
      detail: message || 'Firestore refused the query.',
      steps: ['Reload the page. If it persists, your data may contain an unexpected field type.'],
    },
  }

  if (map[code]) return map[code]

  if (code) {
    return {
      title: 'Couldn’t load your data',
      detail: 'Firestore returned the following error:',
      steps: [`${code} — ${message || 'no further detail'}`],
    }
  }

  return {
    title: 'Couldn’t load your data',
    detail: message || 'An unexpected error occurred while reading from Firestore.',
    steps: ['Reload the page, then press “Try again”.'],
  }
}

/** One-line summary used by the diagnostics copy button. */
export function summariseError(err) {
  if (!err) return 'no error'
  return [err.code, err.message].filter(Boolean).join(' — ')
}
